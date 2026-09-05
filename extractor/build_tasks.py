"""Feladat-rekordok eloallitasa (data/tasks.json).

Egy rekord = egy feladat egy vizsgan. A feladatok az utmutato-PDF szakaszaibol
jonnek (lasd split_utmutato), a temakor-hozzarendeles a feladatlap-PDF nevebol.

Az 1. fazisban csak a tablazatkezeles-feladatok kapnak `features` mezot; a tobbi
temakor rekordja letrejon (cim, temakor, forras- es megoldasfajlok), de az elemzes
a kesobbi fazisokban keszul el.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import __version__
from .build_exams import pick_utmutato
from .config import DATA_DIR
from .discover import Exam
from .parsers import tablazat as tablazat_parser
from .parsers.common import word_count
from .pdf_text import extract
from .split_utmutato import match_topics, split


def _source_records(exam: Exam, topics: list[str]) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    for t in topics:
        tf = exam.topics.get(t)
        if not tf:
            continue
        for p in tf.forras_files:
            if p.name in seen:
                continue
            seen.add(p.name)
            out.append({"name": p.name, "type": p.suffix.lower().lstrip(".")})
    return out


def _solution_records(exam: Exam, topics: list[str]) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    for t in topics:
        tf = exam.topics.get(t)
        if not tf:
            continue
        for p in tf.solution_files:
            if p.name in seen:
                continue
            seen.add(p.name)
            out.append({"name": p.name, "type": p.suffix.lower().lstrip(".")})
    return out


def build_exam_tasks(exam: Exam) -> tuple[list[dict], list[str]]:
    """Egy vizsga feladat-rekordjai + vizsgaszintu figyelmeztetesek."""
    warnings: list[str] = []
    utmutato, w = pick_utmutato(exam)
    warnings += w
    if utmutato is None:
        return [], warnings

    text = extract(utmutato).text
    topic_files = {t: [p.stem for p in exam.topics[t].feladatlap_pdfs] for t in exam.exam_topics}
    expected = len({n for names in topic_files.values() for n in names})
    sections, w2 = split(text, expected)
    warnings += w2
    if not sections:
        return [], warnings

    mapping, method, w3 = match_topics(sections, topic_files, exam.exam_topics)
    warnings += w3

    tasks: list[dict] = []
    for s in sections:
        topics = mapping.get(s.task_no, [])
        features: dict = {}
        task_warnings: list[str] = []
        provenance = {
            "topics_from": method.get(s.task_no, "sorrend"),
            "utmutato": utmutato.name,
            "features_from": [],
        }

        if "tablazat" in topics:
            stats, skills = tablazat_parser.from_utmutato(s.text)
            xlsx = [
                p
                for p in exam.topics["tablazat"].solution_files
                if p.suffix.lower() == ".xlsx"
            ]
            xstats, xwarn = tablazat_parser.from_xlsx(xlsx)
            task_warnings += xwarn

            features["tablazat"] = {
                **stats.as_dict(),
                "skills": skills,
                "xlsx": xstats.as_dict() if xstats.formula_count else None,
            }
            if stats.formula_count:
                provenance["features_from"].append("utmutato")
            else:
                task_warnings.append("a táblázatkezelés-feladatban egy képlet sem található")
            if xstats.formula_count:
                provenance["features_from"].append("xlsx")
            if stats.unknown:
                task_warnings.append(
                    "ismeretlen függvénynév: " + ", ".join(sorted(stats.unknown))
                )

        tasks.append(
            {
                "id": f"{exam.id}_{s.task_no}",
                "exam_id": exam.id,
                "task_no": s.task_no,
                "title": s.title,
                "topics": topics,
                "points": None,          # a 2. fazistol
                "text_stats": {"utmutato_words": word_count(s.text)},
                "sources": _source_records(exam, topics),
                "solutions": _solution_records(exam, topics),
                "features": features,
                "provenance": provenance,
                "warnings": task_warnings,
            }
        )
    return tasks, warnings


def build_tasks_json(exams: list[Exam]) -> tuple[dict, dict[str, list[str]]]:
    """tasks.json + vizsgankenti figyelmeztetesek.

    Az idegen nyelvu vizsgak kimaradnak az elemzesbo"l (a tanar dontese): a
    storage-ban nincs sajat nyelvu utmutatojuk, igy a magyar valtozat szamait
    duplaznak meg.
    """
    all_tasks: list[dict] = []
    exam_warnings: dict[str, list[str]] = {}
    for exam in exams:
        if exam.period.variant == "idegen":
            continue
        tasks, warnings = build_exam_tasks(exam)
        all_tasks += tasks
        if warnings:
            exam_warnings[exam.id] = warnings
    payload = {
        "generated_by": f"extractor {__version__}",
        "tasks": all_tasks,
    }
    return payload, exam_warnings


def write_tasks_json(payload: dict, out: Path | None = None) -> Path:
    out = out or (DATA_DIR / "tasks.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return out
