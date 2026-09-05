"""Programozas-elemzo: tipusalgoritmusok, be/kimenet, forrasadat merete, megoldas-nyelvek.

A tipusalgoritmus-felismeres **becsles**: az utmutato nem nevezi meg a tipusalgoritmust,
csak leirja, mit kell csinalni, ezert kulcsszo-mintakra tamaszkodunk
(`vocab/algorithm_keywords.yaml`). A feluleten ez jelolve van.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from ..vocab_store import load_keywords
from .common import count_keywords

# A feladatlapon a reszfeladatok szamozottak: "1. Olvassa be ...".
SUBTASK = re.compile(r"^[ \t]{0,8}(\d{1,2})\.[ \t]+[A-ZÁÉÍÓÖŐÚÜŰ]", re.MULTILINE)

# A mintamegoldasok nyelve a kiterjesztesbo"l.
LANGS = {
    ".cs": "C#",
    ".java": "Java",
    ".py": "Python",
    ".pas": "Pascal",
    ".cpp": "C++",
    ".c": "C",
    ".vb": "Visual Basic",
    ".bas": "BASIC",
}
# A .js szandekosan nincs itt: az a weblap-feladat megoldasa, nem programozasi nyelv.

# A forras txt mezo"elvalasztoi, elo"nyossegi sorrendben.
SEPARATORS = [("\t", "tabulátor"), (";", "pontosvessző"), (",", "vessző")]


@dataclass
class ProgStats:
    algorithms: Counter = field(default_factory=Counter)
    io: Counter = field(default_factory=Counter)
    subtask_count: int = 0
    solution_langs: list[str] = field(default_factory=list)
    input_rows: int | None = None
    input_cols: int | None = None
    input_separator: str | None = None

    def as_dict(self) -> dict:
        return {
            "algorithms": dict(self.algorithms.most_common()),
            "io": dict(self.io.most_common()),
            "subtask_count": self.subtask_count,
            "solution_langs": self.solution_langs,
            "input_rows": self.input_rows,
            "input_cols": self.input_cols,
            "input_separator": self.input_separator,
        }


def count_subtasks(feladatlap_text: str) -> int:
    """A reszfeladatok szama: a leghosszabb 1..N szamsor a feladatlapon."""
    found = {int(m.group(1)) for m in SUBTASK.finditer(feladatlap_text)}
    n = 0
    while n + 1 in found:
        n += 1
    return n


def solution_languages(paths: list[Path]) -> list[str]:
    langs = {LANGS[p.suffix.lower()] for p in paths if p.suffix.lower() in LANGS}
    return sorted(langs)


def _text_sources(paths: list[Path]) -> list[tuple[str, str]]:
    """(nev, tartalom) parok: a szoveges forrasfajlok, a zip-be csomagoltakkal egyutt."""
    out: list[tuple[str, str]] = []
    for path in paths:
        suffix = path.suffix.lower()
        if suffix in {".txt", ".csv"}:
            try:
                out.append((path.name, path.read_text(encoding="utf-8", errors="replace")))
            except OSError:
                pass
        elif suffix == ".zip":
            # A forrasokat az OH gyakran zip-ben adja ki.
            import zipfile

            try:
                with zipfile.ZipFile(path) as zf:
                    for info in zf.infolist():
                        if info.is_dir() or info.file_size > 8_000_000:
                            continue
                        if not info.filename.lower().endswith((".txt", ".csv")):
                            continue
                        with zf.open(info) as fh:
                            out.append((info.filename, fh.read().decode("utf-8", "replace")))
            except (zipfile.BadZipFile, OSError, RuntimeError):
                pass
    return out


def source_shape(paths: list[Path]) -> tuple[int | None, int | None, str | None]:
    """A legnagyobb forrasallomany sorainak es mezo"inek szama."""
    best: tuple[int, int, str | None] | None = None
    for _name, raw in _text_sources(paths):
        lines = [l for l in raw.splitlines() if l.strip()]
        if not lines:
            continue
        sample = lines[: min(50, len(lines))]
        cols, sep_label = 1, None
        for sep, label in SEPARATORS:
            counts = Counter(l.count(sep) for l in sample)
            common, freq = counts.most_common(1)[0]
            if common >= 1 and freq >= len(sample) * 0.8:
                cols, sep_label = common + 1, label
                break
        if best is None or len(lines) > best[0]:
            best = (len(lines), cols, sep_label)
    return best if best else (None, None, None)


def analyse(
    utmutato_text: str,
    feladatlap_text: str,
    source_files: list[Path],
    solution_files: list[Path],
) -> ProgStats:
    st = ProgStats()
    # A feladatlap irja le, mit kell csinalni; az utmutato azt, mit fogadunk el.
    # A ketto egyutt adja a legjobb lefedettseget a tipusalgoritmusokra.
    combined = f"{feladatlap_text}\n{utmutato_text}"
    st.algorithms.update(count_keywords(combined, load_keywords("algorithm_keywords.yaml")))
    st.io.update(count_keywords(combined, load_keywords("programozas_io.yaml")))
    st.subtask_count = count_subtasks(feladatlap_text)
    st.solution_langs = solution_languages(solution_files)
    st.input_rows, st.input_cols, st.input_separator = source_shape(source_files)
    return st
