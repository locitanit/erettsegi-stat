"""CLI: python -m extractor [kapcsolok]

Peldak:
    python -m extractor --all
    python -m extractor --period "2026 oktober"
    python -m extractor --period "2019 majus" --level emelt --debug
    python -m extractor --validate-only
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from .build_exams import build_exams_json, write_exams_json
from .build_metrics import write_metrics, write_vocab_json
from .build_tasks import build_tasks_json, write_tasks_json
from .config import DEFAULT_STORAGE, LEVELS, TOPICS
from .discover import discover
from .periods import strip_accents
from .validate import load_exams, load_tasks, write_report

log = logging.getLogger("extractor")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="extractor", description="Erettsegi-statisztika adatkinyeres")
    p.add_argument("--storage", type=Path, default=DEFAULT_STORAGE, help="a storage gyokere")
    p.add_argument("--all", action="store_true", help="teljes ujraepites")
    p.add_argument("--period", help='egy idoszak, pl. "2026 oktober"')
    p.add_argument("--level", choices=LEVELS, help="csak ez a szint")
    p.add_argument("--topic", choices=sorted(TOPICS), help="csak ez a temakor (1. fazistol)")
    p.add_argument("--validate-only", action="store_true", help="csak a riportot generalja ujra")
    p.add_argument("--no-text", action="store_true", help="ne nyerjen ki PDF-szoveget (gyors)")
    p.add_argument("--no-cache", action="store_true", help="a PDF-gyorsitotar megkerulese")
    p.add_argument("--debug", action="store_true")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stdout,
    )

    if args.validate_only:
        payload = load_exams()
        try:
            tasks = load_tasks()["tasks"]
        except FileNotFoundError:
            tasks = []
        out = write_report(payload, tasks=tasks)
        log.info("riport: %s", out)
        return 0

    storage = Path(args.storage)
    if not storage.is_dir():
        log.error("nincs meg a storage: %s", storage)
        log.error("allitsd be az ERETTSEGI_STORAGE kornyezeti valtozot, vagy add meg: --storage")
        return 2

    t0 = time.time()
    log.info("felderites: %s", storage)
    exams = discover(storage)
    log.info("talalt vizsgak: %d", len(exams))

    selected = exams
    if args.period:
        want = strip_accents(args.period).lower().strip()
        selected = [e for e in exams if want in strip_accents(e.period.raw).lower()]
        log.info("--period '%s' -> %d vizsga", args.period, len(selected))
    if args.level:
        selected = [e for e in selected if e.level == args.level]
    if not selected:
        log.error("a szurok egyetlen vizsgara sem illeszkednek")
        return 1

    payload = build_exams_json(selected, storage, with_text=not args.no_text)

    # Reszleges futasnal a meglevo exams.json-t frissitjuk, nem irjuk felul.
    if not args.all and (args.period or args.level):
        try:
            old = load_exams()
            by_id = {e["id"]: e for e in old["exams"]}
            for rec in payload["exams"]:
                by_id[rec["id"]] = rec
            payload["exams"] = sorted(
                by_id.values(), key=lambda r: (r["year"], r["month"], r["id"])
            )
            log.info("meglevo exams.json frissitve (%d rekord)", len(payload["exams"]))
        except FileNotFoundError:
            pass

    out = write_exams_json(payload)

    # Feladat-szintu elemzes (1. fazistol). Reszleges futasnal is a TELJES
    # tasks.json-t frissitjuk, hogy a metrikak konzisztensek maradjanak.
    tasks_payload, task_warnings = build_tasks_json(selected)
    if not args.all and (args.period or args.level):
        try:
            old_tasks = load_tasks()["tasks"]
            keep = {t["exam_id"] for t in tasks_payload["tasks"]}
            merged = [t for t in old_tasks if t["exam_id"] not in keep] + tasks_payload["tasks"]
            tasks_payload["tasks"] = sorted(merged, key=lambda t: (t["exam_id"], t["task_no"]))
        except FileNotFoundError:
            pass
    write_tasks_json(tasks_payload)
    write_metrics(tasks_payload["tasks"])
    write_vocab_json()
    log.info(
        "feladatok: %d, tablazat-feladat: %d",
        len(tasks_payload["tasks"]),
        sum(1 for t in tasks_payload["tasks"] if "tablazat" in t["topics"]),
    )

    rep = write_report(payload, tasks=tasks_payload["tasks"], task_warnings=task_warnings)
    log.info("kesz %.1f mp: %s, %s", time.time() - t0, out, rep)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
