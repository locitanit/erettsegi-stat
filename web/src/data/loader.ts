import type { ExamsFile, MetricsFile, VocabFile } from "./types";

/** A data/ mappa a Vite base-hez kepest (public/data alol szolgaljuk ki). */
const dataUrl = (name: string) => `${import.meta.env.BASE_URL}data/${name}`;

let cache: Promise<ExamsFile> | null = null;

function validate(raw: unknown): ExamsFile {
  if (!raw || typeof raw !== "object") throw new Error("Az exams.json nem objektum.");
  const file = raw as ExamsFile;
  if (!Array.isArray(file.exams)) throw new Error("Az exams.json nem tartalmaz 'exams' listát.");
  for (const e of file.exams) {
    if (typeof e.id !== "string" || typeof e.year !== "number") {
      throw new Error("Hibás vizsgarekord az exams.json fájlban.");
    }
  }
  return file;
}

export function loadExams(): Promise<ExamsFile> {
  if (!cache) {
    cache = fetch(dataUrl("exams.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`Nem sikerült betölteni: exams.json (HTTP ${r.status})`);
        return r.json();
      })
      .then(validate)
      .catch((err) => {
        cache = null;
        throw err;
      });
  }
  return cache;
}

export const monthLabel: Record<number, string> = {
  1: "január", 2: "február", 3: "március", 4: "április", 5: "május", 6: "június",
  7: "július", 8: "augusztus", 9: "szeptember", 10: "október", 11: "november", 12: "december",
};

export const levelLabel: Record<string, string> = { kozep: "közép", emelt: "emelt" };
export const subjectLabel: Record<string, string> = {
  informatika: "informatika",
  digitalis_kultura: "digitális kultúra",
};

export const hu = new Intl.NumberFormat("hu-HU");

/** Rovid temakor-cimkek a tablazatok szuk oszlopaiba. */
export const topicShort: Record<string, string> = {
  szoveg: "Szöveg",
  tablazat: "Táblázat",
  adatbazis: "Adatbázis",
  programozas: "Programozás",
  weblap: "Weblap",
  prezentacio: "Prezentáció",
  prezentacio_grafika: "Prez. + grafika",
};

let vocabCache: Promise<VocabFile> | null = null;
const metricsCache = new Map<string, Promise<MetricsFile>>();

function fetchJson<T>(url: string, what: string): Promise<T> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Nem sikerült betölteni: ${what} (HTTP ${r.status})`);
    return r.json() as Promise<T>;
  });
}

export function loadVocab(): Promise<VocabFile> {
  if (!vocabCache) {
    vocabCache = fetchJson<VocabFile>(dataUrl("vocab.json"), "vocab.json").catch((e) => {
      vocabCache = null;
      throw e;
    });
  }
  return vocabCache;
}

interface MetricsBundle {
  generated_by: string;
  files: Record<string, MetricsFile["by_exam"]>;
}

let bundleCache: Promise<MetricsBundle> | null = null;

/**
 * Minden metrika egyetlen gyujtofajlbol (`metrics/_all.json`). Kulon-kulon
 * huszonegy apro fajl lekerese a halozati kesleltetes miatt tobb masodperc lenne;
 * a gyujtofajl tomoritve ~20 kB. Ha hianyzik, az egyedi fajl a tartalek.
 */
function loadBundle(): Promise<MetricsBundle> {
  if (!bundleCache) {
    bundleCache = fetchJson<MetricsBundle>(dataUrl("metrics/_all.json"), "_all.json").catch(
      (e) => {
        bundleCache = null;
        throw e;
      },
    );
  }
  return bundleCache;
}

/** Egy metrika, pl. "excel_functions.json". */
export function loadMetrics(name: string): Promise<MetricsFile> {
  let p = metricsCache.get(name);
  if (!p) {
    p = loadBundle()
      .then((bundle) => {
        const by_exam = bundle.files[name];
        if (!by_exam) throw new Error(`hiányzó metrika: ${name}`);
        return { generated_by: bundle.generated_by, by_exam };
      })
      .catch(() => fetchJson<MetricsFile>(dataUrl(`metrics/${name}`), name))
      .catch((e) => {
        metricsCache.delete(name);
        throw e;
      });
    metricsCache.set(name, p);
  }
  return p;
}
