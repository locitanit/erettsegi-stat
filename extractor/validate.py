"""Ellenorzes + ember altal olvashato riport (data/VALIDATION.md).

A CI-t nem buktatja: a riport a tanarnak keszul.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from .config import DATA_DIR

REQUIRED_EXAM_FIELDS = (
    "id", "year", "month", "level", "subject", "variant", "period_label",
    "topics", "has", "pages", "warnings",
)


def check_schema(payload: dict) -> list[str]:
    problems: list[str] = []
    exams = payload.get("exams")
    if not isinstance(exams, list) or not exams:
        return ["exams.json: hianyzo vagy ures 'exams' lista"]
    seen: set[str] = set()
    for rec in exams:
        rid = rec.get("id", "<nincs id>")
        for f in REQUIRED_EXAM_FIELDS:
            if f not in rec:
                problems.append(f"{rid}: hianyzo mezo '{f}'")
        if rid in seen:
            problems.append(f"{rid}: duplikalt vizsga-azonosito")
        seen.add(rid)
        if rec.get("level") not in ("kozep", "emelt"):
            problems.append(f"{rid}: ervenytelen szint '{rec.get('level')}'")
        if rec.get("subject") not in ("informatika", "digitalis_kultura"):
            problems.append(f"{rid}: ervenytelen targy '{rec.get('subject')}'")
    return problems


def build_report(payload: dict) -> str:
    exams = payload["exams"]
    n = len(exams)
    by_level = Counter(e["level"] for e in exams)
    by_subject = Counter(e["subject"] for e in exams)
    by_variant = Counter(e["variant"] for e in exams)
    by_decade = defaultdict(int)
    for e in exams:
        by_decade[e["year"]] += 1

    no_ut = [e for e in exams if not e["has"]["utmutato"]]
    no_fl = [e for e in exams if not e["has"]["feladatlap"]]
    ocr = [e for e in exams if e.get("ocr_needed")]
    warned = [e for e in exams if e.get("warnings")]

    schema_problems = check_schema(payload)

    years = sorted({e["year"] for e in exams})
    lines: list[str] = []
    a = lines.append
    a("# Adatminőségi riport")
    a("")
    a(f"Generálva: {date.today().isoformat()} · {payload.get('generated_by', '')}")
    a("")
    a("## Összesítés")
    a("")
    a("| Mutató | Érték |")
    a("|---|---|")
    a(f"| Vizsgák száma | {n} |")
    a(f"| Középszint / emelt | {by_level.get('kozep', 0)} / {by_level.get('emelt', 0)} |")
    a(f"| Informatika / digitális kultúra | {by_subject.get('informatika', 0)} / {by_subject.get('digitalis_kultura', 0)} |")
    a(f"| Normál / idegen nyelvű | {by_variant.get('normal', 0)} / {by_variant.get('idegen', 0)} |")
    a(f"| Időszakok | {years[0]}–{years[-1]} |")
    a(f"| Van javítási útmutató | {n - len(no_ut)} / {n} |")
    a(f"| Van feladatlap | {n - len(no_fl)} / {n} |")
    a(f"| Szöveg nem nyerhető ki (ocr_needed) | {len(ocr)} |")
    a(f"| Figyelmeztetéssel | {len(warned)} |")
    a("")

    a("## Sémahibák")
    a("")
    if schema_problems:
        for p in schema_problems[:50]:
            a(f"- {p}")
        if len(schema_problems) > 50:
            a(f"- ... és további {len(schema_problems) - 50} hiba")
    else:
        a("Nincs.")
    a("")

    a("## Lefedettség évenként")
    a("")
    a("| Év | Vizsga | Útmutató | Feladatlap | Szöveg nélkül |")
    a("|---|---|---|---|---|")
    for y in years:
        ys = [e for e in exams if e["year"] == y]
        a(f"| {y} | {len(ys)} | {sum(1 for e in ys if e['has']['utmutato'])} | "
          f"{sum(1 for e in ys if e['has']['feladatlap'])} | {sum(1 for e in ys if e.get('ocr_needed'))} |")
    a("")

    a("## Figyelmeztetések vizsgánként")
    a("")
    if warned:
        a("| Vizsga | Időszak | Szint | Figyelmeztetés |")
        a("|---|---|---|---|")
        for e in warned:
            a(f"| `{e['id']}` | {e['period_label']} | {e['level']} | " +
              "; ".join(e["warnings"]) + " |")
    else:
        a("Nincs.")
    a("")
    a("## Megjegyzés")
    a("")
    a("A 2005–2011 közötti vizsgák egy része képként tárolt PDF; ezekből nem nyerhető ki szöveg,")
    a("és a tervben rögzített döntés szerint OCR nem készül (TERV 11/3). Ezek a vizsgák a")
    a("listában szerepelnek, de az elemzésekből kimaradnak.")
    a("")
    return "\n".join(lines)


def write_report(payload: dict, out: Path | None = None) -> Path:
    out = out or (DATA_DIR / "VALIDATION.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build_report(payload), encoding="utf-8")
    return out


def load_exams(path: Path | None = None) -> dict:
    path = path or (DATA_DIR / "exams.json")
    return json.loads(path.read_text(encoding="utf-8"))
