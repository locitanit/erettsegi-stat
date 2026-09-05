"""A javitasi utmutato szovegenek feladat-szakaszokra vagasa.

A fejlecek evjaratonkent maskepp neznek ki, ezert tobb mintat probalunk:

    1. Balatoni komp            (2005-)
    1A. Siparadicsomok          (emelt, 2022-)
    1.A Robotikaszakkor logo    (emelt, 2022 oktober)
    3. Suti                                                       1 pont

Ket zavaro tenyezo van, amit kezelni kell:

1. **Tartalomjegyzek az elejen** es **osszefoglalo tablazat a vegen** - ott ugyanazok
   a fejlecek szerepelnek egymashoz kozel. Ezert az igazi szakaszhataroknak minimalis
   tavolsagot irunk elo (MIN_GAP sor), es a jeloltek kozul azt a kombinaciot valasztjuk,
   amelyik ezt teljesiti.
2. **Egy feladat tobb temakorhoz is tartozhat** (pl. emelt "1A" egyszerre prezentacio es
   weblap), ezert a szakaszok szama nem feltetlenul egyezik a temakorok szamaval. A
   feladat-temakor osszerendeles a feladatlap-PDF fajlnevebol jon (2022-tol a fajlnev
   maga a feladatcim), regebbi vizsgakon pedig sorrend alapjan.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

# Fejlec-jelolt: sorszam, opcionalis A/B alszam, majd nagybetuvel kezdodo cim.
# A sor vegen allhat a keretezes miatt atcsuszott "N pont".
HEADER_RE = re.compile(
    r"^[ \t]*(?P<num>\d{1,2})"
    r"(?:\.[ \t]*(?P<sub1>[AB])\b|(?P<sub2>[AB])\.|\.)"
    # A cim nagybetuvel kezdodik, vagy "eUtazas" / "iPhone" modjara kis+nagy betuvel.
    r"[ \t]*(?P<title>(?:[A-ZÁÉÍÓÖŐÚÜŰ]|[a-z][A-ZÁÉÍÓÖŐÚÜŰ])[^\n]{1,44}?)"
    r"(?:[ \t]{2,}\d+[ \t]*pont.*)?[ \t]*$"
)

# Ket valodi szakaszhatar kozott legalabb ennyi sor van. A tartalomjegyzek es a
# zaro osszefoglalo sorai ennel jelentosen suruebbek.
MIN_GAP = 25


def _fold(s: str) -> str:
    """Ekezet- es kisbetu-fuggetlen osszehasonlitashoz."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def _fold_keys(s: str) -> list[str]:
    """Osszehasonlitasi kulcsok: a teljes cim es a nevelo nelkuli valtozata.

    Az utmutatoban "Az Arpad motorkocsi" all, a feladatlap fajlneve viszont
    "Arpad-motorkocsi.pdf" - a nevelo nelkul kell egyeznie.
    """
    keys = [_fold(s)]
    no_article = re.sub(r"^(a|az|egy)\s+", "", s.strip(), flags=re.IGNORECASE)
    if no_article != s.strip():
        keys.append(_fold(no_article))
    return [k for k in keys if k]


@dataclass
class Section:
    """Egy feladat szakasza az utmutatoban."""
    task_no: str           # "1", "1A", "2" ...
    title: str
    start: int             # sorindex (a fejlec sora)
    end: int               # kizarolagos veg
    lines: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(self.lines)


def _candidates(lines: list[str]) -> dict[tuple[int, str], list[tuple[int, str]]]:
    """Fejlec-jeloltek kulcsonkent: (sorszam, alszam) -> [(sorindex, cim), ...]"""
    out: dict[tuple[int, str], list[tuple[int, str]]] = {}
    for i, line in enumerate(lines):
        m = HEADER_RE.match(line)
        if not m:
            continue
        key = (int(m["num"]), m["sub1"] or m["sub2"] or "")
        if key[0] < 1 or key[0] > 12:
            continue
        out.setdefault(key, []).append((i, m["title"].strip()))
    return out


def _choose(
    keys: list[tuple[int, str]], cand: dict, min_gap: int, total_lines: int
) -> list[tuple[int, str]] | None:
    """Kulcsonkent egy elofordulas, szigoruan novekvo sorrendben, min_gap tavolsaggal.

    Ugyanazok a fejlecek harom helyen is szerepelhetnek: a tartalomjegyzekben
    (elol), az utmutato torzseben, es a zaro ertekelo"lapon (hatul). A torzs az,
    ahol a szakaszok **hosszuak**, ezert azt a valasztast fogadjuk el, amelyik a
    legrovidebb szakaszt maximalja. Egyenlo"seg eseten a korabbi kezdet nyer.
    """
    best: list[tuple[int, str]] | None = None
    best_score: tuple[int, int] | None = None

    def rec(idx: int, prev: int, acc: list[tuple[int, str]], worst: int) -> None:
        nonlocal best, best_score
        if idx == len(keys):
            score = (min(worst, total_lines - acc[-1][0]), -acc[0][0])
            if best_score is None or score > best_score:
                best, best_score = list(acc), score
            return
        for pos, title in cand[keys[idx]]:
            if pos >= prev + min_gap:
                acc.append((pos, title))
                rec(idx + 1, pos, acc, worst if idx == 0 else min(worst, pos - prev))
                acc.pop()

    rec(0, -min_gap, [], total_lines)
    return best


def split(text: str, expected: int | None = None) -> tuple[list[Section], list[str]]:
    """Az utmutato szovegebo"l feladat-szakaszok + figyelmeztetesek.

    `expected`: a varhato feladatszam (a kulonbozo feladatlap-PDF-ek szama).
    """
    lines = text.splitlines()
    warnings: list[str] = []
    cand = _candidates(lines)
    if not cand:
        return [], ["az útmutatóban nem található feladat-fejléc"]

    keys = sorted(cand)
    # Az elso feladatnal kezdunk; ami elotte van, az bevezeto.
    while keys and keys[0][0] != 1:
        keys.pop(0)
    if expected:
        keys = keys[:expected]

    chosen = _choose(keys, cand, MIN_GAP, len(lines))
    if chosen is None:
        # A tavolsagi feltetel tul szigoru volt (nagyon rovid utmutato).
        chosen = _choose(keys, cand, 1, len(lines))
        warnings.append("a feladat-szakaszok szokatlanul rövidek")
    if chosen is None:
        return [], ["a feladat-fejlécek nem alkotnak növekvő sorozatot"]

    sections: list[Section] = []
    for idx, (key, (pos, title)) in enumerate(zip(keys, chosen)):
        end = chosen[idx + 1][0] if idx + 1 < len(chosen) else len(lines)
        sections.append(
            Section(
                task_no=f"{key[0]}{key[1]}",
                title=title,
                start=pos,
                end=end,
                lines=lines[pos:end],
            )
        )

    if expected and len(sections) != expected:
        warnings.append(
            f"{expected} feladat várható, de {len(sections)} szakasz található az útmutatóban"
        )
    return sections, warnings


def _topic_groups(
    topic_files: dict[str, list[str]],
    topic_order: list[str],
    exclude: set[str],
) -> list[list[str]]:
    """Egy feladathoz tartozo temakorok csoportjai, a vizsga sorrendjeben.

    Ha ket temakor UGYANAZT a feladatlap-PDF-et kapta (pl. 2009-ben az
    "e_szov_web_2009_maj.pdf" a szovegszerkesztes es a weblap kozos feladata),
    akkor az egy feladat, nem ketto. Enelkul a sorrend alapu kiosztas elcsuszna.
    """
    groups: list[list[str]] = []
    seen_file: dict[str, int] = {}
    for topic in topic_order:
        if topic in exclude or topic not in topic_files:
            continue
        key = "|".join(sorted(_fold(n) for n in topic_files[topic])) or topic
        if key in seen_file:
            groups[seen_file[key]].append(topic)
        else:
            seen_file[key] = len(groups)
            groups.append([topic])
    return groups


def match_topics(
    sections: list[Section],
    topic_files: dict[str, list[str]],
    topic_order: list[str],
) -> tuple[dict[str, list[str]], dict[str, str], list[str]]:
    """Szakasz -> temakorok osszerendelese.

    Visszaad: {feladatszam: [temakor]}, {feladatszam: "cim"|"sorrend"}, figyelmeztetesek.

    `topic_files`: temakor -> a temakor feladatlap-PDF-jeinek fajlneve (kiterjesztes nelkul).
    2022-to"l a fajlnev maga a feladatcim ("Siparadicsomok.pdf"), ezert cim szerint
    parosithato. A regi vizsgakon a fajlnev kod ("k_tabl_2013_maj"), ott a sorrend dont.
    """
    warnings: list[str] = []
    result: dict[str, list[str]] = {s.task_no: [] for s in sections}

    by_title: dict[str, list[str]] = {}
    for topic, names in topic_files.items():
        for n in names:
            for k in _fold_keys(n):
                by_title.setdefault(k, []).append(topic)

    matched_topics: set[str] = set()
    for s in sections:
        hit: list[str] = []
        for k in _fold_keys(s.title):
            hit = by_title.get(k, [])
            if hit:
                break
        if not hit:
            # Reszleges egyezes: a fajlnev roviditheti vagy bo"vitheti a cimet.
            for k in _fold_keys(s.title):
                for fk, topics in by_title.items():
                    if len(k) >= 6 and len(fk) >= 6 and (k in fk or fk in k):
                        hit = topics
                        break
                if hit:
                    break
        if hit:
            result[s.task_no] = sorted(set(hit))
            matched_topics.update(hit)

    method = {s.task_no: ("cim" if result[s.task_no] else "sorrend") for s in sections}

    unmatched = [s for s in sections if not result[s.task_no]]
    if unmatched:
        # Ami cim szerint nem jott ki, azt sorrend szerint osztjuk ki. A 2022 elotti
        # vizsgakon ez a normalis ut: ott a feladatlap fajlneve kod, nem cim.
        for s, group in zip(unmatched, _topic_groups(topic_files, topic_order, matched_topics)):
            result[s.task_no] = group
        still = [s.task_no for s in sections if not result[s.task_no]]
        if still:
            warnings.append(
                "nem sikerült témakört rendelni ehhez a feladathoz: " + ", ".join(still)
            )
    return result, method, warnings
