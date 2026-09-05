"""A vocab/*.yaml szotarak betoltese es keresheto alakra hozasa.

A kodban nincs beegetett fuggveny- vagy kulcsszonev: minden innen jon.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

from .config import VOCAB_DIR


def norm(name: object) -> str:
    """Kereso kulcs: nagybetus, felesleges szokoz nelkul.

    A YAML nehany nevet (TRUE/FALSE) logikai ertekke alakit, ezert szoveggé kell
    kenyszeriteni, mielott normalizalunk.
    """
    return re.sub(r"\s+", "", str(name)).upper()


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


@dataclass
class FunctionEntry:
    canon: str
    aliases: list[str] = field(default_factory=list)
    family: str = "egyeb"
    since: int | None = None


@dataclass
class Functions:
    """Fuggvenyszotar: barmely irasmodbol a kanonikus magyar nevre."""
    entries: list[FunctionEntry]
    lookup: dict[str, str]          # normalizalt nev -> kanonikus
    loose: dict[str, str]           # ekezet nelkuli nev -> kanonikus (tartalek)

    def canonical(self, token: str) -> str | None:
        key = norm(token)
        if key in self.lookup:
            return self.lookup[key]
        return self.loose.get(strip_accents(key))

    @property
    def by_canon(self) -> dict[str, FunctionEntry]:
        return {e.canon: e for e in self.entries}


def _load_yaml(name: str) -> object:
    path = VOCAB_DIR / name
    if not path.exists():
        return []
    return yaml.safe_load(path.read_text(encoding="utf-8")) or []


@lru_cache(maxsize=1)
def load_functions() -> Functions:
    raw = _load_yaml("excel_functions.yaml")
    entries: list[FunctionEntry] = []
    lookup: dict[str, str] = {}
    loose: dict[str, str] = {}
    for item in raw:
        e = FunctionEntry(
            canon=item["canon"],
            aliases=list(item.get("aliases") or []),
            family=item.get("family", "egyeb"),
            since=item.get("since"),
        )
        entries.append(e)
        for name in [e.canon, *e.aliases]:
            key = norm(name)
            lookup.setdefault(key, e.canon)
            loose.setdefault(strip_accents(key), e.canon)
    return Functions(entries=entries, lookup=lookup, loose=loose)


@dataclass
class Keyword:
    key: str
    label: str
    patterns: list[re.Pattern]


@lru_cache(maxsize=8)
def load_keywords(filename: str) -> tuple[Keyword, ...]:
    """Kulcsszo-szotar: kulcs, magyar cimke, es a hozza tartozo regexek."""
    raw = _load_yaml(filename)
    out: list[Keyword] = []
    for item in raw:
        pats = [re.compile(p, re.IGNORECASE) for p in (item.get("patterns") or [])]
        out.append(Keyword(key=item["key"], label=item.get("label", item["key"]), patterns=pats))
    return tuple(out)


def vocab_payload() -> dict:
    """A frontendnek szant osszefuzott szotar (data/vocab.json)."""
    fns = load_functions()
    return {
        "functions": [
            {
                "canon": e.canon,
                "aliases": e.aliases,
                "family": e.family,
                **({"since": e.since} if e.since else {}),
            }
            for e in fns.entries
        ],
        "function_families": {
            "logikai": "Logikai",
            "kereső": "Kereső",
            "statisztikai": "Statisztikai",
            "statisztikai_feltételes": "Feltételes statisztikai",
            "szöveg": "Szöveg",
            "dátum": "Dátum és idő",
            "matematikai": "Matematikai",
            "adatbázis": "Adatbázis",
            "információs": "Információs",
            "pénzügyi": "Pénzügyi",
            "egyeb": "Egyéb",
        },
        "tablazat_skills": _labels("tablazat_skills.yaml"),
        "sql_keywords": _labels("sql_keywords.yaml")
        + [{"key": "subquery", "label": "Allekérdezés"}],
        "algorithms": _labels("algorithm_keywords.yaml"),
        "programozas_io": _labels("programozas_io.yaml"),
        "text_ops": _labels("text_ops.yaml"),
        "presentation_ops": _labels("presentation_ops.yaml"),
        "web_ops": _labels("web_ops.yaml"),
        "selector_types": [
            {"key": "elem", "label": "Elem"},
            {"key": "osztaly", "label": "Osztály"},
            {"key": "id", "label": "Azonosító"},
            {"key": "leszarmazott", "label": "Leszármazott"},
            {"key": "pszeudo", "label": "Pszeudo-osztály"},
            {"key": "attributum", "label": "Attribútum"},
        ],
    }


def _labels(filename: str) -> list[dict]:
    return [{"key": k.key, "label": k.label} for k in load_keywords(filename)]
