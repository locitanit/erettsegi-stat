import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import ChartCard from "../components/ChartCard";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import Tabs from "../components/Tabs";
import RankChart from "../charts/RankChart";
import TrendChart from "../charts/TrendChart";
import { aggregate, downloadCsv, occurrences, toCsv, trendByPeriod } from "../data/aggregate";
import { hu, levelLabel } from "../data/loader";
import { labelMap, useAnalysis } from "../state/useAnalysis";

const FILES = ["sql_clauses.json", "sql_clauses_files.json", "adatbazis_complexity.json"];
type Tab = "zaradekok" | "komplexitas";

export default function Adatbazis() {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, withData,
  } = useAnalysis(FILES);
  const [tab, setTab] = useState<Tab>("zaradekok");
  const [selected, setSelected] = useState<string | null>(null);

  const scope = withData("sql_clauses.json");
  const clauses = metrics["sql_clauses.json"] ?? null;
  const fromFiles = metrics["sql_clauses_files.json"] ?? null;
  const complexity = metrics["adatbazis_complexity.json"] ?? null;

  const label = useMemo(() => labelMap(vocab?.sql_keywords), [vocab]);
  const rows = useMemo(() => aggregate(clauses, scope), [clauses, scope]);
  const fileRows = useMemo(() => aggregate(fromFiles, scope), [fromFiles, scope]);

  const value = (r: { pct: number; total: number }) =>
    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.total;
  const unit = filters.norm === "pct" ? "%" : "lekérdezés";

  if (error) {
    return (
      <PageLayout title="Adatbázis-kezelés">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  const trendLabels = trendByPeriod(complexity, scope, "query_count").map((p) => p.label);
  const series = (key: string) => trendByPeriod(complexity, scope, key).map((p) => p.value);

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
        title="Adatbázis-kezelés"
        lead="A javítási útmutatók mintalekérdezéseiből kinyert SQL-záradékok, a lekérdezések száma és összetettsége."
      >
        <Tabs
          value={tab}
          onChange={(t) => {
            setTab(t);
            setSelected(null);
          }}
          options={[
            { value: "zaradekok", label: "Záradékok" },
            { value: "komplexitas", label: "Komplexitás" },
          ]}
        />

        {!scope.length && (
          <div className="card p-6">
            <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
              A kiválasztott tartományban nincs adatbázis-adat. Tágítsd az időszakot.
            </p>
          </div>
        )}

        {tab === "zaradekok" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Melyik SQL-elem fordul elő a leggyakrabban"
              note={`n = ${hu.format(scope.length)} vizsga · kattints egy sávra a részletekért`}
              actions={
                <button
                  className="btn flex items-center gap-1.5"
                  onClick={() =>
                    downloadCsv(
                      "sql_zaradekok.csv",
                      toCsv(
                        ["elem", "lekerdezes_db", "vizsga_db", "vizsgak_szazaleka", "elso", "utolso"],
                        rows.map((r) => [
                          label(r.key),
                          r.total,
                          r.examCount,
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
                onSelect={setSelected}
                colorIndex={2}
                ariaLabel="SQL-elemek gyakorisági rangsora"
              />
            </ChartCard>

            {selected && (
              <ChartCard
                title={`${label(selected)} – időbeli alakulás`}
                note={`${hu.format(
                  occurrences(clauses, scope, selected).length,
                )} vizsgán fordult elő a tartományban`}
                actions={
                  <button className="btn" onClick={() => setSelected(null)}>
                    Bezárás
                  </button>
                }
              >
                <TrendChart
                  labels={trendByPeriod(clauses, scope, selected).map((p) => p.label)}
                  series={[
                    {
                      name: label(selected),
                      data: trendByPeriod(clauses, scope, selected).map((p) => p.value),
                    },
                  ]}
                  height={220}
                  ariaLabel={`${label(selected)} előfordulása időszakonként`}
                />
                <div className="mt-3 max-h-[200px] overflow-auto">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Időszak</th>
                        <th>Szint</th>
                        <th className="text-right">Lekérdezés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {occurrences(clauses, scope, selected).map(({ exam, count }) => (
                        <tr key={exam.id}>
                          <td>{exam.period_label}</td>
                          <td>{levelLabel[exam.level]}</td>
                          <td className="text-right">{hu.format(count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}

            {fileRows.length > 0 && (
              <ChartCard
                title="Ugyanez a kiadott .sql mintamegoldásokból"
                note="megerősítés: 2022-től az OH kiadja a megoldásfájlokat is"
              >
                <RankChart
                  rows={fileRows.slice(0, 15)}
                  label={(r) => label(r.key)}
                  value={(r) => r.total}
                  unit="lekérdezés"
                  colorIndex={5}
                  ariaLabel="SQL-elemek a mintamegoldásokból"
                />
              </ChartCard>
            )}
          </div>
        )}

        {tab === "komplexitas" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Hány lekérdezést kér a feladat"
              note={`n = ${hu.format(scope.length)} vizsga · időszakonként összegezve`}
            >
              <TrendChart
                labels={trendLabels}
                series={[{ name: "Lekérdezések száma", data: series("query_count") }]}
                ariaLabel="Lekérdezések száma időszakonként"
              />
            </ChartCard>

            <ChartCard
              title="Mennyire összetettek a lekérdezések"
              note="a legtöbb tábla egy lekérdezésben, a legtöbb WHERE-feltétel, és az alkérdezések száma"
            >
              <TrendChart
                labels={trendLabels}
                series={[
                  { name: "Tábla egy lekérdezésben", data: series("max_tables_per_query") },
                  { name: "WHERE-feltétel", data: series("max_conditions") },
                  { name: "Alkérdezés", data: series("subquery_count") },
                ]}
                ariaLabel="Lekérdezés-komplexitás időszakonként"
              />
            </ChartCard>
          </div>
        )}
      </PageLayout>
    </>
  );
}
