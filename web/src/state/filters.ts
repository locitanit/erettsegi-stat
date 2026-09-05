import { useSearchParams } from "react-router-dom";

/**
 * Szuroallapot a query stringben, hogy minden nezet linkelheto legyen (TERV 3.2).
 * Az alapertek soha nem kerul bele az URL-be, igy a linkek rovidek maradnak.
 *
 * Az idegen nyelvu vizsgak nem szerepelnek az elemzesben (a tanar dontese), ezert
 * csak a Vizsgak-lista ismeri az `idegen` kapcsolot.
 */
export interface Filters {
  q: string;
  level: "" | "kozep" | "emelt";
  subject: "" | "digitalis_kultura" | "informatika";
  idegen: boolean;
  /** Az idoszak-tartomany hatarai "2022m" alakban; ures = a teljes tartomany. */
  from: string;
  to: string;
  /** Darabszam vagy "a vizsgák %-a, ahol előfordult". */
  norm: "db" | "pct";
}

const DEFAULTS: Filters = {
  q: "",
  level: "",
  subject: "",
  idegen: false,
  from: "",
  to: "",
  norm: "db",
};

export function useFilters(): [Filters, (patch: Partial<Filters>) => void, () => void] {
  const [params, setParams] = useSearchParams();

  const filters: Filters = {
    q: params.get("q") ?? DEFAULTS.q,
    level: (params.get("level") as Filters["level"]) ?? DEFAULTS.level,
    subject: (params.get("subject") as Filters["subject"]) ?? DEFAULTS.subject,
    idegen: params.get("idegen") === "1",
    from: params.get("from") ?? DEFAULTS.from,
    to: params.get("to") ?? DEFAULTS.to,
    norm: params.get("norm") === "pct" ? "pct" : "db",
  };

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    if (next.level) p.set("level", next.level);
    if (next.subject) p.set("subject", next.subject);
    if (next.idegen) p.set("idegen", "1");
    if (next.from) p.set("from", next.from);
    if (next.to) p.set("to", next.to);
    if (next.norm !== DEFAULTS.norm) p.set("norm", next.norm);
    setParams(p, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  return [filters, update, reset];
}
