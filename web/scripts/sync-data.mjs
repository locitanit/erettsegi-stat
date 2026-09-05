// A repo gyokerenek data/ mappajabol masolja a webnek szant fajlokat a public/data ala.
//
// FONTOS: kifejezett engedelyezolista, nem szuro. A data/_cache a PDF-ek TELJES
// szoveget tartalmazza (szerzoi jog), ez soha nem kerulhet a webre. Amit nem
// sorolunk fel itt, az nem publikalodik.
import { cp, mkdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..", "..", "data");
const dest = resolve(here, "..", "public", "data");

/** Csak ezek a bejegyzesek kerulnek at (fajl vagy mappa). */
const ALLOW = [
  "exams.json",
  "tasks.json",
  "vocab.json",
  "schema.json",
  "metrics",
  "VALIDATION.md",
  "CHANGELOG.md",
];

/** Sose masoljuk, meg akkor sem, ha valahogy belekerulne egy engedelyezett mappaba. */
const DENY_SEGMENTS = new Set(["_cache"]);

if (!existsSync(src)) {
  console.error(`[sync-data] Nincs meg a forrasmappa: ${src}`);
  console.error("[sync-data] Futtasd eloszor: python -m extractor --all");
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });

let copied = 0;
for (const name of ALLOW) {
  const from = join(src, name);
  if (!existsSync(from)) continue;
  const info = await stat(from);
  await cp(from, join(dest, name), {
    recursive: info.isDirectory(),
    filter: (p) => !p.split(/[\\/]/).some((seg) => DENY_SEGMENTS.has(seg)),
  });
  copied += 1;
}

console.log(`[sync-data] ${copied} bejegyzes: ${src} -> ${dest}`);
