# -*- coding: utf-8 -*-
"""Az utmutato-vagas mintaszovegeken (nem PDF-en)."""
from extractor.split_utmutato import match_topics, split


def _doc(headers: list[str], body_lines: int = 40) -> str:
    """Utmutato-szeru szoveg: fejlec + toltelek."""
    out: list[str] = ["Fontos tudnivalók", ""]
    for h in headers:
        out.append(h)
        out += [f"Valamilyen pontozási sor {i}                    1 pont" for i in range(body_lines)]
    return "\n".join(out)


def test_egyszeru_vagas():
    text = _doc(["1. Komárom", "2. Vetélkedő", "3. Taxi"])
    sections, warnings = split(text, expected=3)
    assert [s.task_no for s in sections] == ["1", "2", "3"]
    assert [s.title for s in sections] == ["Komárom", "Vetélkedő", "Taxi"]
    assert warnings == []


def test_pont_a_fejlec_vegen():
    """A keretezes miatt a fejlec soraba csuszhat a pontszam."""
    text = _doc(["1. Süti                                              1 pont", "2. Kihívás"])
    sections, _ = split(text, expected=2)
    assert [s.title for s in sections] == ["Süti", "Kihívás"]


def test_emelt_alszamok():
    text = _doc(["1A. Garas Dezső", "1B. Síparadicsomok", "2. Nyílt nap"])
    sections, _ = split(text, expected=3)
    assert [s.task_no for s in sections] == ["1A", "1B", "2"]

    text = _doc(["1.A Robotikaszakkör logó", "1.B Dobogókő", "2. Állóképesség"])
    sections, _ = split(text, expected=3)
    assert [s.task_no for s in sections] == ["1A", "1B", "2"]


def test_alszam_pont_nelkul():
    """A 2010-es utmutato "2A Virusok" alakot hasznal, pont nelkul."""
    text = _doc(["1. Komárom", "2A Vírusok", "2B Környezetbarát", "3. Vetélkedő"])
    sections, warnings = split(text, expected=4)
    assert [s.task_no for s in sections] == ["1", "2A", "2B", "3"]
    assert [s.title for s in sections] == ["Komárom", "Vírusok", "Környezetbarát", "Vetélkedő"]
    assert warnings == []


def test_kisbetus_cim():
    text = _doc(["1. Fibonacci-sorozat", "2. eUtazás"])
    sections, _ = split(text, expected=2)
    assert [s.title for s in sections] == ["Fibonacci-sorozat", "eUtazás"]


def test_tartalomjegyzeket_es_ertekelolapot_atugorja():
    """A fejlecek harom helyen szerepelnek; a hosszu szakaszokat kell valasztani."""
    toc = "1. Balatoni komp\n2. Parlagfű\n3. Fogyasztás\n"
    body = _doc(["1. Balatoni komp", "2. Parlagfű", "3. Fogyasztás"])
    tail = "\n1. Balatoni komp\n2. Parlagfű\n3. Fogyasztás\n"
    sections, warnings = split(toc + body + tail, expected=3)
    assert warnings == []
    # A torzsbol kell vagnia: minden szakasz hosszu.
    assert all(len(s.lines) > 20 for s in sections)


def test_temakor_cim_szerint():
    text = _doc(["1. Ikarus", "2. Pénzfeldobás"])
    sections, _ = split(text, expected=2)
    mapping, method, warnings = match_topics(
        sections,
        {"szoveg": ["Ikarus"], "tablazat": ["Pénzfeldobás"]},
        ["szoveg", "tablazat"],
    )
    assert mapping == {"1": ["szoveg"], "2": ["tablazat"]}
    assert method == {"1": "cim", "2": "cim"}
    assert warnings == []


def test_temakor_nevelo_nelkul_is_egyezik():
    text = _doc(["1. Az Árpád motorkocsi"])
    sections, _ = split(text, expected=1)
    mapping, method, _ = match_topics(sections, {"szoveg": ["Árpád-motorkocsi"]}, ["szoveg"])
    assert mapping == {"1": ["szoveg"]}
    assert method["1"] == "cim"


def test_temakor_sorrend_szerint_kozos_feladatlappal():
    """Ket temakor egy feladatlap-PDF-en = EGY feladat (2009 emelt: szoveg + weblap)."""
    text = _doc(["1. Egyik", "2. Másik", "3. Harmadik"])
    sections, _ = split(text, expected=3)
    mapping, method, warnings = match_topics(
        sections,
        {
            "szoveg": ["e_szov_web_2009_maj"],
            "weblap": ["e_szov_web_2009_maj"],
            "tablazat": ["e_tabl_2009_maj"],
            "adatbazis": ["e_ab_2009_maj"],
        },
        ["szoveg", "weblap", "tablazat", "adatbazis"],
    )
    assert mapping == {"1": ["szoveg", "weblap"], "2": ["tablazat"], "3": ["adatbazis"]}
    assert method["1"] == "sorrend"
    assert warnings == []


def test_hianyzo_szakasz_figyelmeztet():
    text = _doc(["1. Egyik", "2. Másik"])
    sections, warnings = split(text, expected=4)
    assert len(sections) == 2
    assert any("4 feladat várható" in w for w in warnings)
