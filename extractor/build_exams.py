"""Exam rekordokbol data/exams.json (TERV 4.1)."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from . import __version__
from .config import DATA_DIR
from .discover import SOLUTION_KINDS, UTMUTATO_RE, Exam
from .pdf_text import extract, page_count_only
from .overrides import load as load_override
from .periods import DIGKULT_FROM_YEAR

# Magyar temakor-cimkek (a figyelmeztetesekben es az exams.json-ban is ezek jelennek meg).
TOPIC_LABELS = {
    "szoveg": "Szövegszerkesztés",
    "tablazat": "Táblázatkezelés",
    "adatbazis": "Adatbázis-kezelés",
    "programozas": "Programozás",
    "weblap": "Weblap",
    "prezentacio": "Prezentáció",
    "prezentacio_grafika": "Prezentáció és grafika",
}

LANG_GROUP = 3  # a UTMUTATO_RE 'lang' csoportja nevvel is elerheto


def pick_utmutato(exam: Exam) -> tuple[Path | None, list[str]]:
    """A vizsga sajat javitasi utmutatoja + figyelmeztetesek.

    Idegen nyelvu vizsganal a nyelvi valtozat az elsodleges; ha csak a magyar
    utmutato van meg, azt hasznaljuk, de jelezzuk.
    """
    warnings: list[str] = []
    # ut -> (targy-kod a fajlnevbol, van-e nyelvi utotag)
    candidates: dict[Path, tuple[str, bool]] = {}
    for tf in exam.topics.values():
        for p in tf.utmutato_pdfs:
            m = UTMUTATO_RE.match(p.name.lower())
            if m:
                candidates[p] = (m.group("subj"), bool(m.group("lang")))
    if not candidates:
        return None, ["nincs javítási útmutató PDF"]

    # 2022-2023-ban ugyanabban a mappaban ott van a digitalis kultura ES az
    # informatika utmutatoja is. A targy donti el, melyik a vizsgae.
    want_subj = "digkult" if exam.period.subject == "digitalis_kultura" else "inf"
    by_subject = {
        p: has_lang
        for p, (subj, has_lang) in candidates.items()
        if (subj == "digkult") == (want_subj == "digkult")
    }
    if by_subject:
        candidates = by_subject
    else:
        candidates = {p: has_lang for p, (_, has_lang) in candidates.items()}
        warnings.append("nincs a tárgyhoz illő útmutató, másik tárgyé lett használva")

    want_lang = exam.period.variant == "idegen"
    matching = [p for p, has_lang in candidates.items() if has_lang == want_lang]
    if matching:
        # a legnagyobb fajl a teljes utmutato (a tobbi ugyanaz mas temakor alatt)
        return max(matching, key=lambda p: p.stat().st_size), warnings
    chosen = max(candidates, key=lambda p: p.stat().st_size)
    if want_lang:
        warnings.append("idegen nyelvű vizsga, de csak magyar nyelvű útmutató van")
    else:
        warnings.append("csak idegen nyelvű útmutató található")
    return chosen, warnings


def build_exam_record(exam: Exam, storage: Path, with_text: bool = True) -> dict:
    override = load_override(exam.period, exam.level)
    order = exam.exam_topics

    feladatlap_pdfs: list[Path] = []
    forras: list[Path] = []
    solutions: list[Path] = []
    for tf in exam.topics.values():
        feladatlap_pdfs += tf.feladatlap_pdfs
        forras += tf.forras_files
        solutions += tf.solution_files

    utmutato, warnings = pick_utmutato(exam)

    has = {
        "feladatlap": bool(feladatlap_pdfs),
        "utmutato": utmutato is not None,
        "forras": bool(forras),
    }
    for kind, exts in SOLUTION_KINDS.items():
        has[kind] = any(p.suffix.lower() in exts for p in solutions)

    pages = {"feladatlap": 0, "utmutato": 0}
    text_ok = {"feladatlap": None, "utmutato": None}

    if with_text:
        fl_chars = 0
        for p in feladatlap_pdfs:
            r = extract(p)
            pages["feladatlap"] += r.pages
            fl_chars += len(r.text.strip())
        if feladatlap_pdfs:
            text_ok["feladatlap"] = fl_chars >= 200 * len(feladatlap_pdfs) // 2
        if utmutato is not None:
            r = extract(utmutato)
            pages["utmutato"] = r.pages
            text_ok["utmutato"] = not r.ocr_needed
    else:
        pages["feladatlap"] = sum(page_count_only(p) for p in feladatlap_pdfs)
        if utmutato is not None:
            pages["utmutato"] = page_count_only(utmutato)

    ocr_needed = bool(
        (text_ok["utmutato"] is False) or (text_ok["feladatlap"] is False)
    )
    if ocr_needed:
        warnings.append("a PDF-ből nem nyerhető ki szöveg (képként tárolt), OCR nincs")
    if not has["feladatlap"]:
        warnings.append("nincs feladatlap PDF")
    if not order:
        warnings.append("egyetlen témakörhöz sincs feladatlap PDF")

    src_ext = Counter(p.suffix.lower().lstrip(".") for p in forras if p.suffix)
    sol_ext = Counter(p.suffix.lower().lstrip(".") for p in solutions if p.suffix)

    return {
        "id": exam.id,
        "year": exam.period.year,
        "month": exam.period.month,
        "level": exam.level,
        "subject": exam.period.subject,
        "variant": exam.period.variant,
        "period_label": exam.period.label,
        "period_raw": exam.period.raw,
        "storage_dir": f"{exam.level}/{exam.period.raw}",
        "topics": order,
        "file_counts": {
            "feladatlap_pdf": len(feladatlap_pdfs),
            "forras": len(forras),
            "megoldas": len(solutions),
        },
        "source_types": dict(sorted(src_ext.items())),
        "solution_types": dict(sorted(sol_ext.items())),
        "has": has,
        "pages": pages,
        "text_ok": text_ok,
        "ocr_needed": ocr_needed,
        "total_points": None,      # 1. fazistol (utmutatobol)
        "layout": exam.layout,
        "notes": override.notes,
        "warnings": warnings,
    }


def build_exams_json(exams: list[Exam], storage: Path, with_text: bool = True) -> dict:
    records = [build_exam_record(e, storage, with_text=with_text) for e in exams]
    return {
        "generated_by": f"extractor {__version__}",
        "digkult_from_year": DIGKULT_FROM_YEAR,
        "topic_labels": TOPIC_LABELS,
        "exams": records,
    }


def write_exams_json(payload: dict, out: Path | None = None) -> Path:
    out = out or (DATA_DIR / "exams.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return out
