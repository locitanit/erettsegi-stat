import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import { analysedExams, downloadCsv, toCsv } from "../data/aggregate";
import { hu, loadExams, loadMetrics, loadVocab } from "../data/loader";
import { periodKey, periodSteps, rangeIndexes } from "../data/periods";
import type { Exam, MetricsFile, VocabFile } from "../data/types";
import { useFilters } from "../state/filters";

interface EsedekesRow {
  key: string;
  label: string;
  kind: "Függvény" | "Készség";
  family: string;
  examCount: number;
  firstLabel: string;
  lastLabel: string;
  /** Hány időszak telt el az utolsó előfordulás óta a tartomány végéig. */
  since: number;
}

/** Színskála: minél régebben volt, annál erősebb a jelölés. */
function ageStyle(since: number): React.CSSProperties {
  if (since >= 8) return { borderColor: "var(--warn)", color: "var(--warn)", background: "var(--warn-soft)" };
  if (since >= 4) return { borderColor: "var(--border-strong)", color: "var(--text)" };
  return { color: "var(--text-muted)" };
}

export default function Esedekes() {
  const [filters, update] = useFilters();
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"since" | "count">("since");
  const [error, setError] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[] | null>(null);
  const [vocab, setVocab] = useState<VocabFile | null>(null);
  const [functions, setFunctions] = useState<MetricsFile | null>(null);
  const [skills, setSkills] = useState<MetricsFile | null>(null);

  useEffect(() => {
    Promise.all([
      loadExams(),
      loadVocab(),
      loadMetrics("excel_functions.json"),
      loadMetrics("tablazat_skills.json"),
    ])
      .then(([e, v, f, s]) => {
        setExams(e.exams);
        setVocab(v);
        setFunctions(f);
        setSkills(s);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const steps = useMemo(
    () => periodSteps((exams ?? []).filter((e) => e.variant === "normal")),
    [exams],
  );
  const [fromIndex, toIndex] = rangeIndexes(steps, filters.from, filters.to);
  const rangeKeys = useMemo(
    () => steps.slice(fromIndex, toIndex + 1).map((s) => s.key),
    [steps, fromIndex, toIndex],
  );
  const scope = useMemo(
    () => analysedExams(exams ?? [], filters, rangeKeys),
    [exams, filters, rangeKeys],
  );

  const rows = useMemo(() => {
    if (!exams) return [];
    /** Az időszakok sorrendje a tartományon belül – ebből jön a "hány időszak telt el". */
    const order = new Map(rangeKeys.map((k, i) => [k, i]));
    const lastIndex = rangeKeys.length - 1;

    const famOf = new Map((vocab?.functions ?? []).map((f) => [f.canon, f.family]));
    const skillLabel = new Map((vocab?.tablazat_skills ?? []).map((s) => [s.key, s.label]));

    const collect = (
      metrics: MetricsFile | null,
      kind: EsedekesRow["kind"],
      label: (k: string) => string,
      family: (k: string) => string,
    ): EsedekesRow[] => {
      if (!metrics) return [];
      const seen = new Map<string, { first: Exam; last: Exam; n: number }>();
      for (const e of scope) {
        const bucket = metrics.by_exam[e.id];
        if (!bucket) continue;
        const idx = order.get(periodKey(e.year, e.month)) ?? 0;
        for (const key of Object.keys(bucket)) {
          const cur = seen.get(key);
          if (!cur) {
            seen.set(key, { first: e, last: e, n: 1 });
          } else {
            cur.n += 1;
            const curFirst = order.get(periodKey(cur.first.year, cur.first.month)) ?? 0;
            const curLast = order.get(periodKey(cur.last.year, cur.last.month)) ?? 0;
            if (idx < curFirst) cur.first = e;
            if (idx > curLast) cur.last = e;
          }
        }
      }
      return [...seen.entries()].map(([key, v]) => {
        const lastIdx = order.get(periodKey(v.last.year, v.last.month)) ?? 0;
        return {
          key,
          label: label(key),
          kind,
          family: family(key),
          examCount: v.n,
          firstLabel: v.first.period_label,
          lastLabel: v.last.period_label,
          since: lastIndex - lastIdx,
        };
      });
    };

    const all = [
      ...collect(
        functions,
        "Függvény",
        (k) => k,
        (k) => vocab?.function_families[famOf.get(k) ?? ""] ?? "",
      ),
      ...collect(skills, "Készség", (k) => skillLabel.get(k) ?? k, () => "táblázatkezelés"),
    ];

    const needle = q.trim().toLowerCase();
    return all
      .filter((r) => {
        if (!needle) return true;
        const aliases =
          vocab?.functions.find((f) => f.canon === r.key)?.aliases.join(" ").toLowerCase() ?? "";
        return `${r.label} ${r.key} ${aliases}`.toLowerCase().includes(needle);
      })
      .sort((a, b) =>
        sortBy === "since"
          ? b.since - a.since || b.examCount - a.examCount
          : b.examCount - a.examCount || b.since - a.since,
      );
  }, [exams, vocab, functions, skills, scope, rangeKeys, q, sortBy]);

  if (error) {
    return (
      <PageLayout title="Mikor volt utoljára">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <FilterBar
        steps={steps}
        fromIndex={fromIndex}
        toIndex={toIndex}
        filters={filters}
        update={update}
        examCount={scope.length}
      />
      <PageLayout
        title="Mikor volt utoljára"
        lead="Minden függvény és készség első és utolsó előfordulása a kiválasztott tartományban. A jobb szélső oszlop azt mutatja, hány vizsgaidőszak telt el azóta."
        actions={
          <button
            className="btn flex items-center gap-1.5"
            onClick={() =>
              downloadCsv(
                "mikor_volt_utoljara.csv",
                toCsv(
                  ["megnevezes", "tipus", "csalad", "vizsga_db", "elso", "utolso", "eltelt_idoszak"],
                  rows.map((r) => [
                    r.label,
                    r.kind,
                    r.family,
                    r.examCount,
                    r.firstLabel,
                    r.lastLabel,
                    r.since,
                  ]),
                ),
              )
            }
            disabled={!rows.length}
          >
            <Download size={14} aria-hidden />
            CSV letöltés
          </button>
        }
      >
        <div className="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-3">
          <label className="flex items-center gap-2">
            <Search size={14} aria-hidden style={{ color: "var(--text-faint)" }} />
            <input
              className="input w-[220px]"
              type="search"
              placeholder="Keresés (magyar vagy angol név)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Keresés függvényre vagy készségre"
            />
          </label>
          <div className="flex items-center gap-2">
            <span className="t-small" style={{ color: "var(--text-faint)" }}>
              Rendezés
            </span>
            <button
              className="btn"
              aria-pressed={sortBy === "since"}
              onClick={() => setSortBy("since")}
            >
              Régen volt
            </button>
            <button
              className="btn"
              aria-pressed={sortBy === "count"}
              onClick={() => setSortBy("count")}
            >
              Gyakoriság
            </button>
          </div>
          <span className="t-small ml-auto">{hu.format(rows.length)} tétel</span>
        </div>

        <div className="card overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Megnevezés</th>
                <th>Típus</th>
                <th>Család</th>
                <th className="text-right">Vizsga</th>
                <th>Első</th>
                <th>Utolsó</th>
                <th className="text-right">Eltelt időszak</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.key}`}>
                  <td className={r.kind === "Függvény" ? "t-mono" : ""}>{r.label}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.kind}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.family}</td>
                  <td className="text-right">{hu.format(r.examCount)}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.firstLabel}</td>
                  <td>{r.lastLabel}</td>
                  <td className="text-right">
                    <span className="badge" style={ageStyle(r.since)}>
                      {r.since === 0 ? "legutóbb" : `${r.since} időszak`}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="t-small" style={{ color: "var(--text-muted)" }}>
                    Nincs találat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageLayout>
    </>
  );
}
