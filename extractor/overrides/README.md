# Kézi javítások (override-ok)

Itt lehet felülírni azt, amit az extractor rosszul vagy sehogy sem talál meg.
A kódot **nem kell** módosítani hozzá.

Jelenleg egyetlen override sincs: mind a 83 útmutató hibátlanul feldolgozható.
Ez a mappa az októberi/májusi bővítéshez van, ha egy új időszak elcsúszik.

## Fájlnév

Egy fájl egy vizsgára:

```
<év>_<hónap>_<szint>.yaml                pl. 2010_majus_kozep.yaml
<év>_<hónap>_<szint>_idegen.yaml         idegen nyelvű változat
<év>_<hónap>_<szint>_informatika.yaml    2022–2023 átmeneti informatika-vizsga
```

Ékezet nélkül, kisbetűvel, aláhúzással. A hónap teljes néven: `majus`, `oktober`, `februar`.

## Mit lehet megadni

Minden mező elhagyható.

```yaml
# Szabad szöveg. Megjelenik a Vizsgák oldalon a vizsga sorában.
notes: "Az útmutató 2019-ben másképp számozza a feladatokat."

# Egy feladat szakaszának kezdete, ha a felismerés nem találja meg.
# A kulcs a feladat száma, az érték egy EGYEDI szövegrészlet az útmutatóból
# (elég a feladat címsora). Ékezet és kis-nagybetű nem számít.
section_starts:
  "2": "2A Vírusok"
  "5": "5. Létra"

# Egy feladat témaköre, ha az automatikus hozzárendelés téved.
task_topics:
  "3": [tablazat]
  "1": [szoveg, weblap]

# Vizsgapont kézzel, ha a pontozótábla hiányzik vagy hibás.
task_points:
  "2": 20

# Szakasz eldobása, ha a felismerés fölöslegeset talált.
skip_tasks: ["6"]

# Fájlok, amiket ne vegyen figyelembe (fájlnév-részlet, kis-nagybetű mindegy).
# Megoldás- és pontozótábla-fájlokra hat.
exclude:
  - "regi_valtozat.xlsx"
```

Érvényes témakör-nevek: `szoveg`, `tablazat`, `adatbazis`, `programozas`,
`weblap`, `prezentacio`, `prezentacio_grafika`.

## Mikor kell

1. Futtasd az extractort: `python -m extractor --period "2026 október"`
2. Nézd meg a `data/VALIDATION.md` riportot.
3. Ha egy vizsgánál értelmetlen szám vagy figyelmeztetés van, írj ide egy fájlt.
4. Futtasd újra – a gyorsítótár miatt gyors.

Amit az override adott, az bekerül a feladat `provenance.override` mezőjébe, tehát
később is látszik, mi nem automatikus.

Ha egy **függvénynév** hiányzik, azt ne itt javítsd, hanem az
`extractor/vocab/excel_functions.yaml` szótárban.
