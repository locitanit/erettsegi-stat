"""Kozos segedek a temakori elemzokhoz."""
from __future__ import annotations

import re

from ..vocab_store import Keyword

# Az utmutato a kepleteket ilyen bevezetokkel adja meg:
#   "F2-es cellában: =B2/D2"
#   "B17-es cellában vagy segédcellában: HOL.VAN(MAX(G17:M17);G17:M17;0)"
#   "Példa a képletre: =SZUM(A1:A5)"
CELL_INTRO = re.compile(r"(?:cell[aá]\w*|képlet\w*|függvény\w*)\s*:\s*(?P<f>\S.*)$", re.IGNORECASE)

# Ha nincs bevezeto, akkor csak az egyenlosegjeltol kezdodo reszt nezzuk: igy a
# proza ("A pont jár, ha ...") nem kerul a keplet-jeloltek koze.
EQ_START = re.compile(r"=\s*(?P<f>[^\s=].*)$")


def formula_candidates(text: str) -> list[str]:
    """Keplet-jeloltek egy utmutato-szakasz szovegebo"l.

    Szandekosan szuk: csak a "cellaban:" / "keplet:" bevezeto utani reszt, illetve
    az egyenlosegjel utani reszt fogadjuk el. Igy a szoveges reszekben emlitett
    szavak (pl. szinkodok) nem kerulnek a szamlalasba.
    """
    out: list[str] = []
    for line in text.splitlines():
        line = line.rstrip()
        if not line.strip():
            continue
        m = CELL_INTRO.search(line)
        if m:
            out.append(_trim_points(m.group("f")))
            continue
        m = EQ_START.search(line)
        if m:
            out.append(_trim_points(m.group("f")))
    return [f for f in out if f]


def _trim_points(s: str) -> str:
    """A tordeles miatt a sor vegere csuszott "N pont" levagasa."""
    return re.sub(r"\s{2,}\d+\s*pont.*$", "", s).strip()


def max_paren_depth(s: str) -> int:
    """A legmelyebb zarojel-beagyazas a kepletben."""
    depth = best = 0
    for ch in s:
        if ch == "(":
            depth += 1
            best = max(best, depth)
        elif ch == ")":
            depth = max(0, depth - 1)
    return best


def count_keywords(text: str, keywords: tuple[Keyword, ...]) -> dict[str, int]:
    """Kulcsszo-talalatok szama a szovegben."""
    out: dict[str, int] = {}
    for kw in keywords:
        n = sum(len(p.findall(text)) for p in kw.patterns)
        if n:
            out[kw.key] = n
    return out


def word_count(text: str) -> int:
    return len(re.findall(r"\w+", text, re.UNICODE))
