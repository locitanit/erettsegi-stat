"""Kezi javitasok betoltese es alkalmazasa (TERV 5/5).

Egy YAML fajl egy vizsgahoz: `extractor/overrides/<ev>_<honap>_<szint>[_idegen].yaml`,
pl. `2010_majus_kozep.yaml`. Ekezet nelkul, kisbetuvel.

A kod egyetlen mezo"t sem eget be: ha egy uj ido"szak elcsuszik, a tanar itt javitja,
nem a forraskodban. Amit az override ad, az a `provenance.override` mezo"be kerul,
hogy a feluleten latszodjon, mi nem automatikus.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .config import OVERRIDES_DIR
from .periods import MONTH_LABEL_HU, Period, strip_accents


@dataclass
class Override:
    """Egy vizsga kezi javitasai. Minden mezo elhagyhato."""
    path: Path | None = None
    notes: str | None = None
    exclude: list[str] = field(default_factory=list)
    section_starts: dict[str, str] = field(default_factory=dict)
    task_topics: dict[str, list[str]] = field(default_factory=dict)
    task_points: dict[str, int] = field(default_factory=dict)
    skip_tasks: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not (
            self.notes
            or self.exclude
            or self.section_starts
            or self.task_topics
            or self.task_points
            or self.skip_tasks
        )

    def applied_fields(self) -> list[str]:
        names = []
        if self.notes:
            names.append("notes")
        if self.exclude:
            names.append("exclude")
        if self.section_starts:
            names.append("section_starts")
        if self.task_topics:
            names.append("task_topics")
        if self.task_points:
            names.append("task_points")
        if self.skip_tasks:
            names.append("skip_tasks")
        return names

    def excludes(self, filename: str) -> bool:
        low = strip_accents(filename).lower()
        return any(strip_accents(p).lower() in low for p in self.exclude)


def override_filename(period: Period, level: str) -> str:
    month = MONTH_LABEL_HU.get(period.month, str(period.month))
    name = f"{period.year}_{month}_{level}"
    if period.variant == "idegen":
        name += "_idegen"
    if period.subject == "informatika" and period.year >= 2022:
        name += "_informatika"
    return name + ".yaml"


def load(period: Period, level: str, directory: Path | None = None) -> Override:
    """A vizsgahoz tartozo override. Ha nincs fajl, ures Override."""
    directory = directory or OVERRIDES_DIR
    path = directory / override_filename(period, level)
    if not path.exists():
        return Override()
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError:
        return Override(path=path)
    if not isinstance(raw, dict):
        return Override(path=path)
    return Override(
        path=path,
        notes=raw.get("notes"),
        exclude=[str(x) for x in (raw.get("exclude") or [])],
        section_starts={str(k): str(v) for k, v in (raw.get("section_starts") or {}).items()},
        task_topics={
            str(k): [str(t) for t in (v or [])]
            for k, v in (raw.get("task_topics") or {}).items()
        },
        task_points={str(k): int(v) for k, v in (raw.get("task_points") or {}).items()},
        skip_tasks=[str(x) for x in (raw.get("skip_tasks") or [])],
    )
