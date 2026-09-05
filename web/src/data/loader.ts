import type { ExamsFile } from "./types";

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
