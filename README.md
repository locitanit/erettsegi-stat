# Érettségi-statisztika

A digitális kultúra / informatika érettségik (2005–) adatalapú elemzése.
Élő oldal: <https://locitanit.github.io/erettsegi-stat/>

A teljes terv és az elfogadási feltételek: [TERV.md](TERV.md).
Jelenlegi állapot: **kész**. Mind a hat témakörnek van elemzése és oldala,
megvannak a pontszámok és az Áttekintés oldal. Mind a 83 útmutató hibátlanul
feldolgozható, és a bővítés-menet bitre azonos eredményt ad.

A felület alapbeállítása: 2022-től (digitális kultúra), emelt szint, digitális
kultúra, „vizsgák %-a” mérték. A fejlécen beállított szűrők oldalváltáskor
megmaradnak, és a rangsorok mindig az éppen választott mérték szerint rendeződnek.

A tervezett „Mikor volt utoljára” oldal kimaradt: a listája szinte csak
táblázatkezelési tételeket tartalmazott, és nem volt jól értelmezhető.
Az idegen nyelvű vizsgák nem szerepelnek az elemzésben (nincs saját nyelvű útmutatójuk).

## Hogyan működik

Két lépcső, backend nélkül:

1. **extractor** (Python, offline, csak a tanár gépén fut) végigolvassa az érettségi
   PDF-eket és megoldásfájlokat, és statikus JSON-t ír a `data/` mappába.
2. **web** (Vite + React + TypeScript) ezt a JSON-t tölti be és rajzolja ki.
   A GitHub Actions minden `main`-re tolás után újraépíti és kiteszi Pages-re.

A forrásfájlok (PDF, útmutató, mintamegoldás) **soha nem kerülnek a repóba** – csak
aggregált számok és feladatcímek. A kinyert PDF-szöveg a `data/_cache/` mappában marad,
ami `.gitignore`-ban van.

## Egyszeri beállítás

```bash
pip install -r requirements.txt
npm install --prefix web
```

Az adatforrás alapértelmezett helye:
`%LOCALAPPDATA%\RMG Tools\storage\dig_kult_erettsegi`.
Más gépen az `ERETTSEGI_STORAGE` környezeti változóval vagy a `--storage` kapcsolóval
adható meg.

## Új érettségi-időszak hozzáadása

1. Töltsd le az új időszakot az rmg_tools letöltővel (vagy az OH-ról a `_oh_raw/` alá).
2. Futtasd az extractort csak arra az időszakra:

```bash
python -m extractor --period "2026 október"
```

3. Nézd át a `data/VALIDATION.md` riportot. Ha valami hiányzik, vedd fel a javítást
   az `extractor/overrides/` mappába, és futtasd újra.
4. Commitold a `data/` mappát és told fel:

```bash
git add data && git commit -m "2026 október" && git push
```

A weboldalon semmit nem kell módosítani – az új időszak magától megjelenik.

## Parancsok

```bash
python -m extractor --all
```

```bash
python -m extractor --period "2019 május" --level emelt --debug
```

```bash
python -m extractor --validate-only
```

```bash
python -m pytest extractor/tests -q
```

```bash
npm run dev --prefix web
```

```bash
npm run build --prefix web
```

Az `npm run dev` és `npm run build` előtt automatikusan lefut a `sync-data`, ami a
`data/` mappa publikálható részét átmásolja a `web/public/data/` alá.

## Mappák

| Mappa | Mi van benne |
|---|---|
| `extractor/` | a Python adatkinyerő (CLI: `python -m extractor`) |
| `extractor/vocab/` | szótárak YAML-ban – ezeket szerkeszd, ne a kódot |
| `extractor/overrides/` | kézi javítások időszakonként |
| `data/` | a kimenet: `exams.json`, `tasks.json`, `vocab.json`, `metrics/`, `VALIDATION.md` – ez van git-ben |
| `web/` | a weboldal (Vite + React + TypeScript + ECharts) |

## Minőség

| Mutató | Érték |
|---|---|
| Feldolgozott útmutató | 83 / 83 |
| 2012 utáni feladat figyelmeztetéssel | 0 / 253 |
| Ismeretlen függvénynév | 0 |
| Pontszám-ellenőrzés | mind a 64 pontozótábla pontosan 100 vagy 120 pontot ad |
| Teszt | 65 (`python -m pytest extractor/tests`) |
| Lighthouse | akadálymentesség 100, gyakorlat 100, SEO 100; teljesítmény 99 (Vizsgák), 96 (Táblázatkezelés), 87 (Áttekintés) |

A bővítés-menet ellenőrizve: egy időszakot kivéve és `--period`-del visszatéve
minden kimeneti fájl **bitre azonos** a teljes újraépítéssel.

Az Áttekintés a legterheltebb oldal: két diagram és nyolc metrika kell hozzá,
ezért marad a 90-es cél alatt. A többi oldal 96 fölött van.

## Forrás és szerzői jog

A feladatlapok, javítási-értékelési útmutatók és mintamegoldások az Oktatási Hivatal
nyilvános érettségi anyagai. Ez a projekt ezekből kizárólag aggregált számokat közöl;
a feladatok és útmutatók szövege nem kerül nyilvánosságra.
