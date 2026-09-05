# -*- coding: utf-8 -*-
"""Fuggveny-kinyeres es szotar."""
from extractor.discover import is_scoring_sheet
from extractor.parsers.common import formula_candidates, max_paren_depth
from extractor.parsers.tablazat import _tokens, analyse_formulas, from_utmutato
from extractor.vocab_store import load_functions


def test_szotar_alias():
    fns = load_functions()
    assert fns.canonical("SUMIF") == "SZUMHA"
    assert fns.canonical("szumha") == "SZUMHA"
    assert fns.canonical("XLOOKUP") == "XKERES"
    assert fns.canonical("COUNTIF") == "DARABTELI"
    # regi es Google Sheets-es nevek
    assert fns.canonical("DARABHA") == "DARABTELI"
    assert fns.canonical("KEREK") == "KEREKÍTÉS"
    assert fns.canonical("PERCEK") == "PERC"
    assert fns.canonical("LOOKUP") == "KUTAT"
    assert fns.canonical("NINCSILYEN") is None


def test_beagyazott_fuggvenyeket_is_szamolja():
    """TERV 1.2/5: minden NÉV( token szamit, zarojel-melysegtol fuggetlenul."""
    known, unknown = _tokens("=INDEX(G1:M1;HOL.VAN(MAX(G17:M17);G17:M17;0))")
    assert known == ["INDEX", "HOL.VAN", "MAX"]
    assert unknown == []


def test_cellahivatkozas_nem_fuggveny():
    known, unknown = _tokens("=B3 (ekkor a C22-es cella üres)")
    assert known == [] and unknown == []


def test_sql_kulcsszo_nem_fuggveny():
    known, unknown = _tokens('=SELECT (a) FROM (b) WHERE (c)')
    assert known == [] and unknown == []


def test_ismeretlen_nev_nem_vesz_el():
    known, unknown = _tokens("=VALAMIÚJ(A1:A5)")
    assert known == []
    assert unknown == ["VALAMIÚJ"]


def test_keplet_jeloltek_csak_a_megfelelo_sorokbol():
    text = "\n".join(
        [
            "A lap háttérszíne RGB (222, 230, 238) színkódú halványkék      1 pont",
            "F2-es cellában: =B2/D2",
            "B17-es cellában vagy segédcellában: MAX(G17:M17)",
            "A képlet hibamentesen másolható                                1 pont",
        ]
    )
    got = formula_candidates(text)
    assert got == ["=B2/D2", "MAX(G17:M17)"]


def test_szinkod_nem_szamit_fuggvenynek():
    stats, _ = from_utmutato("A lap háttérszíne RGB (222, 230, 238) színkódú")
    assert stats.formula_count == 0
    assert dict(stats.functions) == {}


def test_statisztika_es_parok():
    stats = analyse_formulas(
        [
            "=INDEX(A1:A9;HOL.VAN(MAX(B1:B9);B1:B9;0))",
            "=SZUM(A1:A9)",
            "=HA(SZUM(A1:A9)>0;1;0)",
        ]
    )
    assert stats.formula_count == 3
    assert stats.functions["SZUM"] == 2          # ket kepletben szerepel
    assert stats.functions["INDEX"] == 1
    assert stats.pairs["HA+SZUM"] == 1
    assert stats.pairs["HOL.VAN+INDEX"] == 1
    assert stats.depth_max == 3
    assert stats.functions_per_formula_max == 3


def test_ugyanaz_a_fuggveny_ketszer_egy_kepletben_egyszer_szamit():
    stats = analyse_formulas(["=SZUM(SZUM(A1:A2);SZUM(B1:B2))"])
    assert stats.functions["SZUM"] == 1
    assert stats.formula_count == 1


def test_melyseg():
    assert max_paren_depth("=SZUM(A1:A2)") == 1
    assert max_paren_depth("=HA(ÉS(A>1;B<2);1;0)") == 2


def test_pontozotabla_kizarva():
    """TERV 9: a pontozo xlsx csupa SZUM, nem mintamegoldas."""
    assert is_scoring_sheet("e_inf_19maj_ut.xlsx")
    assert is_scoring_sheet("k_digkult_25maj_ut.xlsx")
    assert not is_scoring_sheet("triatlon.xlsx")
