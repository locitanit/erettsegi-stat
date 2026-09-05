"""Weblap-elemzo: HTML-elemek, CSS-tulajdonsagok es kijelolo-tipusok.

Elsodleges forras a **mintamegoldas .html es .css fajlja**: ott pontosan latszik,
mit vart az OH. Az utmutato szovegebo"l csak a nem-jelolo"nyelvi keszsegek jonnek
(kulso stiluslap, keretrendszer, urlap stb.).
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from ..vocab_store import load_keywords
from .common import count_keywords

# Csak a valodi HTML-elemeket szamoljuk; a lezaro cimke nem szamit kulon.
TAG = re.compile(r"<\s*([a-zA-Z][a-zA-Z0-9]{0,14})\b")

# A CSS-szabaly kijelolo resze es a benne levo tulajdonsagok.
RULE = re.compile(r"(?P<sel>[^{}@]+)\{(?P<body>[^{}]*)\}")
PROPERTY = re.compile(r"(?:^|;)\s*([a-zA-Z-]{3,30})\s*:")

# Kijelolo-tipusok (TERV 2.5).
SELECTOR_KINDS = [
    ("id", re.compile(r"#[A-Za-z_][\w-]*")),
    ("osztaly", re.compile(r"\.[A-Za-z_][\w-]*")),
    ("pszeudo", re.compile(r":[a-zA-Z-]{3,}")),
    ("attributum", re.compile(r"\[[^\]]+\]")),
    ("leszarmazott", re.compile(r"\S\s+\S")),
    ("elem", re.compile(r"^[a-zA-Z][a-zA-Z0-9]*$")),
]

# Nem HTML-elem, csak ugy nez ki.
IGNORE_TAGS = frozenset({"doctype", "html", "head", "meta", "br", "hr", "!doctype"})

# Keretrendszer-fajlok. Ezek nem a vizsgazo munkaja, es tobb ezer szabalyukkal
# elnyomnak minden valodi adatot - ezert a szamlalasbol kimaradnak, de a
# jelenletuket kulon jelezzuk (TERV 2.5).
FRAMEWORK_NAMES = ("bootstrap", "jquery", "normalize", "reset.css", "font-awesome", "fontawesome")
MAX_CSS_BYTES = 60_000


@dataclass
class WebStats:
    html_tags: Counter = field(default_factory=Counter)
    css_props: Counter = field(default_factory=Counter)
    selector_types: Counter = field(default_factory=Counter)
    page_count: int = 0
    css_file_count: int = 0
    rule_count: int = 0
    frameworks: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "html_tags": dict(self.html_tags.most_common()),
            "css_props": dict(self.css_props.most_common()),
            "selector_types": dict(self.selector_types.most_common()),
            "page_count": self.page_count,
            "css_file_count": self.css_file_count,
            "rule_count": self.rule_count,
            "frameworks": sorted(set(self.frameworks)),
        }


def _read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def analyse_css(text: str, stats: WebStats) -> None:
    for rule in RULE.finditer(text):
        stats.rule_count += 1
        for prop in PROPERTY.findall(rule.group("body")):
            stats.css_props[prop.lower()] += 1
        for selector in rule.group("sel").split(","):
            selector = selector.strip()
            if not selector:
                continue
            for kind, pattern in SELECTOR_KINDS:
                if pattern.search(selector):
                    stats.selector_types[kind] += 1
                    break


def from_solution_files(paths: list[Path]) -> tuple[WebStats, list[str]]:
    """A .html es .css mintamegoldasok elemzese."""
    stats = WebStats()
    warnings: list[str] = []
    for path in paths:
        suffix = path.suffix.lower()
        if suffix not in {".html", ".htm", ".css"}:
            continue
        low = path.name.lower()
        hit = next((f for f in FRAMEWORK_NAMES if f in low), None)
        if hit:
            stats.frameworks.append(hit)
            continue
        text = _read(path)
        if text is None:
            warnings.append(f"{path.name}: nem olvasható")
            continue
        if suffix == ".css":
            if len(text) > MAX_CSS_BYTES:
                # Nevesitetlen keretrendszer-csomag: tul nagy ahhoz, hogy vizsgamegoldas legyen.
                stats.frameworks.append(path.name)
                continue
            stats.css_file_count += 1
            analyse_css(text, stats)
            continue
        stats.page_count += 1
        for tag in TAG.findall(text):
            tag = tag.lower()
            if tag not in IGNORE_TAGS:
                stats.html_tags[tag] += 1
        # a lapba agyazott <style> blokkok
        for block in re.findall(r"<style[^>]*>([\s\S]*?)</style>", text, re.IGNORECASE):
            analyse_css(block, stats)
        for framework in FRAMEWORK_NAMES:
            if framework in text.lower():
                stats.frameworks.append(framework)
    return stats, warnings


def from_utmutato(section_text: str) -> dict[str, int]:
    """Keszseg-kulcsszavak az utmutato szakaszabol."""
    return count_keywords(section_text, load_keywords("web_ops.yaml"))
