import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import ChartCard from "../components/ChartCard";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import Tabs from "../components/Tabs";
import RankChart from "../charts/RankChart";
import TrendChart from "../charts/TrendChart";
import { aggregate, downloadCsv, sortedBy, toCsv, trendByPeriod } from "../data/aggregate";
import { hu } from "../data/loader";
import { labelMap, useAnalysis } from "../state/useAnalysis";

const FILES = [
  "algorithms.json",
  "programozas_io.json",
  "solution_langs.json",
  "programozas_shape.json",
];
type Tab = "algoritmusok" | "nyelvek" | "feladat";

export default function Programozas() {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, withData,
  } = useAnalysis(FILES);
  const [tab, setTab] = useState<Tab>("algoritmusok");

  const scope = withData("algorithms.json");
  const algorithms = metrics["algorithms.json"] ?? null;
  const io = metrics["programozas_io.json"] ?? null;
  const langs = metrics["solution_langs.json"] ?? null;
  const shape = metrics["programozas_shape.json"] ?? null;

  const algoLabel = useMemo(() => labelMap(vocab?.algorithms), [vocab]);
  const ioLabel = useMemo(() => labelMap(vocab?.programozas_io), [vocab]);

  // A kulcsszo-talalatok nyers szama felrevezeto (egy hosszabb feladatszovegben
  // tobbszor szerepel ugyanaz a szo), ezert a merteke "hany vizsgan fordult elo".
  const value = (r: { pct: number; examCount: number }) =>
    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.examCount;
  const unit = filters.norm === "pct" ? "%" : "vizsga";

  const algoRows = useMemo(
    () => sortedBy(aggregate(algorithms, scope), value),
    [algorithms, scope, filters.norm],
  );
  const ioRows = useMemo(() => sortedBy(aggregate(io, scope), value), [io, scope, filters.norm]);
  const langRows = useMemo(() => aggregate(langs, scope), [langs, scope]);

  if (error) {
    return (
      <PageLayout title="Programozás">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  const shapeLabels = trendByPeriod(shape, scope, "subtask_count").map((p) => p.label);
  const shapeSeries = (key: string) => trendByPeriod(shape, scope, key).map((p) => p.value);

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
        title="Programozás"
        lead="A feladatlapok és útmutatók szövegéből becsült típusalgoritmusok, a be- és kimenet módja, és az OH mintamegoldásainak nyelve."
      >
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "algoritmusok", label: "Típusalgoritmusok" },
            { value: "nyelvek", label: "Nyelvek" },
            { value: "feladat", label: "A feladat mérete" },
          ]}
        />

        {!scope.length && (
          <div className="card p-6">
            <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
              A kiválasztott tartományban nincs programozás-adat. Tágítsd az időszakot.
              Középszinten 2022 előtt nem volt programozás-feladat.
            </p>
          </div>
        )}

        {tab === "algoritmusok" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Mely típusalgoritmusokra utal a feladat szövege"
              note={`n = ${hu.format(scope.length)} vizsga · kulcsszó-alapú becslés: hány vizsgán utal rá a szöveg`}
              actions={
                <button
                  className="btn flex items-center gap-1.5"
                  onClick={() =>
                    downloadCsv(
                      "tipusalgoritmusok.csv",
                      toCsv(
                        ["algoritmus", "vizsga_db", "talalat_db", "vizsgak_szazaleka", "elso", "utolso"],
                        algoRows.map((r) => [
                          algoLabel(r.key),
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
                rows={algoRows}
                label={(r) => algoLabel(r.key)}
                value={value}
                unit={unit}
                colorIndex={3}
                ariaLabel="Típusalgoritmusok rangsora"
              />
            </ChartCard>

            <ChartCard
              title="Honnan jön az adat és hova megy az eredmény"
              note="a feladatszöveg és az útmutató megfogalmazásai alapján"
            >
              <RankChart
                rows={ioRows}
                label={(r) => ioLabel(r.key)}
                value={value}
                unit={unit}
                colorIndex={1}
                ariaLabel="Be- és kimenet módja"
              />
            </ChartCard>
          </div>
        )}

        {tab === "nyelvek" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Milyen nyelven adja ki az OH a mintamegoldást"
              note={`n = ${hu.format(scope.length)} vizsga · egy vizsgához több nyelv is tartozhat`}
            >
              <RankChart
                rows={langRows}
                value={(r) => r.examCount}
                unit="vizsga"
                colorIndex={4}
                ariaLabel="Mintamegoldások nyelve"
              />
            </ChartCard>

            <ChartCard
              title="Mikor jelent meg egy-egy nyelv"
              note="hány vizsgán szerepelt az adott időszakban"
            >
              <TrendChart
                labels={trendByPeriod(langs, scope, langRows[0]?.key ?? "").map((p) => p.label)}
                series={langRows.map((r) => ({
                  name: r.key,
                  data: trendByPeriod(langs, scope, r.key).map((p) => p.value),
                }))}
                stacked
                height={300}
                ariaLabel="Mintamegoldás-nyelvek időszakonként"
              />
            </ChartCard>
          </div>
        )}

        {tab === "feladat" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Hány részfeladatból áll a programozás-feladat"
              note={`n = ${hu.format(scope.length)} vizsga`}
            >
              <TrendChart
                labels={shapeLabels}
                series={[{ name: "Részfeladatok száma", data: shapeSeries("subtask_count") }]}
                ariaLabel="Részfeladatok száma időszakonként"
              />
            </ChartCard>

            <ChartCard
              title="Mekkora adathalmazzal kell dolgozni"
              note="a forrásállomány sorainak száma"
            >
              <TrendChart
                labels={shapeLabels}
                series={[{ name: "Sorok száma", data: shapeSeries("input_rows") }]}
                ariaLabel="A forrásállomány mérete időszakonként"
              />
            </ChartCard>

          </div>
        )}
      </PageLayout>
    </>
  );
}
