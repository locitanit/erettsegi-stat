"""Szovegszerkesztes- es prezentacio/grafika-elemzo.

Mindketto ugyanaz a minta: az utmutato pontozasi soraiban kulcsszavakat keresunk
(`vocab/text_ops.yaml`, `vocab/presentation_ops.yaml`). A szamok trendre jok,
pontos darabszamnak nem - a feluleten ez jelolve van.
"""
from __future__ import annotations

from ..vocab_store import load_keywords
from .common import count_keywords


def text_ops(section_text: str) -> dict[str, int]:
    return count_keywords(section_text, load_keywords("text_ops.yaml"))


def presentation_ops(section_text: str) -> dict[str, int]:
    return count_keywords(section_text, load_keywords("presentation_ops.yaml"))
