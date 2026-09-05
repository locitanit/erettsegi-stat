"""A storage bejarasa -> Exam rekordok (exams.json).

Ketfele elrendezest tamogat (TERV 7.1):
  A) rmg_tools:  <szint>/<temakor>/<idoszak>/{feladatlap,javitasi_utmutato}/...
  B) nyers OH:   _oh_raw/<idoszak>/<szint>/{*_fl.pdf,*_ut.pdf,forras/,megoldas/}
Ha egy idoszak mindkettoben megvan, az (A) az elsodleges, a (B) a tartalek.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .config import (
    EXCLUDE_FILE_PATTERNS,
    EXCLUDE_SOLUTION_PATTERNS,
    LEVELS,
    OH_RAW_DIR,
    STATE_FILE,
    TOPICS,
)
from .periods import Period, parse_period, strip_accents

# A vizsga sajat javitasi utmutatoja. Szandekosan NEM illeszkedik ra:
#   *infoism* (mas targy), *ert*/*ertekelolap* (pontozotabla), autorep/turiszt (mas targy).
UTMUTATO_RE = re.compile(
    r"^(?P<lvl>[ke])_(?P<subj>digkult|info|inf)"
    r"(?P<lang>angol|ang|nemet|nem|francia|fra|spanyol|spa|roman|szerb|szlovak|szlo)?"
    r"(?P<ver>v3\d)?"
    r"_(?P<yy>\d{2})(?P<mon>maj|okt|feb)_ut\.pdf$"
)

# Nyers OH-elrendezes: k_digkult_26okt_fl.pdf / _ut.pdf
OH_RAW_RE = re.compile(
    r"^(?P<lvl>[ke])_(?P<subj>digkult|info|inf)"
    r"(?P<lang>angol|ang|nemet|nem|francia|fra|spanyol|spa|roman|szerb|szlovak|szlo)?"
    r"_(?P<yy>\d{2})(?P<mon>maj|okt|feb)_(?P<kind>fl|ut)\.pdf$"
)

SOLUTION_KINDS = {
    "megoldas_xlsx": {".xlsx", ".xls", ".ods"},
    "megoldas_sql": {".sql"},
    "megoldas_access": {".mdb", ".accdb"},
    "megoldas_program": {".cs", ".java", ".py", ".pas", ".cpp", ".c", ".vb", ".bas"},
    "megoldas_web": {".html", ".htm", ".css"},
    "megoldas_doc": {".docx", ".doc", ".rtf", ".odt"},
    "megoldas_prez": {".pptx", ".ppt", ".odp"},
    "megoldas_kep": {".png", ".jpg", ".jpeg", ".svg", ".gif", ".bmp"},
}


def is_excluded(name: str) -> bool:
    """Mas targy vagy pontozotabla -> sehol nem hasznaljuk."""
    low = strip_accents(name).lower()
    return any(p in low for p in EXCLUDE_FILE_PATTERNS)


def is_scoring_sheet(name: str) -> bool:
    """Ertekelo/javito tabla - nem mintamegoldas."""
    low = strip_accents(name).lower()
    return any(p in low for p in EXCLUDE_SOLUTION_PATTERNS)


@dataclass
class TopicFiles:
    topic: str
    dir: Path
    feladatlap_pdfs: list[Path] = field(default_factory=list)
    forras_files: list[Path] = field(default_factory=list)
    utmutato_pdfs: list[Path] = field(default_factory=list)
    solution_files: list[Path] = field(default_factory=list)


@dataclass
class Exam:
    period: Period
    level: str
    layout: str                       # "rmg_tools" | "oh_raw"
    root: Path
    topics: dict[str, TopicFiles] = field(default_factory=dict)
    topic_order: list[str] = field(default_factory=list)

    @property
    def id(self) -> str:
        return self.period.exam_id(self.level)

    @property
    def exam_topics(self) -> list[str]:
        """A vizsgan TENYLEG szereplo temakorok, a feladatok sorrendjeben.

        A letolto minden temakor-mappaba bemasolja a teljes utmutato-PDF-et, ezert
        egy mappa megleteboI meg nem kovetkezik, hogy az a temakor szerepelt a vizsgan.
        A dontesi jel a feladatlap-PDF: az temakoronkent kulon fajl.
        """
        present = [t for t, tf in self.topics.items() if tf.feladatlap_pdfs]
        ordered = [t for t in self.topic_order if t in present]
        return ordered + [t for t in present if t not in ordered]


def _classify_into(tf: TopicFiles, sub: str, path: Path) -> None:
    """Egy fajl besorolasa a feladatlap/utmutato/megoldas kategoriaba."""
    name = path.name
    if is_excluded(name):
        return
    ext = path.suffix.lower()
    if sub == "feladatlap":
        if ext == ".pdf":
            tf.feladatlap_pdfs.append(path)
        else:
            tf.forras_files.append(path)
        return
    # javitasi_utmutato
    if ext == ".pdf" and UTMUTATO_RE.match(name.lower()):
        tf.utmutato_pdfs.append(path)
        return
    if is_scoring_sheet(name):
        return
    if ext == ".pdf":
        return  # egyeb PDF az utmutato mappaban (ertekelolap stb.) - kihagyjuk
    tf.solution_files.append(path)


def _scan_topic_dir(topic: str, tdir: Path) -> TopicFiles:
    tf = TopicFiles(topic=topic, dir=tdir)
    for sub in ("feladatlap", "javitasi_utmutato"):
        sdir = tdir / sub
        if not sdir.is_dir():
            continue
        for path in sorted(sdir.rglob("*")):
            if path.is_file():
                _classify_into(tf, sub, path)
    return tf


def load_topic_order(storage: Path) -> dict[str, list[str]]:
    """A letolto allapotfajljabol: melyik vizsgan milyen sorrendben jonnek a temakorok."""
    state = storage / STATE_FILE
    if not state.exists():
        return {}
    try:
        data = json.loads(state.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data.get("topic_order", {}) or {}


def discover_rmg_tools(storage: Path, topic_order: dict) -> dict[str, Exam]:
    exams: dict[str, Exam] = {}
    for level in LEVELS:
        ldir = storage / level
        if not ldir.is_dir():
            continue
        for topic_dir in sorted(p for p in ldir.iterdir() if p.is_dir()):
            topic = topic_dir.name
            if topic not in TOPICS:
                continue
            for pdir in sorted(p for p in topic_dir.iterdir() if p.is_dir()):
                period = parse_period(pdir.name)
                if period is None:
                    continue
                key = period.exam_id(level)
                exam = exams.get(key)
                if exam is None:
                    exam = Exam(period=period, level=level, layout="rmg_tools", root=ldir)
                    exam.topic_order = topic_order.get(f"{level}/{pdir.name}", [])
                    exams[key] = exam
                exam.topics[topic] = _scan_topic_dir(topic, pdir)
    return exams


def discover_oh_raw(storage: Path) -> dict[str, Exam]:
    """A nyers OH-elrendezes (TERV 7.1). Ha nincs _oh_raw mappa, ures."""
    exams: dict[str, Exam] = {}
    root = storage / OH_RAW_DIR
    if not root.is_dir():
        return exams
    for pdir in sorted(p for p in root.iterdir() if p.is_dir()):
        period = parse_period(pdir.name)
        if period is None:
            continue
        for level in LEVELS:
            ldir = pdir / level
            if not ldir.is_dir():
                continue
            exam = Exam(period=period, level=level, layout="oh_raw", root=ldir)
            # A nyers elrendezesben nincs temakori bontas: egy gyujto "rekord".
            tf = TopicFiles(topic="_teljes", dir=ldir)
            for path in sorted(ldir.rglob("*")):
                if not path.is_file() or is_excluded(path.name):
                    continue
                m = OH_RAW_RE.match(path.name.lower())
                if m:
                    (tf.feladatlap_pdfs if m.group("kind") == "fl" else tf.utmutato_pdfs).append(path)
                    continue
                rel = strip_accents(str(path.relative_to(ldir))).lower()
                if rel.startswith("forras"):
                    tf.forras_files.append(path)
                elif rel.startswith("megoldas") and not is_scoring_sheet(path.name):
                    tf.solution_files.append(path)
            exam.topics["_teljes"] = tf
            exams[exam.id] = exam
    return exams


def discover(storage: Path) -> list[Exam]:
    """Mindket elrendezes; utkozesnel az rmg_tools nyer."""
    storage = Path(storage)
    topic_order = load_topic_order(storage)
    exams = discover_rmg_tools(storage, topic_order)
    for key, exam in discover_oh_raw(storage).items():
        if key not in exams:
            exams[key] = exam
    return sorted(exams.values(), key=lambda e: (e.period.sort_key, e.level))
