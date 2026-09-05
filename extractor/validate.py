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


def build_report(
    payload: dict,
    tasks: list[dict] | None = None,
    task_warnings: dict[str, list[str]] | None = None,
) -> str:
    exams = payload["exams"]
    tasks = tasks or []
    task_warnings = task_warnings or {}
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
    a("## Feladatok és táblázatkezelés")
    a("")
    if tasks:
        tabl = [t for t in tasks if "tablazat" in t["topics"]]
        with_f = [t for t in tabl if (t["features"].get("tablazat") or {}).get("formula_count")]
        with_x = [t for t in tabl if (t["features"].get("tablazat") or {}).get("xlsx")]
        formulas = sum(
            (t["features"].get("tablazat") or {}).get("formula_count", 0) for t in tabl
        )
        unknown: Counter = Counter()
        for t in tabl:
            for w in t["warnings"]:
                if w.startswith("ismeretlen függvénynév"):
                    for name in w.split(":", 1)[1].split(","):
                        unknown[name.strip()] += 1
        by_topic = Counter(topic for t in tasks for topic in t["topics"])

        a("| Mutató | Érték |")
        a("|---|---|")
        a(f"| Feladatok összesen | {len(tasks)} |")
        a(f"| Táblázatkezelés-feladat | {len(tabl)} |")
        a(f"| Ebből van kinyert képlet | {len(with_f)} |")
        a(f"| Ebből van mintamegoldás-xlsx is | {len(with_x)} |")
        a(f"| Képletek összesen (útmutatóból) | {formulas} |")
        a(f"| Ismeretlen függvénynév | {len(unknown)} |")
        a("")
        a("Feladatok témakörönként: "
          + ", ".join(f"{k}: {v}" for k, v in sorted(by_topic.items())))
        a("")
        if unknown:
            a("Ismeretlen függvénynevek (vedd fel őket az "
              "`extractor/vocab/excel_functions.yaml` fájlba):")
            a("")
            for name, n in unknown.most_common():
                a(f"- `{name}` – {n} feladatban")
            a("")
        zero = [t for t in tabl if t not in with_f]
        if zero:
            a("Táblázatkezelés-feladat képlet nélkül (ellenőrzendő):")
            a("")
            for t in zero:
                a(f"- `{t['exam_id']}` {t['task_no']}. {t['title']}")
            a("")
    else:
        a("Még nincs feladat-szintű adat (`python -m extractor --all`).")
        a("")

    if task_warnings:
        a("## Feladat-vágási figyelmeztetések")
        a("")
        a("| Vizsga | Figyelmeztetés |")
        a("|---|---|")
        for exam_id, ws in sorted(task_warnings.items()):
            a(f"| `{exam_id}` | " + "; ".join(ws) + " |")
        a("")

    a("## Megjegyzés")
    a("")
    a("A 2005–2011 közötti vizsgák egy része képként tárolt PDF; ezekből nem nyerhető ki szöveg,")
    a("és a tervben rögzített döntés szerint OCR nem készül (TERV 11/3). Ezek a vizsgák a")
    a("listában szerepelnek, de az elemzésekből kimaradnak.")
    a("")
    return "\n".join(lines)


def write_report(
    payload: dict,
    out: Path | None = None,
    tasks: list[dict] | None = None,
    task_warnings: dict[str, list[str]] | None = None,
) -> Path:
    out = out or (DATA_DIR / "VALIDATION.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build_report(payload, tasks, task_warnings), encoding="utf-8")
    return out


def load_tasks(path: Path | None = None) -> dict:
    path = path or (DATA_DIR / "tasks.json")
    return json.loads(path.read_text(encoding="utf-8"))


def load_exams(path: Path | None = None) -> dict:
    path = path or (DATA_DIR / "exams.json")
    return json.loads(path.read_text(encoding="utf-8"))
