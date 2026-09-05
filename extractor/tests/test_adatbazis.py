# -*- coding: utf-8 -*-
"""SQL-kinyeres es -elemzes mintaszovegeken."""
from extractor.parsers.adatbazis import analyse_queries, extract_queries


UTMUTATO = """2ige500 lekérdezés
Helyesen szűrt a szófajra                                      1 pont
Például:
          SELECT szoto
          FROM szavak
          WHERE szofaj="ige"
          AND gyakori>=500000;
3brmellek lekérdezés
A teljes feltétel helyes
Például:
          SELECT szoto, gyakori
          FROM szavak
          WHERE szoto Like "br*";
"""


def test_tobbsoros_lekerdezes_osszefuzese():
    got = extract_queries(UTMUTATO)
    assert len(got) == 2
    assert got[0].startswith("SELECT szoto FROM szavak WHERE")
    assert "AND gyakori>=500000" in got[0]
    assert ";" not in got[0]


def test_oldalfejlec_nem_szakitja_ket_a_lekerdezest():
    text = """Például:
          SELECT nev, kor
Digitális kultúra                           9 / 11  középszintű gyakorlati vizsga
K2413                                                       2025. május 12.
          FROM tagok
          WHERE kor>18;
"""
    got = extract_queries(text)
    assert len(got) == 1
    assert "FROM tagok" in got[0]
    assert "Digitális" not in got[0]


def test_proza_nem_kerul_a_lekerdezesbe():
    text = """SELECT nev FROM tagok
A pont nem adható meg, ha nem megfelelő relációt használt.
"""
    got = extract_queries(text)
    assert got == ["SELECT nev FROM tagok"]


def test_zaradekok_szamlalasa():
    st = analyse_queries(
        [
            'SELECT DISTINCT nev FROM tagok WHERE kor>18 ORDER BY nev DESC',
            'SELECT szofaj, Count(*) AS darab FROM szavak GROUP BY szofaj HAVING Count(*)>5',
        ]
    )
    assert st.query_count == 2
    assert st.clauses["distinct"] == 1
    assert st.clauses["order_by"] == 1
    assert st.clauses["group_by"] == 1
    assert st.clauses["having"] == 1
    assert st.clauses["fn_count"] == 1     # egy lekerdezesben szerepel


def test_allekerdezes_felismerese():
    st = analyse_queries(
        ["SELECT nev FROM urhajos WHERE urido=(SELECT Max(urido) FROM urhajos WHERE nem='N')"]
    )
    assert st.subquery_count == 1
    assert st.clauses["subquery"] == 1


def test_tablaszam_es_feltetelszam():
    st = analyse_queries(
        ["SELECT a.x FROM film, eloadas, mozi WHERE film.id=eloadas.fid AND mozi.id=1 OR x>2"]
    )
    assert st.max_tables_per_query == 3
    assert st.max_conditions == 3          # egy alapfeltetel + AND + OR


def test_join_alak_tablai():
    st = analyse_queries(["SELECT * FROM a INNER JOIN b ON a.id=b.id WHERE a.x=1"])
    assert st.max_tables_per_query == 2
    assert st.clauses["join_explicit"] == 1
