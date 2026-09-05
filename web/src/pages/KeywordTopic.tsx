import { useMemo } from "react";
import { Download } from "lucide-react";
import ChartCard from "../components/ChartCard";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import RankChart from "../charts/RankChart";
import { aggregate, downloadCsv, toCsv } from "../data/aggregate";
import { hu } from "../data/loader";
import type { VocabFile } from "../data/types";
import { labelMap, useAnalysis } from "../state/useAnalysis";

/**
 * Kozos oldal a kulcsszo-alapu temakorokhoz (szovegszerkesztes, prezentacio).
 * A rangsor a "hany vizsgan fordult elo" merteket hasznalja: a nyers talalatszam
 * a hosszabb utmutatoknal felrevezeto lenne.
 */
export default function KeywordTopic({
  title,
  lead,
  metricFile,
  vocabKey,
  csvName,
  colorIndex,
  note,
}: {
  title: string;
  lead: string;
  metricFile: string;
  vocabKey: keyof Pick<VocabFile, "text_ops" | "presentation_ops" | "web_ops">;
  csvName: string;
  colorIndex: number;
  note?: string;
}) {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, withData,
  } = useAnalysis([metricFile]);

  const scope = withData(metricFile);
  const data = metrics[metricFile] ?? null;
  const label = useMemo(() => labelMap(vocab?.[vocabKey]), [vocab, vocabKey]);
  const rows = useMemo(() => aggregate(data, scope), [data, scope]);

  const value = (r: { pct: number; examCount: number }) =>
    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.examCount;
  const unit = filters.norm === "pct" ? "%" : "vizsga";

  if (error) {
    return (
      <PageLayout title={title}>
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
      <PageLayout title={title} lead={lead}>
        {!scope.length ? (
          <div className="card p-6">
            <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
              A kiválasztott tartományban nincs adat ehhez a témakörhöz. Tágítsd az időszakot.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <ChartCard
              title="Mely műveleteket kéri a feladat"
              note={
                note ??
                `n = ${hu.format(scope.length)} vizsga · hány vizsgán szerepel az útmutató szövegében`
              }
              actions={
                <button
                  className="btn flex items-center gap-1.5"
                  onClick={() =>
                    downloadCsv(
                      csvName,
                      toCsv(
                        ["muvelet", "vizsga_db", "talalat_db", "vizsgak_szazaleka", "elso", "utolso"],
                        rows.map((r) => [
                          label(r.key),
                          r.examCount,
                          r.total,
                          r.pct.toFixed(1),
                          r.first ?? "",
                          r.last ?? "",
                        ]),
                      ),
                    )
                  }
                >
                  <Download size={14} aria-hidden />
                  CSV letöltés
                </button>
              }
            >
              <RankChart
                rows={rows}
                label={(r) => label(r.key)}
                value={value}
                unit={unit}
                colorIndex={colorIndex}
                ariaLabel={`${title}: műveletek rangsora`}
              />
            </ChartCard>

          </div>
        )}
      </PageLayout>
    </>
  );
}
