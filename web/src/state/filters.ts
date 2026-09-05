import { useSearchParams } from "react-router-dom";

/**
 * Szuroallapot a query stringben, hogy minden nezet linkelheto legyen (TERV 3.2).
 * Az alapertek soha nem kerul bele az URL-be, igy a linkek rovidek maradnak.
 */
export interface Filters {
  q: string;
  level: "" | "kozep" | "emelt";
  subject: "" | "digitalis_kultura" | "informatika";
  idegen: boolean; // alapertelmezetten kikapcsolva (TERV 11/4)
}

const DEFAULTS: Filters = { q: "", level: "", subject: "", idegen: false };

export function useFilters(): [Filters, (patch: Partial<Filters>) => void, () => void] {
  const [params, setParams] = useSearchParams();

  const filters: Filters = {
    q: params.get("q") ?? DEFAULTS.q,
    level: (params.get("level") as Filters["level"]) ?? DEFAULTS.level,
    subject: (params.get("subject") as Filters["subject"]) ?? DEFAULTS.subject,
    idegen: params.get("idegen") === "1",
  };

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    if (next.level) p.set("level", next.level);
    if (next.subject) p.set("subject", next.subject);
    if (next.idegen) p.set("idegen", "1");
    setParams(p, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  return [filters, update, reset];
}
