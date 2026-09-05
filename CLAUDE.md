# erettsegi_stat – Claude Code belépő

Érettségi-statisztika weboldal (digitális kultúra / informatika érettségik elemzése),
GitHub Pages-en: `locitanit/erettsegi-stat`. **A teljes terv: `TERV.md` – olvasd el először.**

## Amit tudnod kell 30 másodpercben
- Két lépcső: `extractor/` (Python, offline, a tanár gépén) → `data/*.json` (git) → `web/` (Vite + React + TS + ECharts, statikus).
- Nincs backend, nincs Firebase, nincs AI az extractorban (csak regex/parse, szótárvezérelt: `extractor/vocab/*.yaml`).
- Adatforrás (NEM kerül a repóba): `C:\Users\posfa\AppData\Local\RMG Tools\storage\dig_kult_erettsegi\`
  – témánként bontott (rmg_tools) elrendezés + `_oh_raw\` nyers OH-elrendezés (TERV 7.1). Mindkettőt támogatni kell.
- Kizárandó: `*infoism*`, `Informatika_ism_*` (más tárgy); `*_ertekelo_*.xlsx` (pontozótábla, nem megoldás).
- Eldöntve (TERV 11.): magyar függvénynevek; nincs OCR; idegen nyelvű variáns alapból ki; ECharts.
- Design (TERV 6.3): letisztult, professzionális, emoji sehol, max 9 menüpont, közös komponensek.
- Szerzői jog: a feladatok/útmutatók szövege nem kerül a repóba, csak számok és feladatcímek.

## Munkamenet
- Fázisonként haladj (TERV 8.), a 0. és az 1. fázis végén állj meg és mutasd meg az eredményt.
- Az 1. fázis elfogadása: 3 időszak kézzel számolt függvény-listája egyezik az extractoréval.
- Konvenciók: magyar nyelv a felületen és a dokumentációban; mappa-/fájlnevek kisbetű, ékezet nélkül,
  aláhúzással; commit-üzenetek magyarul, rövid.
- A tanár (Lóci) gépén Python 3.12 és Node van; a storage csak nála létezik – tesztek mintaszövegekkel
  (`extractor/tests/fixtures/`), nem PDF-ekkel.

## Kickoff
Valósítsd meg a **0. fázist** (repo-váz a TERV 3.1 szerint, discover + pdf_text + cache,
`data/exams.json`, Vizsgák-oldal, Pages deploy), majd állj meg: mutasd az `exams.json` első 10
rekordját és a validate riportot.
