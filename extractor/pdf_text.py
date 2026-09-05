"""PDF -> szoveg, gyorsitotarral.

Sorrend: pdftotext -layout (gyors, jo elrendezes) -> pypdf (tartalek).
A gyorsitotar kulcsa a fajl SHA1-e, igy a fajl valtozasa automatikusan ervenytelenit.
A cache a data/_cache mappaba kerul, ami .gitignore-ban van (szerzoi jog!).
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from .config import CACHE_DIR, find_pdftotext

# Ennyi karakter alatt a PDF-et szoveg nelkulinek (kepnek) tekintjuk -> ocr_needed.
MIN_TEXT_CHARS = 200

_PDFTOTEXT = find_pdftotext()


@dataclass
class PdfText:
    path: Path
    text: str
    pages: int
    engine: str          # "pdftotext" | "pypdf" | "cache" | "error"
    ocr_needed: bool
    error: str | None = None


def _sha1(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _page_count(path: Path) -> int:
    try:
        from pypdf import PdfReader
        return len(PdfReader(str(path)).pages)
    except Exception:
        return 0


def _extract_pdftotext(path: Path) -> str | None:
    if not _PDFTOTEXT:
        return None
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "out.txt"
        try:
            subprocess.run(
                [_PDFTOTEXT, "-layout", "-enc", "UTF-8", str(path), str(out)],
                check=True, capture_output=True, timeout=120,
            )
        except Exception:
            return None
        if out.exists():
            return out.read_text(encoding="utf-8", errors="replace")
    return None


def _extract_pypdf(path: Path) -> str | None:
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    except Exception:
        return None


def extract(path: Path, use_cache: bool = True) -> PdfText:
    """Egy PDF szovege. Hibara ures szoveget ad vissza, nem dob kivetelt."""
    path = Path(path)
    if not path.exists():
        return PdfText(path, "", 0, "error", True, "nincs ilyen fajl")

    key = _sha1(path)
    cache_txt = CACHE_DIR / f"{key}.txt"
    cache_meta = CACHE_DIR / f"{key}.json"

    if use_cache and cache_txt.exists() and cache_meta.exists():
        meta = json.loads(cache_meta.read_text(encoding="utf-8"))
        text = cache_txt.read_text(encoding="utf-8")
        return PdfText(path, text, meta.get("pages", 0), "cache",
                       len(text.strip()) < MIN_TEXT_CHARS)

    text = _extract_pdftotext(path)
    engine = "pdftotext"
    if text is None or len(text.strip()) < MIN_TEXT_CHARS:
        alt = _extract_pypdf(path)
        if alt is not None and len(alt.strip()) > len((text or "").strip()):
            text, engine = alt, "pypdf"
    if text is None:
        text, engine = "", "error"

    pages = _page_count(path)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_txt.write_text(text, encoding="utf-8")
    cache_meta.write_text(
        json.dumps({"pages": pages, "engine": engine, "name": path.name}, ensure_ascii=False),
        encoding="utf-8",
    )
    return PdfText(path, text, pages, engine, len(text.strip()) < MIN_TEXT_CHARS)


def page_count_only(path: Path) -> int:
    """Csak oldalszam, szovegkinyeres nelkul (gyors)."""
    return _page_count(Path(path))
