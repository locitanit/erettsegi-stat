"""Idoszak-nevek ertelmezese es rendezese.

Peldak a storage mappaneveire:
    "2025 majus", "2022 majus (idegen)", "2023 majus (idegen) (informatika)",
    "2006 februar", "2024 oktober"
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

MONTHS = {
    "januar": 1, "februar": 2, "marcius": 3, "aprilis": 4,
    "majus": 5, "junius": 6, "julius": 7, "augusztus": 8,
    "szeptember": 9, "oktober": 10, "november": 11, "december": 12,
}

MONTH_LABEL = {2: "februar", 5: "majus", 10: "oktober"}
MONTH_LABEL_HU = {1: "januar", 2: "februar", 3: "marcius", 4: "aprilis",
                  5: "majus", 6: "junius", 7: "julius", 8: "augusztus",
                  9: "szeptember", 10: "oktober", 11: "november", 12: "december"}
# A felhasznaloi feluletre ekezetes alak kell.
MONTH_LABEL_ACCENT = {
    1: "január", 2: "február", 3: "március", 4: "április", 5: "május", 6: "június",
    7: "július", 8: "augusztus", 9: "szeptember", 10: "október", 11: "november",
    12: "december",
}

# Az id-ben hasznalt rovid honapjel.
MONTH_CODE = {2: "f", 5: "m", 10: "o"}

# 2022-tol a targy neve digitalis kultura; elotte informatika.
DIGKULT_FROM_YEAR = 2022


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


@dataclass(frozen=True)
class Period:
    """Egy storage-mappanevbol kiolvasott idoszak."""
    raw: str            # az eredeti mappanev, pl. "2023 majus (idegen) (informatika)"
    year: int
    month: int
    variant: str        # "normal" | "idegen"
    subject: str        # "informatika" | "digitalis_kultura"

    @property
    def month_code(self) -> str:
        return MONTH_CODE.get(self.month, str(self.month))

    @property
    def label(self) -> str:
        """Ember altal olvashato cimke, pl. '2023. majus (idegen, informatika)'."""
        extra = []
        if self.variant == "idegen":
            extra.append("idegen nyelvu")
        if self.subject == "informatika" and self.year >= DIGKULT_FROM_YEAR:
            extra.append("informatika")
        suffix = f" ({', '.join(extra)})" if extra else ""
        return f"{self.year}. {MONTH_LABEL_ACCENT[self.month]}{suffix}"

    @property
    def sort_key(self) -> tuple:
        # idorend, azon belul: normal targy elore, normal variant elore
        return (self.year, self.month, 0 if self.subject != "informatika" or self.year < DIGKULT_FROM_YEAR else 1,
                0 if self.variant == "normal" else 1)

    def exam_id(self, level: str) -> str:
        subj = "dk" if self.subject == "digitalis_kultura" else "inf"
        base = f"{self.year}{self.month_code}_{level}_{subj}"
        return base + "_id" if self.variant == "idegen" else base


def parse_period(name: str) -> Period | None:
    """Mappanevbol Period. None, ha nem ertelmezheto."""
    plain = strip_accents(name).lower().strip()
    m = re.match(r"^(\d{4})\s+([a-z]+)", plain)
    if not m:
        return None
    year = int(m.group(1))
    month = MONTHS.get(m.group(2))
    if month is None:
        return None
    variant = "idegen" if "(idegen)" in plain else "normal"
    if "(informatika)" in plain:
        subject = "informatika"
    elif year >= DIGKULT_FROM_YEAR:
        subject = "digitalis_kultura"
    else:
        subject = "informatika"
    return Period(raw=name, year=year, month=month, variant=variant, subject=subject)
