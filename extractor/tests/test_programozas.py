# -*- coding: utf-8 -*-
"""Programozas-elemzo: reszfeladatszam, nyelvek, forrasadat, kulcsszavak."""
from pathlib import Path

from extractor.parsers.programozas import (
    analyse,
    count_subtasks,
    solution_languages,
    source_shape,
)


def test_reszfeladatok_szamlalasa():
    text = """Készítsen programot, amely megoldja az alábbi feladatokat!
1. Olvassa be az állományt!
2. Írja ki a képernyőre a darabszámot!
3. Határozza meg a legnagyobb értéket!
5. Ez a szám kimarad, mert a 4. hiányzik.
"""
    assert count_subtasks(text) == 3


def test_reszfeladat_nulla_ha_nincs_szamozas():
    assert count_subtasks("Csak folyó szöveg, számozás nélkül.") == 0


def test_megoldas_nyelvek():
    paths = [Path("konyvek.cs"), Path("konyvek.py"), Path("stilus.css"), Path("oldal.js")]
    # a .css es a .js a weblap-feladate, nem programozasi nyelv
    assert solution_languages(paths) == ["C#", "Python"]


def test_forras_txt_alakja(tmp_path):
    p = tmp_path / "kiadas.txt"
    p.write_text(
        "\n".join(f"2020;{i};ma;Cím {i};10000" for i in range(1, 21)),
        encoding="utf-8",
    )
    rows, cols, sep = source_shape([p])
    assert (rows, cols, sep) == (20, 5, "pontosvessző")


def test_forras_egysoros_fajl(tmp_path):
    p = tmp_path / "dobasok.txt"
    p.write_text("3, 1, 1, 2, 1, 5", encoding="utf-8")
    rows, cols, _sep = source_shape([p])
    assert (rows, cols) == (1, 6)


def test_forras_zipbol(tmp_path):
    import zipfile

    z = tmp_path / "kiadas.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("kiadas.txt", "\n".join("a\tb\tc" for _ in range(12)))
    rows, cols, sep = source_shape([z])
    assert (rows, cols, sep) == (12, 3, "tabulátor")


def test_kulcsszavak(tmp_path):
    feladatlap = """A kiadas.txt szöveges állományban adatok szerepelnek.
1. Olvassa be az állományt!
2. Bekérte a felhasználótól a szerző nevét, majd megszámolta a kiadásokat!
3. Határozza meg a legnagyobb példányszámot!
"""
    utmutato = "Megjelenítette a képernyőn az eredményt. Az állományba írta a listát."
    st = analyse(utmutato, feladatlap, [], [Path("mo.py")])
    assert st.subtask_count == 3
    assert st.solution_langs == ["Python"]
    assert "megszamlalas" in st.algorithms
    assert "maximumkivalasztas" in st.algorithms
    assert "fajlkezeles" in st.algorithms
    assert st.io["kbd_in"] >= 1
    assert st.io["screen_out"] >= 1
    assert st.io["file_out"] >= 1
