"""Utvonalak es globalis beallitasok."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

# A repo gyokere (ez a fajl: <repo>/extractor/config.py)
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
CACHE_DIR = DATA_DIR / "_cache"
METRICS_DIR = DATA_DIR / "metrics"
VOCAB_DIR = Path(__file__).resolve().parent / "vocab"
OVERRIDES_DIR = Path(__file__).resolve().parent / "overrides"

# Az adatforras. Gepfuggo: ERETTSEGI_STORAGE kornyezeti valtozoval feluldefinialhato.
DEFAULT_STORAGE = Path(
    os.environ.get(
        "ERETTSEGI_STORAGE",
        Path(os.environ.get("LOCALAPPDATA", "")) / "RMG Tools" / "storage" / "dig_kult_erettsegi",
    )
)

# Az rmg_tools letolto allapotfajlja (idoszaklista + topic_order).
STATE_FILE = "download_dig_kult_erettsegi_state.json"

# A nyers OH-elrendezes almappaja (TERV 7.1).
OH_RAW_DIR = "_oh_raw"

LEVELS = ("kozep", "emelt")

# Temakorok kanonikus sorrendje es magyar cimkeje.
TOPICS = {
    "szoveg": "Szovegszerkesztes",
    "tablazat": "Tablazatkezeles",
    "adatbazis": "Adatbazis-kezeles",
    "programozas": "Programozas",
    "weblap": "Weblap",
    "prezentacio": "Prezentacio",
    "prezentacio_grafika": "Prezentacio es grafika",
}

# Ezeket a fajlokat sehol nem dolgozzuk fel (mas targy, illetve pontozotabla).
EXCLUDE_FILE_PATTERNS = (
    "infoism",           # Informatika ismeretek (szakmai targy)
    "informatika_ism",   # ugyanaz xlsx-ben
    "autorep",           # Automatikai es elektronikai ismeretek
    "turiszt",           # Turisztika
)

# Pontozo/ertekelo tablak - nem mintamegoldasok. Az "_ut." vegzodes az utmutato
# sajat pontozotablaja (pl. e_inf_19maj_ut.xlsx): csupa SZUM, a fuggveny-szamlalast
# elrontana (TERV 9. kockazat).
EXCLUDE_SOLUTION_PATTERNS = (
    "ertekel",       # ertekelo, ertekelesi, ertekelolap
    "javitasi",
    "_ut.",
    "_pontozo",
)


def find_pdftotext() -> str | None:
    """A poppler/xpdf pdftotext binaris utja, ha van."""
    env = os.environ.get("PDFTOTEXT")
    if env and Path(env).exists():
        return env
    found = shutil.which("pdftotext")
    if found:
        return found
    for cand in (
        r"C:\Program Files\Git\mingw64\bin\pdftotext.exe",
        r"C:\Program Files\poppler\bin\pdftotext.exe",
        r"C:\poppler\bin\pdftotext.exe",
    ):
        if Path(cand).exists():
            return cand
    return None
