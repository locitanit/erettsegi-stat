# Szótárak

Ezek hajtják az extractor keresését. A kódban nincs beégetett függvény- vagy
kulcsszónév – ha valami hiányzik, **itt** vedd fel, ne a kódban.

A fájlok az 1–3. fázisban készülnek el:

| Fájl | Fázis | Mit tartalmaz |
|---|---|---|
| `excel_functions.yaml` | 1. | kanonikus magyar függvénynév, angol/LibreOffice alias, család |
| `sql_keywords.yaml` | 2. | SQL-záradékok és -függvények |
| `algorithm_keywords.yaml` | 2. | típusalgoritmusok magyar kulcsszavai |
| `text_ops.yaml` | 3. | szövegszerkesztési műveletek |
| `web_tags.yaml`, `css_props.yaml` | 3. | HTML-elemek, CSS-tulajdonságok |
| `presentation_ops.yaml` | 3. | prezentáció és grafika műveletei |

Ismeretlen találatot az extractor nem dob el: az `_unknown` listába teszi, és a
`data/VALIDATION.md` kiírja.
