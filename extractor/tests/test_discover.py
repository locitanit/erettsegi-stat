# -*- coding: utf-8 -*-
"""Felderites es kizarasi szabalyok - mintafajlstrukturan, PDF nelkul."""
import json

import pytest

from extractor.build_exams import build_exams_json
from extractor.discover import discover, is_excluded, is_scoring_sheet


def test_kizarasok():
    assert is_excluded("e_infoism_24maj_ut.pdf")
    assert is_excluded("Informatika_ism_kozep_gyakorlati_javitasi.xlsx")
    assert is_excluded("e_autorep_12maj_ut.pdf")
    assert not is_excluded("k_digkult_25maj_ut.pdf")


def test_pontozotabla_nem_megoldas():
    assert is_scoring_sheet("Digitalis_kultura_kozep_gyakorlati_ertekelo_2413.xlsx")
    assert is_scoring_sheet("k_infoertekelolap_11maj_ut.pdf")
    assert not is_scoring_sheet("suti.xlsx")


@pytest.fixture
def minta_storage(tmp_path):
    """Ket vizsga, ket temakor, egy kizarando targy."""
    root = tmp_path / "dig_kult_erettsegi"
    (root / "kozep" / "tablazat" / "2025 május" / "feladatlap").mkdir(parents=True)
    (root / "kozep" / "tablazat" / "2025 május" / "javitasi_utmutato" / "3_Suti").mkdir(parents=True)
    (root / "kozep" / "adatbazis" / "2025 május" / "feladatlap").mkdir(parents=True)
    (root / "emelt" / "tablazat" / "2019 május (idegen)" / "feladatlap").mkdir(parents=True)

    b = root / "kozep" / "tablazat" / "2025 május"
    (b / "feladatlap" / "Süti.pdf").write_bytes(b"%PDF-1.4\n")
    (b / "feladatlap" / "suti.txt").write_text("adat", encoding="utf-8")
    (b / "javitasi_utmutato" / "k_digkult_25maj_ut.pdf").write_bytes(b"%PDF-1.4\n")
    (b / "javitasi_utmutato" / "k_infoism_25maj_ut.pdf").write_bytes(b"%PDF-1.4\n")
    (b / "javitasi_utmutato" / "Digitalis_kultura_kozep_gyakorlati_ertekelo_2413.xlsx").write_text("x")
    (b / "javitasi_utmutato" / "3_Suti" / "suti.xlsx").write_text("x")

    (root / "kozep" / "adatbazis" / "2025 május" / "feladatlap" / "Adat.pdf").write_bytes(b"%PDF-1.4\n")
    (root / "emelt" / "tablazat" / "2019 május (idegen)" / "feladatlap" / "X.pdf").write_bytes(b"%PDF-1.4\n")

    (root / "download_dig_kult_erettsegi_state.json").write_text(
        json.dumps({"topic_order": {"kozep/2025 május": ["tablazat", "adatbazis"]}}, ensure_ascii=False),
        encoding="utf-8",
    )
    return root


def test_felderites(minta_storage):
    exams = {e.id: e for e in discover(minta_storage)}
    assert set(exams) == {"2025m_kozep_dk", "2019m_emelt_inf_id"}

    e = exams["2025m_kozep_dk"]
    assert set(e.topics) == {"tablazat", "adatbazis"}
    tf = e.topics["tablazat"]
    # az infoism utmutato es az ertekelo xlsx nem kerul be
    assert [p.name for p in tf.utmutato_pdfs] == ["k_digkult_25maj_ut.pdf"]
    assert [p.name for p in tf.solution_files] == ["suti.xlsx"]
    assert [p.name for p in tf.forras_files] == ["suti.txt"]


def test_exams_json_mezoi(minta_storage):
    payload = build_exams_json(discover(minta_storage), minta_storage, with_text=False)
    rec = {r["id"]: r for r in payload["exams"]}["2025m_kozep_dk"]
    assert rec["level"] == "kozep"
    assert rec["subject"] == "digitalis_kultura"
    assert rec["has"]["utmutato"] is True
    assert rec["has"]["megoldas_xlsx"] is True
    assert rec["topics"] == ["tablazat", "adatbazis"]      # topic_order szerinti sorrend
    assert rec["source_types"] == {"txt": 1}
