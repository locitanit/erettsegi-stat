"""tasks.json -> data/metrics/*.json + data/vocab.json.

Minden metrika **idoszakonkent** (vizsga-azonositonkent) bontva tarolodik, hogy a
frontend a csuszkaval kijelolt tartomanyra ujraszamolas nelkul osszegezhessen
(TERV 4.4). Egy uj idoszak = egy uj kulcs a fajlokban.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from . import __version__
from .config import DATA_DIR, METRICS_DIR
from .vocab_store import vocab_payload


def _add(target: dict[str, dict[str, int]], exam_id: str, counts: dict[str, int]) -> None:
    if not counts:
        return
    bucket = target.setdefault(exam_id, {})
    for key, n in counts.items():
        bucket[key] = bucket.get(key, 0) + n


def build_metrics(tasks: list[dict]) -> dict[str, dict]:
    """A metrika-fajlok tartalma nev -> adat formaban."""
    functions: dict[str, dict[str, int]] = {}
    pairs: dict[str, dict[str, int]] = {}
    skills: dict[str, dict[str, int]] = {}
    functions_xlsx: dict[str, dict[str, int]] = {}
    complexity: dict[str, dict] = {}
    titles: dict[str, list[dict]] = defaultdict(list)

    for task in tasks:
        exam_id = task["exam_id"]
        titles[exam_id].append(
            {"task_no": task["task_no"], "title": task["title"], "topics": task["topics"]}
        )
        feat = (task.get("features") or {}).get("tablazat")
        if not feat:
            continue
        _add(functions, exam_id, feat.get("functions", {}))
        _add(pairs, exam_id, feat.get("function_pairs", {}))
        _add(skills, exam_id, feat.get("skills", {}))
        if feat.get("xlsx"):
            _add(functions_xlsx, exam_id, feat["xlsx"].get("functions", {}))
        prev = complexity.get(exam_id, {})
        complexity[exam_id] = {
            "formula_count": prev.get("formula_count", 0) + feat.get("formula_count", 0),
            "formula_depth_max": max(
                prev.get("formula_depth_max", 0), feat.get("formula_depth_max", 0)
            ),
            "functions_per_formula_max": max(
                prev.get("functions_per_formula_max", 0),
                feat.get("functions_per_formula_max", 0),
            ),
        }

    sql_clauses: dict[str, dict[str, int]] = {}
    sql_clauses_files: dict[str, dict[str, int]] = {}
    db_complexity: dict[str, dict] = {}
    algorithms: dict[str, dict[str, int]] = {}
    prog_io: dict[str, dict[str, int]] = {}
    solution_langs: dict[str, dict[str, int]] = {}
    prog_shape: dict[str, dict] = {}

    for task in tasks:
        exam_id = task["exam_id"]
        feats = task.get("features") or {}

        db = feats.get("adatbazis")
        if db:
            _add(sql_clauses, exam_id, db.get("sql_clauses", {}))
            if db.get("sql"):
                _add(sql_clauses_files, exam_id, db["sql"].get("sql_clauses", {}))
            prev = db_complexity.get(exam_id, {})
            db_complexity[exam_id] = {
                "query_count": prev.get("query_count", 0) + db.get("query_count", 0),
                "subquery_count": prev.get("subquery_count", 0) + db.get("subquery_count", 0),
                "max_tables_per_query": max(
                    prev.get("max_tables_per_query", 0), db.get("max_tables_per_query", 0)
                ),
                "max_conditions": max(
                    prev.get("max_conditions", 0), db.get("max_conditions", 0)
                ),
            }

        prog = feats.get("programozas")
        if prog:
            _add(algorithms, exam_id, prog.get("algorithms", {}))
            _add(prog_io, exam_id, prog.get("io", {}))
            _add(solution_langs, exam_id, {lang: 1 for lang in prog.get("solution_langs", [])})
            prev = prog_shape.get(exam_id, {})
            prog_shape[exam_id] = {
                "subtask_count": max(
                    prev.get("subtask_count", 0), prog.get("subtask_count", 0)
                ),
                "input_rows": max(prev.get("input_rows", 0), prog.get("input_rows") or 0),
                "input_cols": max(prev.get("input_cols", 0), prog.get("input_cols") or 0),
                "feladatlap_words": max(
                    prev.get("feladatlap_words", 0), prog.get("feladatlap_words", 0)
                ),
            }

    return {
        "excel_functions.json": functions,
        "excel_function_pairs.json": pairs,
        "excel_functions_xlsx.json": functions_xlsx,
        "tablazat_skills.json": skills,
        "tablazat_complexity.json": complexity,
        "sql_clauses.json": sql_clauses,
        "sql_clauses_files.json": sql_clauses_files,
        "adatbazis_complexity.json": db_complexity,
        "algorithms.json": algorithms,
        "programozas_io.json": prog_io,
        "solution_langs.json": solution_langs,
        "programozas_shape.json": prog_shape,
        "task_titles.json": dict(titles),
    }


def write_metrics(tasks: list[dict], out_dir: Path | None = None) -> list[Path]:
    out_dir = out_dir or METRICS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for name, data in build_metrics(tasks).items():
        path = out_dir / name
        path.write_text(
            json.dumps(
                {"generated_by": f"extractor {__version__}", "by_exam": data},
                ensure_ascii=False,
                indent=0,
            )
            + "\n",
            encoding="utf-8",
        )
        written.append(path)
    return written


def write_vocab_json(out: Path | None = None) -> Path:
    out = out or (DATA_DIR / "vocab.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(vocab_payload(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    return out
