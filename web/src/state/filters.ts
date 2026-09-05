import { useSearchParams } from "react-router-dom";

/**
 * Szuroallapot a query stringben, hogy minden nezet linkelheto legyen (TERV 3.2).
 * A menu megorzi a query stringet, igy a beallitas oldalvaltaskor megmarad.
 *
 * Csak az alapertektol elteroe" kerul az URL-be, igy a linkek rovidek maradnak.
 *
 * Az idegen nyelvu vizsgak nem szerepelnek az elemzesben (a tanar dontese), ezert
 * csak a Vizsgak-lista ismeri az `idegen` kapcsolot.
 */
export interface Filters {
  q: string;
  level: "" | "kozep" | "emelt";
  subject: "" | "digitalis_kultura" | "informatika";
  idegen: boolean;
  /** Az idoszak-tartomany hatarai "2022m" alakban; ures = a teljes tartomany vege. */
  from: string;
  to: string;
  /** Darabszam vagy "a vizsgák %-a, ahol előfordult". */
  norm: "db" | "pct";
}

/**
 * Alapertelmezes: a digitalis kultura korszaka (2022-), emelt szint,
 * es a vizsgak szazalekaban mert gyakorisag - ez az osszehasonlithato mertek.
 */
export const DEFAULTS: Filters = {
  q: "",
  level: "emelt",
  subject: "digitalis_kultura",
  idegen: false,
  from: "2022m",
  to: "",
  norm: "pct",
};

/** Ha egy szuro erteke elter az alapertektol, bekerul az URL-be. */
function toParams(next: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.level !== DEFAULTS.level) p.set("level", next.level || "mind");
  if (next.subject !== DEFAULTS.subject) p.set("subject", next.subject || "mind");
  if (next.idegen !== DEFAULTS.idegen) p.set("idegen", next.idegen ? "1" : "0");
  if (next.from !== DEFAULTS.from) p.set("from", next.from || "mind");
  if (next.to !== DEFAULTS.to) p.set("to", next.to);
  if (next.norm !== DEFAULTS.norm) p.set("norm", next.norm);
  return p;
}

/** A "mind" jelzi, hogy a szuro szandekosan ures - kulonben az alapertek jonne. */
function read<T extends string>(params: URLSearchParams, key: string, fallback: T): T {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return (raw === "mind" ? "" : raw) as T;
}

export function useFilters(): [Filters, (patch: Partial<Filters>) => void, () => void] {
  const [params, setParams] = useSearchParams();

  const filters: Filters = {
    q: params.get("q") ?? DEFAULTS.q,
    level: read(params, "level", DEFAULTS.level),
    subject: read(params, "subject", DEFAULTS.subject),
    idegen: params.has("idegen") ? params.get("idegen") === "1" : DEFAULTS.idegen,
    from: read(params, "from", DEFAULTS.from),
    to: params.get("to") ?? DEFAULTS.to,
    norm: params.has("norm") ? (params.get("norm") === "pct" ? "pct" : "db") : DEFAULTS.norm,
  };

  const update = (patch: Partial<Filters>) =>
    setParams(toParams({ ...filters, ...patch }), { replace: true });

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  return [filters, update, reset];
}
