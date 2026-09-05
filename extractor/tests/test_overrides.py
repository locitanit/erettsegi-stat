# -*- coding: utf-8 -*-
"""Kezi javitasok betoltese es alkalmazasa."""
import pytest

from extractor.overrides import load, override_filename
from extractor.periods import parse_period
from extractor.split_utmutato import split


def _write(directory, name, text):
    (directory / name).write_text(text, encoding="utf-8")


def test_fajlnev_kepzes():
    assert override_filename(parse_period("2010 május"), "kozep") == "2010_majus_kozep.yaml"
    assert (
        override_filename(parse_period("2023 október (idegen)"), "emelt")
        == "2023_oktober_emelt_idegen.yaml"
    )
    assert (
        override_filename(parse_period("2022 május (informatika)"), "kozep")
        == "2022_majus_kozep_informatika.yaml"
    )


def test_nincs_fajl_ures_override(tmp_path):
    o = load(parse_period("2010 május"), "kozep", tmp_path)
    assert o.is_empty
    assert o.applied_fields() == []


def test_mezok_betoltese(tmp_path):
    _write(
        tmp_path,
        "2010_majus_kozep.yaml",
        """
notes: "Más a számozás."
section_starts:
  "2": "2A Vírusok"
task_topics:
  "3": [tablazat]
task_points:
  "2": 20
skip_tasks: ["6"]
exclude:
  - "regi.xlsx"
""",
    )
    o = load(parse_period("2010 május"), "kozep", tmp_path)
    assert o.notes == "Más a számozás."
    assert o.section_starts == {"2": "2A Vírusok"}
    assert o.task_topics == {"3": ["tablazat"]}
    assert o.task_points == {"2": 20}
    assert o.skip_tasks == ["6"]
    assert sorted(o.applied_fields()) == [
        "exclude", "notes", "section_starts", "skip_tasks", "task_points", "task_topics",
    ]


def test_exclude_ekezet_es_kisbetu_fuggetlen(tmp_path):
    _write(tmp_path, "2010_majus_kozep.yaml", 'exclude: ["Régi Változat"]')
    o = load(parse_period("2010 május"), "kozep", tmp_path)
    assert o.excludes("REGI_valtozat.xlsx") is False        # a szokoz szamit
    assert o.excludes("valami-Régi Változat-2.xlsx") is True
    assert o.excludes("mas.xlsx") is False


def test_romlott_yaml_nem_dob_kivetelt(tmp_path):
    _write(tmp_path, "2010_majus_kozep.yaml", "ez: [nem: zarodik")
    o = load(parse_period("2010 május"), "kozep", tmp_path)
    assert o.is_empty


@pytest.fixture
def doc():
    """Utmutato, amelyben a 2. feladat fejlece felismerhetetlen."""
    lines = ["Fontos tudnivalók", ""]
    lines.append("1. Komárom")
    lines += [f"Pontozási sor {i}     1 pont" for i in range(40)]
    lines.append("+++ ismeretlen alakú fejléc: Vírusok +++")
    lines += [f"Másik pontozási sor {i}     1 pont" for i in range(40)]
    lines.append("3. Vetélkedő")
    lines += [f"Harmadik sor {i}     1 pont" for i in range(40)]
    return "\n".join(lines)


def test_anchor_felvesz_egy_fel_nem_ismert_szakaszt(doc):
    nelkule, _ = split(doc, expected=3)
    assert [s.task_no for s in nelkule] == ["1", "3"]

    sections, warnings = split(doc, expected=3, anchors={"2": "ismeretlen alakú fejléc"})
    assert [s.task_no for s in sections] == ["1", "2", "3"]
    assert "Vírusok" in sections[1].title
    assert warnings == []


def test_anchor_hibas_szovegre_figyelmeztet(doc):
    _sections, warnings = split(doc, expected=3, anchors={"2": "ilyen nincs a szövegben"})
    assert any("nem található" in w for w in warnings)


def test_anchor_felulirja_az_automatikus_talalatot(doc):
    sections, _ = split(doc, expected=3, anchors={"3": "Harmadik sor 5"})
    third = next(s for s in sections if s.task_no == "3")
    assert third.title.startswith("Harmadik sor 5")
