# -*- coding: utf-8 -*-
"""Weblap-elemzes, kulcsszo-szotarak es pontszam-kinyeres."""
from pathlib import Path

import pytest

from extractor.parsers.szoveg import presentation_ops, text_ops
from extractor.parsers.weblap import from_solution_files, from_utmutato

HTML = """<!doctype html>
<html><head><title>Oldal</title><style>body { color: red; }</style></head>
<body>
  <h1>Cím</h1>
  <p class="lead">Bekezdés</p>
  <ul><li>egy</li><li>kettő</li></ul>
  <table><tr><td>a</td><td>b</td></tr></table>
  <img src="kep.jpg" alt="kép">
  <a href="masik.html">tovább</a>
</body></html>
"""

CSS = """
.lead { font-size: 14px; color: blue; }
#fejlec { background-color: #eee; }
h1, h2 { margin: 0; }
a:hover { text-decoration: underline; }
"""


@pytest.fixture
def web_files(tmp_path):
    (tmp_path / "index.html").write_text(HTML, encoding="utf-8")
    (tmp_path / "stilus.css").write_text(CSS, encoding="utf-8")
    return [tmp_path / "index.html", tmp_path / "stilus.css"]


def test_html_elemek(web_files):
    stats, warnings = from_solution_files(web_files)
    assert warnings == []
    assert stats.page_count == 1
    assert stats.css_file_count == 1
    assert stats.html_tags["p"] == 1
    assert stats.html_tags["li"] == 2
    assert stats.html_tags["td"] == 2
    # a szerkezeti elemek nem szamitanak
    assert "html" not in stats.html_tags
    assert "meta" not in stats.html_tags


def test_css_tulajdonsagok_es_kijelolok(web_files):
    stats, _ = from_solution_files(web_files)
    assert stats.css_props["color"] == 2          # a beagyazott <style> is szamit
    assert stats.css_props["background-color"] == 1
    assert stats.selector_types["osztaly"] == 1
    assert stats.selector_types["id"] == 1
    assert stats.selector_types["pszeudo"] == 1


def test_keretrendszer_nem_szamit_bele(tmp_path):
    """A Bootstrap tobb ezer szabalya elnyomna a valodi adatot (TERV 2.5)."""
    (tmp_path / "bootstrap.min.css").write_text(".btn{color:red}" * 500, encoding="utf-8")
    (tmp_path / "sajat.css").write_text(".fo { color: blue; }", encoding="utf-8")
    stats, _ = from_solution_files([tmp_path / "bootstrap.min.css", tmp_path / "sajat.css"])
    assert stats.css_file_count == 1
    assert stats.rule_count == 1
    assert "bootstrap" in stats.frameworks


def test_tul_nagy_css_keretrendszernek_szamit(tmp_path):
    p = tmp_path / "stilus.css"
    p.write_text(".a{color:red}" * 6000, encoding="utf-8")
    stats, _ = from_solution_files([p])
    assert stats.css_file_count == 0
    assert stats.frameworks == ["stilus.css"]


def test_weblap_keszsegek():
    ops = from_utmutato(
        "Külső stíluslapot csatolt a laphoz. Az űrlapon beviteli mező szerepel."
    )
    assert "kulso_css" in ops
    assert "urlap" in ops


def test_szovegszerkesztes_kulcsszavak():
    ops = text_ops(
        "Elkészítette a tartalomjegyzéket. A lábjegyzet jó helyen van. "
        "A bekezdések sorkizártak, a betűméret 12 pontos."
    )
    assert "tartalomjegyzek" in ops
    assert "labjegyzet" in ops
    assert "bekezdesformazas" in ops
    assert "betuformazas" in ops


def test_prezentacio_es_grafika_kulcsszavak():
    ops = presentation_ops(
        "A diaminta tartalmazza a képet. Az áttűnés minden diára beállítva. "
        "A vektorgrafikus ábrát SVG formátumban exportálta."
    )
    assert "diaminta" in ops
    assert "attunes" in ops
    assert "vektorgrafika" in ops
    assert "export" in ops
