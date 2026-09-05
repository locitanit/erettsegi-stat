# Adatváltozások

## 2026-09-05 – 4. fázis (minőség)
- A 2010-es útmutató „2A Vírusok” alakú fejlécét is felismeri a vágó, így
  **mind a 83 útmutató hibátlanul feldolgozható** (348 feladat, 83 táblázat-feladat).
- Override-mechanizmus: `section_starts`, `task_topics`, `task_points`,
  `skip_tasks`, `exclude`, `notes` – lásd `extractor/overrides/README.md`.
  Jelenleg egyetlen override sem kell.
- A bővítés-menet ellenőrizve: időszak kivétele és `--period`-del visszatétele
  bitre azonos kimenetet ad.

## 2026-09-05 – 3. fázis (szöveg, weblap, prezentáció, pontszámok)
- Mind a hat témakörnek van elemzése.
- Szövegszerkesztés (60 feladat) és prezentáció-grafika (50 feladat):
  műveleti kulcsszavak az útmutatóból.
- Weblap (29 feladat): HTML-elemek, CSS-tulajdonságok és kijelölő-típusok a
  kiadott mintamegoldásokból; a keretrendszerek (Bootstrap, jQuery) fájljai
  kimaradnak, de a jelenlétük jelezve van.
- **Pontszámok** a pontozótábla xlsx-ből (2012-től): 64 vizsga, 259 feladat.
  Csak akkor kerülnek be, ha a vizsga összpontszáma pontosan 100 vagy 120.
- Új metrikák: `points_by_topic`, `exam_shape`, `text_ops`, `presentation_ops`,
  `web_ops`, `html_tags`, `css_props`, `selector_types`.
- 2012 utáni feladatok figyelmeztetéssel: 0 / 253.

## 2026-09-05 – 2. fázis (adatbázis + programozás)
- Adatbázis: 82 feladat, 772 lekérdezés az útmutatókból, 42 feladathoz .sql
  mintamegoldás is. Záradékok, alkérdezések, tábla- és feltételszám.
- Programozás: 50 feladat, típusalgoritmus- és be/kimenet-kulcsszavak,
  mintamegoldás-nyelvek, forrásállomány mérete, részfeladatszám.
- Új szótárak: `sql_keywords.yaml`, `algorithm_keywords.yaml`, `programozas_io.yaml`.
- Javítás: a megoldásfájlokat a letöltő minden témakör-mappába kicsomagolja, ezért
  a vizsga összes megoldásfájlja számít, nem csak a témakör mappájában lévők.

## 2026-09-05 – 1. fázis (táblázatkezelés)
- `tasks.json`: 346 feladat 121 vizsgáról, az útmutató-PDF feladat-szakaszaiból.
- Táblázatkezelés: 82 feladat, 772 mintaképlet, 76 különböző függvény, 0 ismeretlen név.
- `metrics/`: függvény-gyakoriság, együttes előfordulás, készség-kulcsszavak,
  képlet-komplexitás – mind időszakonként bontva.
- `vocab.json`: 134 függvény kanonikus magyar névvel, angol és régi aliasokkal.
- Az idegen nyelvű vizsgák kimaradnak az elemzésből (nincs saját nyelvű útmutatójuk).

## 2026-09-05 – 0. fázis
- Első felderítés: 133 vizsga (68 közép, 65 emelt), 2005. május – 2026. május.
- `exams.json`: időszak, szint, tárgy, változat, témakörök, fájl- és oldalszámok,
  adatminőségi jelzések.
