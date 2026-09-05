"""Adatbazis-elemzo: SQL-zaradekok, lekerdezesszam, tablaszam, allekerdezesek.

Ket forras:
  - **utmutato-PDF** (elsodleges): a "Például:" utan kozolt mintalekerdezesek
  - **.sql mintamegoldas** (2022-to"l): a kiadott megoldasfajlok

A regi, Access-korszakbeli vizsgakon (.mdb/.accdb) nincs kinyerheto SQL, ott csak
az utmutato szamit – ezt a `has.megoldas_access` mezo jelzi az exams.json-ban.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from ..vocab_store import load_keywords
from .common import count_keywords, strip_page_furniture

# Egy SQL-utasitas kezdete.
SQL_START = re.compile(
    r"\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE)\b", re.IGNORECASE
)

# Egy sor akkor tartozik meg a lekerdezeshez, ha SQL-nek nez ki: kulcsszoval kezdo"dik,
# zarojel vagy operator van benne, vagy "tabla.mezo" alaku hivatkozas.
SQL_LINE = re.compile(
    r"^\s*($|[(),;*]|(SELECT|FROM|WHERE|GROUP|ORDER|HAVING|AND|OR|NOT|INTO|VALUES|SET|JOIN"
    r"|INNER|LEFT|RIGHT|FULL|CROSS|ON|UNION|AS|DISTINCT|TOP|LIMIT|BETWEEN|LIKE|IN|IS|NULL"
    r"|ASC|DESC)\b|[A-Za-z_][A-Za-z0-9_]*\s*\.\s*[A-Za-z_]|[A-Za-z_][A-Za-z0-9_]*\s*[=<>])",
    re.IGNORECASE,
)

MAX_QUERY_LINES = 14

# A FROM utani tablalista vege.
FROM_CLAUSE = re.compile(
    r"\bFROM\b(?P<tables>[\s\S]*?)(?=\bWHERE\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bUNION\b|;|$)",
    re.IGNORECASE,
)


@dataclass
class SqlStats:
    clauses: Counter = field(default_factory=Counter)   # zaradek -> hany lekerdezesben
    query_count: int = 0
    subquery_count: int = 0
    max_tables_per_query: int = 0
    max_conditions: int = 0

    def as_dict(self) -> dict:
        return {
            "sql_clauses": dict(self.clauses.most_common()),
            "query_count": self.query_count,
            "subquery_count": self.subquery_count,
            "max_tables_per_query": self.max_tables_per_query,
            "max_conditions": self.max_conditions,
        }


def extract_queries(text: str) -> list[str]:
    """SQL-utasitasok kinyerese az utmutato szovegebo"l."""
    clean = strip_page_furniture(text)
    lines = clean.splitlines()
    queries: list[str] = []
    i = 0
    while i < len(lines):
        if not SQL_START.search(lines[i]):
            i += 1
            continue
        start = SQL_START.search(lines[i]).start()
        chunk = [lines[i][start:]]
        j = i + 1
        while j < len(lines) and len(chunk) < MAX_QUERY_LINES:
            if ";" in chunk[-1]:
                break
            nxt = lines[j]
            # uj utasitas kezdo"dik ugyanabban a blokkban
            if SQL_START.match(nxt.strip()):
                break
            if not SQL_LINE.match(nxt):
                break
            chunk.append(nxt)
            j += 1
        query = " ".join(l.strip() for l in chunk if l.strip())
        query = query.split(";")[0].strip()
        if len(query) > 12:
            queries.append(query)
        i = max(j, i + 1)
    return queries


def _table_count(query: str) -> int:
    m = FROM_CLAUSE.search(query)
    if not m:
        return 0
    tables = m.group("tables")
    # a JOIN-os alak tablait is szamoljuk
    parts = re.split(r",|\bJOIN\b", tables, flags=re.IGNORECASE)
    names = [p.strip() for p in parts if re.search(r"[A-Za-z_]", p)]
    return len(names)


def _condition_count(query: str) -> int:
    m = re.search(r"\bWHERE\b([\s\S]*?)(?=\bGROUP\b|\bORDER\b|\bHAVING\b|$)", query, re.IGNORECASE)
    if not m:
        return 0
    return 1 + len(re.findall(r"\b(AND|OR)\b", m.group(1), re.IGNORECASE))


def analyse_queries(queries: list[str]) -> SqlStats:
    st = SqlStats()
    keywords = load_keywords("sql_keywords.yaml")
    for q in queries:
        st.query_count += 1
        for key in count_keywords(q, keywords):
            st.clauses[key] += 1
        # allekerdezes: a legkulso" SELECT utan meg egy SELECT
        inner = len(re.findall(r"\bSELECT\b", q, re.IGNORECASE)) - 1
        if inner > 0:
            st.subquery_count += inner
            st.clauses["subquery"] += 1
        st.max_tables_per_query = max(st.max_tables_per_query, _table_count(q))
        st.max_conditions = max(st.max_conditions, _condition_count(q))
    return st


def from_utmutato(section_text: str) -> tuple[SqlStats, list[str]]:
    queries = extract_queries(section_text)
    return analyse_queries(queries), queries


def from_sql_files(paths: list[Path]) -> tuple[SqlStats, list[str]]:
    """A .sql mintamegoldasok. Hiba eseten ures statisztika + figyelmeztetes."""
    warnings: list[str] = []
    queries: list[str] = []
    for path in paths:
        if path.suffix.lower() != ".sql":
            continue
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            warnings.append(f"{path.name}: nem olvasható ({type(exc).__name__})")
            continue
        # a sorvegi es blokk-kommentek eltavolitasa, majd utasitasokra bontas
        raw = re.sub(r"--[^\n]*", " ", raw)
        raw = re.sub(r"/\*[\s\S]*?\*/", " ", raw)
        for stmt in raw.split(";"):
            stmt = " ".join(stmt.split())
            if len(stmt) > 12 and SQL_START.search(stmt):
                queries.append(stmt)
    return analyse_queries(queries), warnings
