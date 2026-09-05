"""Feladat-rekordok eloallitasa (data/tasks.json).

Egy rekord = egy feladat egy vizsgan. A feladatok az utmutato-PDF szakaszaibol
jonnek (lasd split_utmutato), a temakor-hozzarendeles a feladatlap-PDF nevebol.

A 3. fazis vegen mind a hat temakor kap `features` mezot. A pontszamok a
pontozotabla xlsx-bo"l jonnek (lasd parsers/points.py), nem a PDF-bo"l.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import __version__
from .build_exams import pick_utmutato
from .config import DATA_DIR
from .discover import Exam
from .parsers import adatbazis as adatbazis_parser
from .parsers import points as points_parser
from .parsers import szoveg as szoveg_parser
from .parsers import weblap as weblap_parser
from .parsers import programozas as programozas_parser
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


def _points_fields(tp: points_parser.TaskPoints | None) -> dict:
    """A feladat pontszam-mezoi. Ha nincs pontozotabla, minden None."""
    if tp is None:
        return {"points": None, "exam_points": None, "subtask_count": None,
                "subtask_points": []}
    d = tp.as_dict()
    return {
        "points": d["points"],
        "exam_points": d["exam_points"],
        "subtask_count": d["subtask_count"],
        "subtask_points": d["subtask_points"],
    }


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

    # Pontszamok a pontozotablabol. Csak akkor hasznaljuk, ha a vizsga osszpontszama
    # a hivatalos 100 (kozep) vagy 120 (emelt) - kulonben elrontottuk az olvasast.
    task_points, wp = points_parser.read_exam_points(exam.scoring_sheets)
    warnings += wp
    total = points_parser.exam_total(task_points)
    if task_points and total not in (100, 120):
        warnings.append(f"a pontozótábla összpontszáma {total}, nem 100 vagy 120 – a pontok kimaradnak")
        task_points = {}

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

        if "szoveg" in topics:
            features["szoveg"] = {"ops": szoveg_parser.text_ops(s.text)}
            provenance["features_from"].append("utmutato")

        if "prezentacio" in topics or "prezentacio_grafika" in topics:
            features["prezentacio"] = {"ops": szoveg_parser.presentation_ops(s.text)}
            provenance["features_from"].append("utmutato")

        if "weblap" in topics:
            web_files = [
                p
                for p in exam.all_solution_files
                if p.suffix.lower() in {".html", ".htm", ".css"}
            ]
            web_stats, web_warn = weblap_parser.from_solution_files(web_files)
            task_warnings += web_warn
            features["weblap"] = {
                **web_stats.as_dict(),
                "ops": weblap_parser.from_utmutato(s.text),
            }
            provenance["features_from"].append("utmutato")
            if web_stats.page_count:
                provenance["features_from"].append("html")
            else:
                task_warnings.append("a weblap-feladathoz nincs HTML mintamegoldás")

        if "adatbazis" in topics:
            stats, queries = adatbazis_parser.from_utmutato(s.text)
            sql_files = [p for p in exam.all_solution_files if p.suffix.lower() == ".sql"]
            sql_stats, sql_warn = adatbazis_parser.from_sql_files(sql_files)
            task_warnings += sql_warn

            features["adatbazis"] = {
                **stats.as_dict(),
                "sql": sql_stats.as_dict() if sql_stats.query_count else None,
            }
            if stats.query_count:
                provenance["features_from"].append("utmutato")
            else:
                task_warnings.append("az adatbázis-feladatban egy lekérdezés sem található")
            if sql_stats.query_count:
                provenance["features_from"].append("sql")
            del queries        # a lekerdezes szovege nem kerul a kimenetbe (szerzoi jog)

        if "programozas" in topics:
            tf = exam.topics["programozas"]
            feladatlap_text = "\n".join(extract(p).text for p in tf.feladatlap_pdfs)
            stats = programozas_parser.analyse(
                s.text, feladatlap_text, tf.forras_files, exam.all_solution_files
            )
            features["programozas"] = {
                **stats.as_dict(),
                "feladatlap_words": word_count(feladatlap_text),
            }
            provenance["features_from"].append("utmutato+feladatlap")
            if not stats.algorithms:
                task_warnings.append(
                    "a programozás-feladatban egy típusalgoritmus-kulcsszó sem található"
                )

        if "tablazat" in topics:
            stats, skills = tablazat_parser.from_utmutato(s.text)
            xlsx = [p for p in exam.all_solution_files if p.suffix.lower() == ".xlsx"]
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
                **_points_fields(task_points.get(s.task_no)),
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
