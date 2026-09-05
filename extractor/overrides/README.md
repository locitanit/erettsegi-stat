# Kézi javítások (override-ok)

Itt lehet felülírni azt, amit az extractor rosszul vagy sehogy sem talál meg.
A kódot **nem kell** módosítani hozzá.

## Fájlnév

Egy fájl egy időszak + szint párosra:

```
<év>_<hónap>_<szint>.yaml        pl. 2019_majus_emelt.yaml
<év>_<hónap>_<szint>_idegen.yaml pl. 2023_majus_kozep_idegen.yaml
```

Ékezet nélkül, kisbetűvel, aláhúzással.

## Tartalom

```yaml
# Szabad szöveges megjegyzés, ami megjelenik a Vizsgák oldalon.
notes: "Az útmutató 2019-ben másképp számozza a feladatokat."

# Az útmutató-PDF vágása témakörönként, oldaltartománnyal (1-től számozva).
# Csak akkor kell, ha az automatikus vágás elrontja (a VALIDATION.md jelzi).
utmutato_split:
  tablazat: [3, 7]
  adatbazis: [8, 11]

# Fájlok, amiket ne vegyen figyelembe (fájlnév, kis-nagybetű mindegy).
exclude:
  - "regi_valtozat.xlsx"
```

Minden mező elhagyható. Ami itt szerepel, az felülírja az automatikus értéket, és az
adott rekord `provenance` mezőjébe bekerül, hogy honnan jött.

## Mikor kell

1. Futtasd az extractort.
2. Nézd meg a `data/VALIDATION.md` riportot.
3. Ha egy vizsgánál értelmetlen szám vagy figyelmeztetés van, írj ide egy fájlt.
4. Futtasd újra – a gyorsítótár miatt gyors.

Ha egy **függvénynév** hiányzik, azt ne itt javítsd, hanem az
`extractor/vocab/excel_functions.yaml` szótárban.
