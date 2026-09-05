# -*- coding: utf-8 -*-
"""Idoszak-nev ertelmezes."""
from extractor.periods import parse_period


def test_egyszeru():
    p = parse_period("2025 május")
    assert (p.year, p.month, p.variant, p.subject) == (2025, 5, "normal", "digitalis_kultura")
    assert p.exam_id("kozep") == "2025m_kozep_dk"


def test_idegen_es_informatika():
    p = parse_period("2023 május (idegen) (informatika)")
    assert p.variant == "idegen"
    assert p.subject == "informatika"
    assert p.exam_id("emelt") == "2023m_emelt_inf_id"


def test_februar_es_regi_ev():
    p = parse_period("2006 február")
    assert (p.month, p.subject) == (2, "informatika")
    assert p.exam_id("kozep") == "2006f_kozep_inf"


def test_oktober():
    assert parse_period("2024 október").exam_id("emelt") == "2024o_emelt_dk"


def test_ervenytelen():
    assert parse_period("valami más") is None
    assert parse_period("2020 karácsony") is None


def test_sorrend():
    nevek = ["2026 május", "2005 május", "2022 október", "2022 május (idegen)", "2022 május"]
    rendezve = [parse_period(n).raw for n in sorted(nevek, key=lambda n: parse_period(n).sort_key)]
    assert rendezve == ["2005 május", "2022 május", "2022 május (idegen)", "2022 október", "2026 május"]
