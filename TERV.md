# Érettségi-statisztika – implementációs terv

> **Cél:** a digitális kultúra / informatika érettségik (2005–2026, közép + emelt) feladatlapjaiból,
> javítási útmutatóiból és mintamegoldásaiból **adatalapú, interaktív statisztikai weboldal**,
> GitHub Pages-en, ingyenes technológiákkal, új érettségi-időszakkal könnyen bővíthetően.
>
> **Ez a dokumentum Claude Code-nak szól.** Nem tartalmaz kódot, csak döntéseket, struktúrát,
> elfogadási feltételeket. A nyitott döntéseket a 11. fejezet sorolja – ezeket a tanárral kell
> egyeztetni, mielőtt az adott fázis elindul.

---

## 0. Gyors összefoglaló (TL;DR)

| Kérdés | Döntés |
|---|---|
| Honnan jön az adat? | Az **rmg_tools már letöltötte**: `C:\Users\posfa\AppData\Local\RMG Tools\storage\dig_kult_erettsegi\` – közép + emelt, 2005 május → 2026 május, feladatlap + útmutató PDF + mintamegoldás-fájlok |
| Hol lesz a kód? | Új repo: `C:\Loci\prog\erettsegi_stat\` (GitHub: `locitanit/erettsegi-stat`, publikus) |
| Architektúra | **Két lépcső:** (1) Python „extractor” offline kinyeri az adatokat → statikus JSON; (2) statikus webapp (Vite + React + ECharts) olvassa a JSON-t. **Nincs backend, nincs Firebase.** |
| Deploy | GitHub Actions → GitHub Pages (`main` push → build → `gh-pages`) |
| Bővítés | Új időszak: rmg_tools letöltő → `python -m extractor --period "2026 október"` → JSON-diff commit → automatikus deploy. Kézi javítás YAML-override fájlban. |
| Idősáv | Dupla csúszka (kezdő és záró időszak), a 2022-es „informatika → digitális kultúra” váltás vizuálisan jelölve |
| Mi NEM kerül fel | A feladatlapok és útmutatók szövege (szerzői jog, OH). Csak aggregált számok + rövid feladatcímek. |

---

## 1. Az adatforrás pontos leírása

### 1.1 Hely és szerkezet

```
C:\Users\posfa\AppData\Local\RMG Tools\storage\dig_kult_erettsegi\
  download_dig_kult_erettsegi_state.json     ← az rmg_tools letöltő állapota (időszaklista!)
  download_dig_kult_utmutato_state.json
  kozep\
    adatbazis\ prezentacio\ prezentacio_grafika\ programozas\ szoveg\ tablazat\ weblap\
      <időszak>\                 pl. "2025 május", "2022 május (idegen)", "2023 május (informatika)"
        feladatlap\              feladat-PDF (témánként külön PDF, fazekas.hu-ról) + forrás zip/txt
        javitasi_utmutato\       a TELJES útmutató-PDF (k_digkult_25maj_ut.pdf) + pontozó xlsx
                                 + kicsomagolt mintamegoldások (pl. 3_Triatlon\triatlon.xlsx,
                                   ...\adb-megoldas\megoldasok.sql, web-megoldas\*.html/css)
  emelt\
    (ugyanez)
```

Mennyiség (2026-09-05-i állapot): **~9 000 fájl**: 2 673 PDF, 1 149 xlsx, 229 sql, 193 mdb,
137 accdb, 152 html, 99 css, 450 cs, 96 java, 148 docx, 600 txt. Időszakok: közép 68,
emelt 65 (a témánként eltérő, mert pl. programozás középszinten csak 2022-től van).

Referencia-másolat a tanár mappájában (csak feladatlapok, útmutató NÉLKÜL):
`C:\Loci\munka\radnoti\erettsegi\emeltszintu\` és `...\kozepszintu\` – **ne ebből dolgozz**, a
storage a teljesebb.

Az rmg_tools letöltő kódja (a fájlnév-konvenciókhoz és az időszak-listához):
`C:\Loci\prog\rmg_tools\core\scripts\download_dig_kult_erettsegi.py` és
`download_dig_kult_utmutato.py`. A `topic_order` mező a state-fájlban mondja meg, melyik
időszakban hányadik feladat melyik témakör.

### 1.2 Buktatók, amiket az extractornak kezelnie KELL

1. **Az útmutató-PDF a teljes vizsga útmutatója**, nem témánként bontott (a fájl ugyanaz a
   `tablazat\2025 május\` és `adatbazis\2025 május\` alatt). Egyszer kell feldolgozni
   időszakonként, és **feladat-szakaszokra bontani** (regex: „1. feladat”, „2. Táblázatkezelés”,
   „1B. Táblázatkezelés” stb. – évjáratonként más a formátum, ezért kell egy
   mintagyűjtemény + kézi override).
2. **`e_infoism_*` / `k_infoism_*` fájlok = „Informatika ismeretek” (szakmai tárgy)** – nem a
   mi tárgyunk, **ki kell zárni**. Ugyanígy az `Informatika_ism_*_javitasi_*.xlsx`.
3. **A pontozó xlsx (`*_ertekelo_*.xlsx`, `*_javitasi_*.xlsx`) NEM mintamegoldás**, hanem a
   javítótanár pontozó táblája – függvény-számlálásból kizárandó (csupa SZUM).
4. **Mintamegoldás-xlsx nem minden időszakhoz van** (emeltre ritkábban adja ki az OH). Ezért a
   **függvény-gyakoriság elsődleges forrása az útmutató-PDF szövege** (abban benne vannak a
   képletek, pl. `=DARABHATÖBB(...)`), az xlsx csak megerősítés/kiegészítés. A két forrást külön
   mezőben tárold, a UI-on jelezd, melyikből jött.
5. **Beágyazott függvények:** az `=INDEX(...;HOL.VAN(...))` képletből mindkettőt számolni kell –
   ne csak a képlet elején lévő függvényt. Zárójel-mélységtől függetlenül minden
   `NÉV(` tokent.
6. **Magyar és angol függvénynevek** vegyesen fordulnak elő (az útmutató időnként mindkettőt
   megadja, az xlsx belül mindig angol). Kanonikus alak: **magyar**; kell egy HU↔EN
   szinonima-tábla (SZUMHA=SUMIF, FKERES=VLOOKUP, DARABTELI=COUNTIF, HA=IF, ...). A
   LibreOffice-os és Excel-es eltérő nevek (pl. SZÖVEG.KERES / SZÖVEG.TALÁL) külön kanonikus
   bejegyzést kapnak, de „család” mezővel (kereső, statisztikai, logikai, szöveg, dátum, mat.).
7. **Időszak-variánsok:** `(idegen)` = idegen nyelvű tagozatos vizsga (más feladat, számít külön
   vizsgának, de a UI-on szűrhető legyen); `(informatika)` = 2022–2023 átmeneti év, amikor
   informatikából ÉS digitális kultúrából is volt vizsga – mindkettő megmarad, a `subject` mező
   különbözteti meg (`informatika` / `digitalis_kultura`). 2005–2021 = informatika.
8. **Prezentáció → „Prezentáció, grafika”** 2022-től összevont feladat; a témakör-taxonómiában
   legyen `prezentacio` és `grafika` külön, és egy feladat több témakört is kaphat.
9. **PDF-szövegkinyerés:** `pdftotext -layout` (poppler) vagy `pdfplumber`; a régi (2005–2010)
   PDF-ek egy része képként van – ha a szöveg üres, jelöld `ocr_needed` státusszal, első körben
   hagyd ki. **OCR nem lesz** (döntés: 11/3).
10. **Adatbázis-megoldások** három formában: `.sql` szövegfájl (2022-től), `.mdb/.accdb` Access
    (régi) – ebből SQL-t kinyerni nem triviális (mdbtools), első körben az **útmutató-PDF
    SQL-jei** a forrás, az Access-fájlok csak „van-e / nincs” szintjén.
11. **Programozás-megoldások** nyelvenként (`.cs`, `.java`, `.py`, `.pas`, `.cpp`) – ez maga is
    statisztika (mit ad ki az OH), de a feladat elemzése a PDF-ből megy.

---

## 2. Elemzési ötletek (mit érdemes kigyűjteni)

A tanár példája: *melyik Excel-függvény milyen gyakran fordul elő.* Ugyanezt a logikát a hat
témakörre + a vizsga egészére. Jelölés: 🟢 = 1. fázisban, automatikusan kinyerhető ·
🟡 = automatikus, de kézi ellenőrzést igényel · 🔴 = kézi annotáció kell (későbbi fázis).

### 2.1 Táblázatkezelés
- 🟢 **Függvény-gyakoriság** (hány vizsgán fordul elő, hány képletben) – kanonikus magyar név,
  család szerint is. Ez a „hős-grafikon”: rangsor + időbeli trend („mióta divat az XKERES?”).
- 🟢 Függvény-**együttes előfordulás** (melyik függvények szerepelnek ugyanabban a képletben:
  INDEX+HOL.VAN, HA+ÉS, SZUMHATÖBB egyedül) – hőtérkép vagy hálódiagram.
- 🟢 Képlet-komplexitás: beágyazási mélység, képlethossz, függvényszám képletenként – trend.
- 🟢 Nem-függvény készségek kulcsszavak alapján az útmutató + feladatlap szövegéből: diagram
  (típus szerint: oszlop/kör/vonal/pont), feltételes formázás, rendezés, szűrés, egyéni
  számformátum, abszolút/vegyes hivatkozás, munkalapok közti hivatkozás, tartománynév,
  szövegfüggvény-lánc, dátumszámítás.
- 🟢 Pontszám-eloszlás: a feladat összpontja, részfeladatonkénti pontok, hány részfeladat.
- 🟡 Forrásadat mérete (a txt sorai/oszlopai) – „mekkora táblával kell dolgozni”.
- 🔴 Feladat „sztori-témája” (sport, közlekedés, földrajz...) – szórakoztató, de csak kézzel.

### 2.2 Adatbázis-kezelés
- 🟢 **SQL-kulcsszó/záradék gyakoriság**: JOIN (és hány tábla), GROUP BY, HAVING, ORDER BY,
  DISTINCT, LIMIT, LIKE, allekérdezés (beágyazott SELECT), UNION, aggregáló függvények (COUNT,
  SUM, AVG, MIN, MAX), dátumfüggvények (YEAR, MONTH...), UPDATE/DELETE/INSERT/CREATE.
- 🟢 Lekérdezések száma vizsgánként, hány táblás a séma (a CREATE TABLE / forrás txt-k száma),
  van-e jelentés/űrlap-feladat (közép, Access-korszak) – ennek eltűnése 2022 után látványos.
- 🟢 Lekérdezés-komplexitás: táblák száma / lekérdezés, feltételek száma a WHERE-ben.
- 🟡 Adatmodell-típusok: hány kapcsolótáblás (több-több) séma.

### 2.3 Programozás
- 🟢 Részfeladatok száma és pontértéke, a feladat szövegének hossza (szó), a bemeneti fájl
  sorainak száma és mezőszáma (forrás txt).
- 🟢 **Típusalgoritmus-kulcsszavak** a feladatszövegből és az útmutatóból: megszámlálás,
  összegzés, maximum-/minimumkiválasztás, eldöntés, kiválasztás, keresés, kiválogatás,
  szétválogatás, rendezés, metszet/unió, rekurzió, fájlkezelés, sztringfeldolgozás,
  kétdimenziós tömb/mátrix, dátum. (Kulcsszó-szótár + reguláris kifejezések; 🟡 mert a
  szöveg nem mindig nevezi meg a típusalgoritmust.)
- 🟢 Beolvasás módja: billentyűzet vs. fájl; kiírás: képernyő vs. fájl.
- 🟢 Az OH mintamegoldásainak nyelve időszakonként (cs/java/py/pas) – „mikor jelent meg a
  Python”.
- 🟡 A feladat „nehézségi lépcsője”: hányadik részfeladattól kell ciklust ágyazni (kézi jelölés
  vagy heurisztika).

### 2.4 Szövegszerkesztés
- 🟢 Műveleti kulcsszavak gyakorisága az útmutató pontozási soraiból: stílus, tartalomjegyzék,
  tabulátor, hasáb, táblázat, kép/körbefuttatás, iniciálé, élőfej/élőláb, lábjegyzet,
  szakasztörés, kördokumentum, felsorolás, szegély/mintázat, betűtípus/-méret, szimbólum,
  alakzat/rajz, oldalbeállítás, PDF-mentés.
- 🟢 Pontszám-eloszlás részfeladatonként; hány pont jut a „mechanikus” formázásra vs. a
  szerkezeti (stílus, TJ, kördok.) elemekre.
- 🟡 Forrásfájl típusa (txt / docx / rtf) és mérete; képek száma.

### 2.5 Publikálás a világhálón (weblap)
- 🟢 **HTML-elemek gyakorisága** a mintamegoldásokból (html-fájlok parse-olása: h1–h6, p, ul/ol,
  table, img, a, div, span, nav, section, header/footer, iframe, video/audio, form).
- 🟢 **CSS-tulajdonságok** és **kijelölő-típusok** gyakorisága (elem / .osztály / #id /
  leszármazott / pszeudo), külső vs. belső css.
- 🟢 Oldalak száma a feladatban, hivatkozások száma, van-e táblázat / kép / video.
- 🟡 Keretrendszer jelenléte (a 2024 közép megoldásban Bootstrap volt!) – feltűnő trend.

### 2.6 Prezentáció / grafika
- 🟢 Kulcsszavak az útmutatóból: diaminta, áttűnés, animáció, hivatkozás/akciógomb, diagram,
  táblázat, alakzat, kép-vágás, háttér, jegyzet; grafikában: vektor/raszter, réteg,
  átlátszóság, halmazművelet, csomópont, SVG/PNG export, méret px-ben.
- 🟢 Az elkészítendő ábra formátuma (png/jpg/svg) és mérete a feladatszövegből.

### 2.7 Vizsgaszintű (témakörtől független)
- 🟢 **Pontszám-arányok témakörönként időszakonként** (a vizsgaleírás változásainak követése:
  2017-es és 2022-es reform).
- 🟢 Feladatlap terjedelme (oldal, szó) és útmutató terjedelme – „mennyit kell olvasni”.
- 🟢 Feladatcímek listája időszakonként (rövid, nem szerzői jogi probléma) – keresőmező.
- 🟢 Forrásfájl-típusok statisztikája (txt/csv/xlsx/docx/zip/kép).
- 🟢 Közép vs. emelt összehasonlítás ugyanarra a mutatóra (két oszlop egymás mellett).
- 🟡 „Mi szerepelt utoljára mikor” – minden kinyert kulcsszóhoz az utolsó és első előfordulás
  → „régen volt, esedékes?” jellegű táblázat (a tanár egyik legpraktikusabb nézete).
- 🟡 Az útmutató „elfogadható alternatív megoldás” sorainak száma – mennyire rugalmas a
  javítás.

### 2.8 Amit szándékosan NEM teszünk
- Nem publikáljuk a feladatok és útmutatók szövegét (OH szerzői jog). A JSON-ban csak aggregált
  számok, kulcsszó-találatok, feladatcím, pontszám – **nincs feladatszöveg-részlet**.
- Nem építünk AI-t az elemzésbe (a `radnoti/CLAUDE.md` szabálya: determinisztikus eszköz ≠ AI).
  Az extractor tiszta regex/parse. Ha később kell LLM-es címkézés (pl. sztori-téma), az külön,
  egyszeri, kézzel ellenőrzött lépés, az eredménye YAML-override-ként kerül be.

---

## 3. Architektúra

```
┌──────────────────────────────┐    python -m extractor      ┌─────────────────────┐
│ RMG Tools storage            │ ─────────────────────────▶  │ data/ (JSON, git)   │
│ dig_kult_erettsegi/          │   (offline, a tanár gépén)  │  exams.json         │
│  feladatlap + útmutató + mo. │                              │  tasks.json         │
└──────────────────────────────┘                              │  metrics/*.json     │
        ▲                                                     │  vocab/*.json       │
        │ rmg_tools letöltő (megvan)                          └──────────┬──────────┘
        │                                                                │ git push
   oktatas.hu / fazekas.hu                                   ┌───────────▼──────────┐
                                                             │ GitHub Actions       │
                                                             │ vite build → Pages   │
                                                             └───────────┬──────────┘
                                                                         ▼
                                                             https://<user>.github.io/erettsegi-stat/
                                                             (statikus SPA, fetch data/*.json)
```

**Miért nincs Firebase:** minden adat előre kiszámolt, kicsi (< 2 MB JSON), publikus és
csak olvasható. Statikus hoszt elég, nulla üzemeltetés, nulla költség, nincs auth. Firebase
akkor kellene, ha (a) böngészőből akarnánk kézi annotációt menteni több gépről, vagy (b)
felhasználónként eltérő adatot mutatni. Egyik sem cél most. Ha később (a) kell: Firestore
free tier + GitHub-login, az annotációk onnan visszaszinkronizálva a YAML-override-ba – a
tervben hagyunk neki helyet (`overrides/` mappa), de nem építjük meg.

### 3.1 Repo-struktúra (`C:\Loci\prog\erettsegi_stat\`)

```
erettsegi_stat/
  README.md                 (mi ez, hogyan bővítem – a tanárnak, 1 oldal)
  TERV.md                   (ez a dokumentum)
  extractor/                Python 3.12, csak stdlib + pdfplumber/pypdf, openpyxl, beautifulsoup4, pyyaml
    __main__.py             CLI: --storage <path> --period "2026 október" --level emelt --topic tablazat --all
    config.py               storage útvonal (env: ERETTSEGI_STORAGE, default a fenti AppData-út)
    discover.py             fájlrendszer bejárás → Exam/TaskFile rekordok (időszak-név parse, subject, variant)
    pdf_text.py             pdftotext/pdfplumber wrapper + cache (data/_cache/*.txt, .gitignore-ban)
    split_utmutato.py       útmutató-PDF feladat-szakaszokra bontása (regex-készlet évjáratonként + override)
    parsers/
      tablazat.py           képletek (PDF szöveg + xlsx), függvény-tokenizálás, kulcsszavak
      adatbazis.py          SQL-tokenizálás (PDF + .sql), záradékok, allekérdezés-detektálás
      programozas.py        részfeladatok, pontok, típusalgoritmus-kulcsszavak, forrás txt méret, megoldás-nyelvek
      szoveg.py             műveleti kulcsszavak, pontok
      weblap.py             html/css parse (bs4 + tinycss2 vagy regex), kulcsszavak
      prezentacio.py        kulcsszavak
      common.py             pontszám-kinyerés ("N pont"), feladatcím, szószám, oldalszám
    vocab/                  szótárak – EZEKET a tanár szerkeszti, nem a kódot
      excel_functions.yaml  kanonikus HU név, EN alias(ok), LibreOffice alias, család, "emelt-only" flag
      sql_keywords.yaml
      algorithm_keywords.yaml   (típusalgoritmus → regex-lista magyarul)
      text_ops.yaml, web_tags.yaml, css_props.yaml, presentation_ops.yaml
    overrides/              kézi javítás YAML-ban, időszak+szint+témakör kulcsra
      README.md             mikor és hogyan
      2019_majus_emelt.yaml pl. "utmutato_split: {tablazat: [3, 7]}" (oldaltartomány), "exclude: [...]"
    build_metrics.py        tasks.json → metrics/*.json (előre aggregált, hogy a frontend ne számoljon nagyot)
    validate.py             sémaellenőrzés + „gyanús” riport (0 képlet egy táblázat-feladatban stb.)
    tests/                  pytest, mintafájlokkal (3–4 időszak PDF-szövege txt-ként, NEM a PDF)
  data/                     a build kimenete, git-ben verziózva (ez a "könnyen bővíthető" rész)
    schema.json             JSON Schema a tasks.json-hoz
    exams.json              időszakok listája (id, év, hónap, szint, tárgy, variáns, forrásfájlok megléte)
    tasks.json              feladatonként egy rekord (lásd 4. fejezet)
    metrics/                előaggregált: excel_functions.json, sql_keywords.json, points_by_topic.json, ...
    vocab.json              a YAML-szótárak összefűzve a frontendnek (címkék, családok, színek)
    CHANGELOG.md            "2026-11-xx: +2026 október (közép+emelt)"
  web/                      Vite + React + TypeScript + ECharts (vagy Recharts) + Tailwind
    src/
      data/loader.ts        fetch + zod-validálás + cache
      state/filters.ts      URL-ben tárolt szűrőállapot (?from=2022m&to=2026m&level=emelt&topic=tablazat)
      components/PeriodSlider.tsx   dupla csúszka időszak-lépésekkel (nem év!), 2022-es reform-jelölő
      components/LevelToggle, TopicNav, VariantToggle (idegen/informatika be/ki)
      pages/Overview, Tablazat, Adatbazis, Programozas, Szoveg, Weblap, Prezentacio, Esedekes ("mikor volt utoljára"), Vizsgak (lista + keresés)
      charts/               RankBar, TrendLine (időszak-tengely), Heatmap (együttes előfordulás), StackedPoints, SmallMultiples
  .github/workflows/deploy.yml     push main → npm ci → build → Pages (peaceiris/actions-gh-pages vagy actions/deploy-pages)
  .gitignore                data/_cache/, node_modules, dist – a storage soha nem kerül a repóba
```

### 3.2 Technológiai döntések (indoklással)

| Réteg | Választás | Miért |
|---|---|---|
| Extractor | Python 3.12, pdfplumber (fallback: poppler `pdftotext -layout`), openpyxl, bs4, pyyaml | Ugyanaz a stack, mint az rmg_tools – a tanár gépén már van. Az xlsx képletei csak openpyxl-lel (`data_only=False`) olvashatók. |
| Adatformátum | JSON a repóban, előaggregált metrics + nyers tasks.json | Statikus hoszt; a tasks.json marad a „forrás igazság”, a metrics újragenerálható. |
| Frontend | Vite + React + TS; **ECharts** (apache-echarts) | ECharts tud hőtérképet, csúszkás dataZoom-ot, hálót és kis-többszörös nézetet egy könyvtárból; MIT. Recharts egyszerűbb, de nincs hőtérkép. |
| Csúszka | Saját komponens (rc-slider vagy radix Slider) diszkrét lépésekkel = időszakok listája | Az időszak nem folytonos (május/október, kimaradó évek) – év-alapú csúszka félrevezető. |
| Stílus | Tailwind + shadcn/ui alapkomponensek (Radix), Lucide ikonok; a radnoti témaszínek csak a diagram-sorozatokon (lásd 6.3) | Visszafogott, professzionális alap, kevés saját CSS; konzisztens a tananyagokkal ott, ahol számít. |
| URL-állapot | minden szűrő a query stringben | Egy nézet linkelhető (pl. a 12fak csoportnak: „nézzétek meg ezt”). |
| Deploy | GitHub Actions → GitHub Pages, `base: '/erettsegi-stat/'` a Vite configban | Ingyenes, nulla üzemeltetés. |
| Teszt | pytest (extractor), vitest + 1 Playwright smoke (web) | Az extractor a kockázatos rész – oda a teszt. |

---

## 4. Adatmodell

### 4.1 `exams.json` – egy rekord / vizsga-időszak-szint-variáns

```
id:            "2025m_emelt_dk"            (év + m/o + szint + tárgy; variáns: "_id" = idegen)
year, month:   2025, 5
level:         "kozep" | "emelt"
subject:       "informatika" | "digitalis_kultura"
variant:       "normal" | "idegen"
period_label:  "2025. május"
storage_dir:   relatív út a storage-on belül (csak a tanár gépén értelmes; a webre nem kell)
has:           { feladatlap: true, utmutato: true, megoldas_xlsx: false, megoldas_sql: true, ... }
pages:         { feladatlap: 22, utmutato: 13 }
total_points:  120
notes:         szabad szöveg az override-ból
```

### 4.2 `tasks.json` – egy rekord / feladat (egy vizsgán 3–5)

```
exam_id, task_no ("1B"), title ("Síparadicsomok"), topics: ["tablazat"], points: 35,
subtasks: [{label: "a", points: 2}, ...]     (ha kinyerhető)
text_stats: { feladat_words: 830, utmutato_words: 1200 }
sources:    [{name: "siforras.txt", type: "txt", rows: 312, cols: 9}]
solutions:  [{type: "xlsx"|"sql"|"cs"|"html"...,  name}]
features:   { <témakör-specifikus mutatók, lásd 4.3> }
provenance: { utmutato_split: "auto"|"override", formulas_from: ["pdf","xlsx"] }
warnings:   ["no formulas found in pdf section"]
```

### 4.3 `features` témakörönként (mindegyik számláló: `{kulcs: darab}`)

- tablazat: `functions` (kanonikus név → képletek száma), `function_pairs` (["INDEX","HOL.VAN"] → n),
  `formula_depth_max`, `formula_count`, `skills` (diagram_kor, felt_formazas, rendezes, ...)
- adatbazis: `sql_clauses` (JOIN, GROUP BY, ...), `query_count`, `max_tables_per_query`,
  `subquery_count`, `dml` (UPDATE/DELETE/INSERT), `tables_in_schema`
- programozas: `subtask_count`, `algorithms` (megszamlalas, ...), `io` (file_in, kbd_in, file_out),
  `input_rows`, `solution_langs`
- szoveg: `ops` (stilus, tartalomjegyzek, ...)
- weblap: `html_tags`, `css_props`, `selector_types`, `page_count`, `external_css`, `framework`
- prezentacio / grafika: `ops`

### 4.4 `metrics/*.json` – amit a frontend közvetlenül rajzol

Minden metrika **időszakonként bontva** tárolódik, hogy a csúszka kliensoldalon szűrjön
újraszámolás nélkül: `{ "2025m_emelt_dk": { "SZUMHA": 2, ... }, ... }`. A frontend a kiválasztott
időszak-tartományra összegez (ez pár száz kulcs, azonnali). Így **egy új időszak = egy új kulcs**
a fájlokban, semmit nem kell újratervezni.

### 4.5 Kanonikus szótár-példa (`vocab/excel_functions.yaml`)

```yaml
- canon: SZUMHA
  aliases: [SUMIF]
  family: statisztikai_feltételes
  since: null            # ha tudjuk, mikortól létezik (XKERES: 2019)
- canon: XKERES
  aliases: [XLOOKUP]
  family: kereső
  since: 2019
- canon: SZÖVEG.KERES
  aliases: [SEARCH, SZÖVEG.TALÁL]   # LibreOffice-név ugyanide
  family: szöveg
```

Ismeretlen `NÉV(` tokent az extractor **nem dob el**: `_unknown` listába teszi, a validate.py
kiírja – a tanár beírja a YAML-ba, újrafuttat.

---

## 5. Az extractor működése lépésről lépésre

1. **discover** – bejárja a storage-ot, időszak-nevekből (`"2023 május (informatika)"`) készít
   `Exam` rekordot; a `download_dig_kult_erettsegi_state.json` `topic_order` mezőjéből tudja,
   hogy az adott vizsgán a feladatok sorrendje mi. Kizárja: `*infoism*`, `Informatika_ism_*`.
2. **pdf_text** – minden PDF → szöveg, cache-elve (`data/_cache/<sha1>.txt`), hogy az
   újrafuttatás gyors legyen. Üres szöveg → `ocr_needed` warning.
3. **split_utmutato** – az útmutató szövegét feladat-szakaszokra vágja. Stratégia: sorban
   próbál mintákat (`^\s*(\d+[AB]?)\.\s+(Dokumentumkészítés|Táblázatkezelés|...)`,
   `^\s*\d+\.\s*feladat`, régi: `^\s*[IVX]+\.`), a találatokat egyezteti a `topic_order`-rel
   (ha 4 témakör van és 4 fejlécet talált → OK; különben override-ot kér és `warnings`-ba írja).
4. **parsers** – témakörönként a feladatlap-szöveg + útmutató-szakasz + megoldásfájlok →
   `features`. A regexeket a `vocab/*.yaml` hajtja; a kódban nincs beégetett függvénynév.
5. **overrides** – a kész rekordokra rámásolja a YAML-ban megadott kézi értékeket (mély merge),
   `provenance`-be írja, mi jött override-ból.
6. **validate** – JSON Schema + heurisztikák: táblázat-feladat 0 függvénnyel, adatbázis 0
   SELECT-tel, pontösszeg ≠ vizsgaleírás szerinti max (100/120), duplikált feladatcím. Riport
   markdownban (`data/VALIDATION.md`), a CI ezt nem buktatja, csak a tanár nézi.
7. **build_metrics** – tasks.json → metrics/*.json + vocab.json + CHANGELOG-sor.

CLI-példák (README-be):
```
python -m extractor --all                          # teljes újraépítés (első futás: ~5–10 perc a PDF-ek miatt, utána cache)
python -m extractor --period "2026 október"        # csak az új időszak (mindkét szint, minden témakör)
python -m extractor --period "2019 május" --level emelt --topic tablazat --debug   # egy feladat, részletes log
python -m extractor --validate-only
```

---

## 6. A weboldal (UX-terv)

### 6.1 Globális vezérlők (fejléc, minden oldalon)
- **Időszak-csúszka** (dupla fogantyú), lépések = a létező időszakok időrendben; alatta
  jelölők: 2017 (vizsgaleírás-változás), 2022 (digitális kultúra). Alapérték: 2022 május → utolsó.
  Gyorsgombok: „Dig. kultúra (2022–)”, „Utolsó 5 év”, „Minden”.
- **Szint:** közép / emelt / mindkettő (mindkettőnél a grafikonok két sorozattal).
- **Variánsok:** idegen nyelvű vizsgák be/ki (alap: ki, hogy ne duplázzon), informatika
  2022–23 be/ki (alap: be).
- **Normalizálás kapcsoló:** darab vs. „vizsgák %-a, ahol előfordult” (ez utóbbi az, ami a
  csúszka mozgatásakor összehasonlítható marad).

### 6.2 Oldalak
1. **Áttekintés** – pontarányok témakörönként (halmozott sáv, időszak-tengely), vizsgák száma
   a tartományban, „TOP 10 minden témakörből” kártyák, legutóbbi frissítés.
2. **Táblázatkezelés** – függvény-rangsor (vízszintes sáv, kattintásra trendvonal),
   függvény-családok kördiagram, együttes-előfordulás hőtérkép, készség-kulcsszavak, képlet-komplexitás trend.
3. **Adatbázis** – záradék-rangsor, lekérdezésszám trend, JOIN-táblaszám eloszlás, DML-előfordulás.
4. **Programozás** – típusalgoritmus-rangsor, részfeladat-szám és pont trend, bemenet mérete,
   megoldás-nyelvek idővonal.
5. **Szövegszerkesztés / Weblap / Prezentáció-grafika** – ugyanaz a séma: rangsor + trend + kulcsszó-kereső.
6. **„Mikor volt utoljára?”** – táblázat: kulcsszó · témakör · első · utolsó előfordulás ·
   hány vizsgán · „hány időszak telt el azóta” (szín: régen → piros). Rendezhető. **Ez a tanári
   „mire számítsunk” nézet.**
7. **Vizsgák** – időszakok listája szűrhetően (év, szint, tárgy), feladatcímekkel, pontokkal,
   „mely fájlok vannak meg” jelzéssel, warnings-szal (adatminőség láthatóan).
8. **Adatokról** – módszertan, korlátok (OCR-hiány, override-ok száma), forrás (OH, fazekas.hu),
   szerzői jogi megjegyzés, verzió + CHANGELOG.

### 6.3 Design-elvek (kötelező)

**Hangulat:** letisztult, professzionális, adatközpontú – egy jó műszerfal, nem egy iskolai
plakát. Mintaként: Observable, Vercel-dashboardok, a Datawrapper-diagramok visszafogottsága.

- **Emoji sehol.** Sem menüben, sem címben, sem gombon, sem diagramfeliratban, sem az Adatokról
  oldalon. Ikon csak vonalas ikonkészletből (Lucide), és csak ott, ahol funkciója van
  (szűrő, letöltés, bezárás).
- **Menü:** egy bal oldali, rögzített oldalsáv (mobilon felül, lenyíló). Legfeljebb 9 menüpont,
  rövid, egyszavas/kétszavas címkékkel, fix sorrendben:
  Áttekintés · Táblázatkezelés · Adatbázis-kezelés · Programozás · Szövegszerkesztés ·
  Weblap · Prezentáció és grafika · Mikor volt utoljára · Vizsgák · (lábléc: Adatokról).
  Nincs almenü, nincs lenyíló hierarchia – a témakörön belüli váltás füllel (tab) történik
  az oldalon belül (pl. Táblázatkezelés: Függvények · Készségek · Komplexitás).
- **Fejléc:** egyetlen sor a globális szűrőkkel (időszak-csúszka, szint, variánsok,
  normalizálás). Mindig látszik (sticky). Az aktív szűrő állapota szövegesen is kiírva
  („2022. május – 2026. május · emelt · 27 vizsga”), hogy egy képernyőképen is egyértelmű legyen.
- **Tipográfia:** egy betűcsalád (Inter vagy IBM Plex Sans), 3 méretfokozat (cím / alcím /
  törzs) + egy monospace (IBM Plex Mono) a függvény- és SQL-neveknek. Nincs félkövér-dömping:
  egy címsor per szakasz, a többi szöveg normál.
- **Szín:** semleges alap (fehér/off-white háttér, sötétszürke szöveg, halvány elválasztók),
  egy kiemelőszín az interakcióhoz, és a témakörök radnoti-színei CSAK a diagram-sorozatokon és
  a menü aktív jelölőjén. Világos és sötét téma, rendszerbeállítást követve.
- **Diagramok:** egységes ECharts-téma (saját `theme.ts`): vékony tengelyek, nincs 3D, nincs
  árnyék, nincs gradiens, rácsvonal csak vízszintes és halvány; jelmagyarázat felül, balra
  zárva; számok ezres tagolással, magyar formátum. Minden diagramnak van egymondatos
  címe és egysoros forrás-/mintaszám-felirata („n = 27 vizsga”).
- **Tér és rács:** 8 px-es rács, kártyák vékony kerettel vagy semmivel (nem árnyékkal),
  1200 px max tartalomszélesség, bőséges fehér tér. Egy képernyőn egy fő diagram + legfeljebb
  2–3 kiegészítő.
- **Nyelv:** teljes magyar felület, e/2 helyett semleges megfogalmazás („Szűrés”, „Letöltés”),
  rövid címkék, nincs felkiáltójel.
- **Ellenőrzés a 4. fázisban:** a tanár képernyőképek alapján hagyja jóvá a designt az 1. fázis
  végén (Táblázatkezelés-oldal), a többi oldal ezt a mintát követi komponens-szinten
  (egy `PageLayout`, egy `ChartCard`, egy `RankTable` komponens – nem oldalanként újraírva).

### 6.4 Diagram-szabályok
- Minden trend-grafikon x-tengelye az **időszak** (nem év), a 2022-es váltás függőleges vonal.
- Minden rangsor mellett a „vizsgák %-a” érték is látszik (különben a hosszabb időtartomány mindig „nyer”).
- Kattintás egy elemre → részletpanel: melyik vizsgákon (cím + időszak + szint), időszakonkénti darab.
- Export: „CSV letöltés” gomb minden táblázathoz (a tanár Excelbe viszi).
- Színek: témakörönként fix (radnoti-séma), családok/kulcsszavak sorrend-stabil paletta.
- Mobilon is használható (a diákok telefonon nézik): egyoszlopos elrendezés, a hőtérkép görgethető.

---

## 7. Bővítés új érettségivel (ez a „hozzábiggyesztés” folyamat)

1. Az rmg_tools „Adatfrissítés” gombja (vagy `python -m scripts.download_dig_kult_all`) letölti az
   új időszakot a storage-ba (a letöltő inkrementális).
2. `cd C:\Loci\prog\erettsegi_stat && python -m extractor --period "2026 október"`
3. `data/VALIDATION.md` átnézése; ha kell, `overrides/2026_oktober_*.yaml` (jellemzően az
   útmutató-vágás oldalszámai vagy egy ismeretlen függvény felvétele a vocab-ba), újrafuttatás.
4. `git add data && git commit -m "2026 október" && git push` → Actions → 2 perc múlva élő.
5. Semmilyen frontend-módosítás nem kell: a metrics fájlok kulcsai bővülnek, a csúszka az
   `exams.json`-ból tudja az új lépést.

### 7.1 Nyers OH-elrendezés (`_oh_raw/`) – az ütemezett karbantartó ezt tölti

Mivel az rmg_tools letöltője nem biztos, hogy automatikusan lefut, egy **ütemezett Claude-feladat**
(minden év **július 1.** és **december 1.**, 09:00 – a májusi, ill. októberi vizsga után) közvetlenül
az OH honlapjáról (`oktatas.hu/kozneveles/erettsegi/feladatsorok`) tölti le az új időszak
fájljait ide:

```
...\storage\dig_kult_erettsegi\_oh_raw\<év hónap>\<kozep|emelt>\
    k_digkult_26okt_fl.pdf        ← TELJES feladatlap (nem témánként bontott!)
    k_digkult_26okt_ut.pdf        ← útmutató
    forras\...                    ← forrásfájlok zip kicsomagolva
    megoldas\...                  ← mintamegoldás zip kicsomagolva (ha az OH kiadta)
```

Az extractor **kötelezően támogatja ezt a második elrendezést is**: a `discover` lépés mindkét
helyről gyűjt, és ha egy időszak mindkettőben megvan, a témánként bontott (rmg_tools) verzió
az elsődleges, a `_oh_raw` a tartalék. A teljes feladatlap-PDF-et ugyanazzal a
`split_utmutato`-logikával kell feladatokra vágni (a feladatlapon a fejlécek egyértelműbbek:
„1. Dokumentumkészítés”, „2. Adatbázis-kezelés” ...). A `provenance.layout` mező mondja meg,
melyikből jött a rekord. Fájlnév-konvenció az OH-n: `k_`/`e_` = közép/emelt, `digkult`,
`<éé><maj|okt>`, `_fl` feladatlap / `_ut` útmutató; `infoism` = más tárgy, kizárva.

Ugyanez a menet, ha a tanár **új szótárelemet** vesz fel (pl. új típusalgoritmus-regex):
`--all` újrafuttatás a cache miatt gyors (< 1 perc).

---

## 8. Ütemterv és elfogadási feltételek

| Fázis | Tartalom | Kész, ha |
|---|---|---|
| **0. Váz** (½ nap) | repo, extractor CLI-váz, discover + pdf_text + cache, exams.json, Vite-app „Vizsgák” oldallal, Pages deploy | Az élő oldalon látszik az összes időszak listája közép/emelt szűrővel. |
| **1. Táblázatkezelés end-to-end** (1–2 nap) | split_utmutato, tablazat parser (PDF + xlsx), excel_functions.yaml (~80 függvény), metrics, Táblázat-oldal a csúszkával, „Mikor volt utoljára” | A tanár által kézzel megszámolt 3 időszak (pl. 2019 máj. emelt, 2024 máj. közép, 2025 máj. emelt) függvény-listája **egyezik** az extractoréval; ismeretlen függvény 0. |
| **2. Adatbázis + programozás** (1–2 nap) | sql + programozas parser, szótárak, oldalak | 3 időszak kézi ellenőrzése egyezik; Access-korszak `has.megoldas_sql=false`-szal, PDF-SQL-ből számolva. |
| **3. Szöveg, weblap, prezentáció + Áttekintés** (1–2 nap) | kulcsszó-parserek, html/css parse, pontarány-grafikon, Adatokról oldal | Minden témakörnek van oldala; validate riportban < 10 % feladat warnings-szal 2012 után. |
| **4. Minőség** (1 nap) | override-ok a 2012 előtti hibás vágásokra (OCR NINCS – lásd 11/3), tesztek, README a tanárnak, mobil-ellenőrzés | `--period` bővítés-menet végigpróbálva egy „kivett majd visszatett” időszakkal; Lighthouse ≥ 90. |
| 5. (opcionális) | sztori-téma címkék, Firestore-annotáció, összehasonlító „két időszak” nézet | – |

Az 1. fázis végén **álljunk meg és nézzük meg a tanárral** – a többi témakör ugyanezt a
mintát követi, a hibák itt derülnek ki a legolcsóbban.

---

## 9. Kockázatok

| Kockázat | Kezelés |
|---|---|
| Az útmutató-PDF vágása évjáratonként más | regex-készlet + override YAML + validate riport; a 2012 előtti éveket „best effort”-nak jelöljük az Adatokról oldalon |
| Régi PDF képként (nincs szöveg) | `ocr_needed` flag, kimarad, a UI mutatja a lefedettséget (hány vizsgából van adat) |
| Függvénynevek zaja (pl. „SZUM” a pontozó xlsx-ből) | pontozó xlsx-ek fájlnév-mintával kizárva; PDF-ből csak `=`-lel kezdődő vagy „képlet:” utáni szövegben keresünk; teszteset rá |
| „Vizsgák %-a” torzítás, ha az idegen variáns benne van | alapból ki, és a nevezőt mindig a tényleges szűrt vizsgaszám adja |
| Szerzői jog | nincs szöveg a JSON-ban, csak számok és címek; az Adatokról oldalon forrásmegjelölés |
| Storage-útvonal gépfüggő | `ERETTSEGI_STORAGE` env + `config.py` default; a repo soha nem tartalmaz forrásfájlt |

---

## 10. Kapcsolódó helyek a gépen

- Storage (adat): `C:\Users\posfa\AppData\Local\RMG Tools\storage\dig_kult_erettsegi\`
- Letöltő szkriptek: `C:\Loci\prog\rmg_tools\core\scripts\download_dig_kult_erettsegi.py`, `download_dig_kult_utmutato.py`
- Témakör-taxonómia (ha egyezni akarunk a feladatbázissal): `C:\Loci\prog\rmg_tools\core\storage\taxonomy.json`
- Vizsgaleírás (pontszámok ellenőrzéséhez): `C:\Loci\munka\radnoti\erettsegi\dig_kult_2024_e.pdf`
- Konvenciók (témanevek, színek, „nincs AI a determinisztikus eszközben”): `C:\Loci\munka\radnoti\CLAUDE.md`
- Repo (ez a mappa): `C:\Loci\prog\erettsegi_stat\` – a terv itt: `TERV.md`, a Claude Code-nak szóló belépő: `CLAUDE.md`

---

## 11. Eldöntött kérdések (2026-09-05, a tanárral egyeztetve)

1. **Repo:** GitHub user `locitanit`, repo `erettsegi-stat`, publikus. Élő URL:
   `https://locitanit.github.io/erettsegi-stat/` → Vite `base: '/erettsegi-stat/'`.
2. **Függvénynevek a UI-on: magyar** (kanonikus alak). Az angol alias csak a szótárban és a
   keresőmezőben él (ha valaki „SUMIF”-et ír, találja meg a SZUMHA-t).
3. **2012 előtti, képként tárolt PDF-ek: „best effort”, NINCS OCR.** Ahol nincs kinyerhető
   szöveg → `ocr_needed` flag, a feladat kimarad az aggregálásból, az Adatokról oldal és a
   Vizsgák-lista jelzi a lefedettséget („2005–2011: hiányos adat”). Az OCR a tervből törölve.
4. **Idegen nyelvű variánsok alapból KI** a szűrőben (bekapcsolható).
5. **Charting lib: ECharts.**

---

## 12. Kickoff-prompt Claude Code-nak

> Olvasd el a `TERV.md`-t – a 11. fejezet döntései véglegesek (locitanit/erettsegi-stat,
> magyar függvénynevek, nincs OCR, idegen variáns alapból ki, ECharts), a 6.3 design-elvek
> (letisztult, professzionális, emoji nélkül, max 9 menüpont) kötelezőek. Hozd létre a repo-vázat a 3.1 szerint, valósítsd meg a **0. fázist**
> (discover + pdf_text + exams.json + Vizsgák-oldal + Pages deploy), majd állj meg és mutasd meg
> az `exams.json` első 10 rekordját és a validate riportot. A storage-út:
> `C:\Users\posfa\AppData\Local\RMG Tools\storage\dig_kult_erettsegi`. A `*infoism*` és
> `Informatika_ism_*` fájlokat zárd ki. Ne tegyél forrás-PDF-et vagy útmutató-szöveget a repóba.
> Az 1. fázis előtt kérd el a tanártól a három ellenőrző időszak kézi függvény-listáját.
