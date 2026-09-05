# -*- coding: utf-8 -*-
"""Pontszam-kinyeres a pontozotablabol."""
import pytest

from extractor.parsers.points import exam_total, read_scoring_sheet


def _sheet(tmp_path, rows):
    """Pontozotabla-szeru xlsx: (A, B, C) oszlopok."""
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(list(row))
    path = tmp_path / "ertekelo.xlsx"
    wb.save(str(path))
    return path


@pytest.fixture
def minta(tmp_path):
    rows = [
        (None, "Név:  osztály:", None),
        (None, "1. Az Árpád motorkocsi", None),
        (None, "Az oldal tulajdonságai", None),
        (0, "A dokumentum B5-ös méretű", 1),
        (0, "Valamennyi margó 1,6 cm-es", 1),
        (None, "Feladatpontok összesen:", 2),
        (None, "Vizsgapont: feladatpontok 25/33 része", 25),
        (None, None, None),
        (None, "2. Süti", None),
        (0, "A munkafüzetet suti néven mentette", 3),
        (None, "Összesen:", "3 pont"),
        (None, None, None),
        # zaro osszesito
        (None, "1. Az Árpád motorkocsi", 60),
        (None, "2. Süti", 40),
        (None, None, 100),
    ]
    return _sheet(tmp_path, rows)


def test_feladatpont_es_reszfeladatok(minta):
    tasks, warnings = read_scoring_sheet(minta)
    assert warnings == []
    assert set(tasks) == {"1", "2"}
    assert tasks["1"].points == 2
    assert tasks["1"].subtasks == [1, 1]
    assert tasks["2"].points == 3          # a "3 pont" szoveges cella is szam


def test_a_zaro_osszesito_adja_a_vizsgapontot(minta):
    """A tabla vegi osszesito eloso"bbseget elvez a "Vizsgapont" sorral szemben."""
    tasks, _ = read_scoring_sheet(minta)
    assert tasks["1"].exam_points == 60
    assert tasks["2"].exam_points == 40
    assert exam_total(tasks) == 100


def test_pontozasi_sor_nem_feladatfejlec(tmp_path):
    """A "3. lekérdezés ... 1 pont" sor nem indit uj feladatot."""
    path = _sheet(
        tmp_path,
        [
            (None, "1. Szógyakoriság", None),
            (0, "2ige500 lekérdezés", 1),
            (0, "3. lekérdezés helyes", 1),
            (None, "Összesen:", 2),
            (None, None, None),
            (None, "1. Szógyakoriság", 100),
            (None, "2. Másik", 20),
            (None, None, 120),
        ],
    )
    tasks, _ = read_scoring_sheet(path)
    assert "3" not in tasks
    assert tasks["1"].points == 2


def test_ab_valtozat_egyszer_szamit(tmp_path):
    """Az emelt 1A/1B a vizsgazo valasztasa: csak az egyik szamit."""
    path = _sheet(
        tmp_path,
        [
            (None, "1A. Garas Dezső", None),
            (0, "valami", 5),
            (None, "1B. Síparadicsomok", None),
            (0, "valami más", 7),
            (None, None, None),
            (None, "1A. Garas Dezső", 35),
            (None, "1B. Síparadicsomok", 35),
            (None, "2. Nyílt nap", 35),
            (None, "3. Könyvkiadás", 50),
            (None, None, 120),
        ],
    )
    tasks, _ = read_scoring_sheet(path)
    assert exam_total(tasks) == 120        # 35 + 35 + 50, nem 155


def test_serult_fajl_nem_dob_kivetelt(tmp_path):
    p = tmp_path / "romlott.xlsx"
    p.write_bytes(b"nem egy xlsx")
    tasks, warnings = read_scoring_sheet(p)
    assert tasks == {}
    assert warnings and "nem olvasható" in warnings[0]
