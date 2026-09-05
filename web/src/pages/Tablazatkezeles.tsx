import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import type { EChartsOption } from "echarts";
import ChartCard from "../components/ChartCard";
import EChart from "../charts/EChart";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import RankChart from "../charts/RankChart";
import Tabs from "../components/Tabs";
import TrendChart from "../charts/TrendChart";
import { aggregate, downloadCsv, occurrences, toCsv, trendByPeriod } from "../data/aggregate";
import type { Row } from "../data/aggregate";
import { hu, levelLabel } from "../data/loader";
import type { Exam, MetricsFile, VocabFile } from "../data/types";
import { baseOption, chartTokens } from "../charts/theme";
import { labelMap, useAnalysis } from "../state/useAnalysis";

const FILES = [
  "excel_functions.json",
  "excel_function_pairs.json",
  "tablazat_skills.json",
  "tablazat_complexity.json",
];
type Tab = "fuggvenyek" | "keszsegek" | "komplexitas";

const TOP_N = 20;

export default function Tablazatkezeles() {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, withData,
  } = useAnalysis(FILES);
  const [tab, setTab] = useState<Tab>("fuggvenyek");
  const [selected, setSelected] = useState<string | null>(null);

  const scope = withData("excel_functions.json");
  const functions = metrics["excel_functions.json"] ?? null;
  const pairs = metrics["excel_function_pairs.json"] ?? null;
  const skills = metrics["tablazat_skills.json"] ?? null;
  const complexity = metrics["tablazat_complexity.json"] ?? null;

  const funcRows = useMemo(() => aggregate(functions, scope), [functions, scope]);
  const pairRows = useMemo(() => aggregate(pairs, scope), [pairs, scope]);
  const skillRows = useMemo(() => aggregate(skills, scope), [skills, scope]);
  const skillLabel = useMemo(() => labelMap(vocab?.tablazat_skills), [vocab]);

  const familyOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of vocab?.functions ?? []) map.set(f.canon, f.family);
    return map;
  }, [vocab]);

  /** A képlet-darabszám itt értelmes mérték: egy képlet egyszer számít. */
  const funcValue = (r: Row) => (filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.total);
  const funcUnit = filters.norm === "pct" ? "%" : "képlet";
  /** A készség-kulcsszavak nyers találatszáma félrevezető, ezért vizsgaszám. */
  const skillValue = (r: Row) =>
    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.examCount;
  const skillUnit = filters.norm === "pct" ? "%" : "vizsga";

  if (error) {
    return (
      <PageLayout title="Táblázatkezelés">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  const trendLabels = trendByPeriod(complexity, scope, "formula_count").map((p) => p.label);
  const trendSeries = (key: string) => trendByPeriod(complexity, scope, key).map((p) => p.value);

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
        title="Táblázatkezelés"
        lead="A javítási útmutatók mintaképleteiből kinyert függvények, együttes előfordulásuk és a feladatok készségigénye."
      >
        <Tabs
          value={tab}
          onChange={(t) => {
            setTab(t);
            setSelected(null);
          }}
          options={[
            { value: "fuggvenyek", label: "Függvények" },
            { value: "keszsegek", label: "Készségek" },
            { value: "komplexitas", label: "Komplexitás" },
          ]}
        />

        {!scope.length && (
          <div className="card p-6">
            <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
              A kiválasztott tartományban nincs táblázatkezelés-adat. Tágítsd az időszakot,
              vagy kapcsold ki a szint- és tárgyszűrőt.
            </p>
          </div>
        )}

        {tab === "fuggvenyek" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Melyik függvény fordul elő a leggyakrabban"
              note={`n = ${hu.format(scope.length)} vizsga · kattints egy sávra a részletekért`}
              actions={
                <button
                  className="btn flex items-center gap-1.5"
                  onClick={() =>
                    downloadCsv(
                      "tablazat_fuggvenyek.csv",
                      toCsv(
                        ["fuggveny", "csalad", "keplet_db", "vizsga_db", "vizsgak_szazaleka", "elso", "utolso"],
                        funcRows.map((r) => [
                          r.key,
                          vocab?.function_families[familyOf.get(r.key) ?? ""] ?? "",
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
                rows={funcRows.slice(0, TOP_N)}
                value={funcValue}
                unit={funcUnit}
                onSelect={setSelected}
                ariaLabel="Függvények gyakorisági rangsora"
              />
            </ChartCard>

            {selected && (
              <DetailPanel
                name={selected}
                metrics={functions}
                exams={scope}
                onClose={() => setSelected(null)}
              />
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Függvénycsaládok aránya"
                note={`${hu.format(funcRows.length)} különböző függvény a tartományban`}
              >
                <FamilyChart rows={funcRows} familyOf={familyOf} vocab={vocab} />
              </ChartCard>

              <ChartCard
                title="Mely függvények szerepelnek együtt egy képletben"
                note="a leggyakoribb párok"
              >
                <RankChart
                  rows={pairRows.slice(0, 12)}
                  label={(r) => r.key.replace("+", " + ")}
                  value={(r) => r.total}
                  unit="képlet"
                  colorIndex={1}
                  ariaLabel="Együtt előforduló függvénypárok"
                />
              </ChartCard>
            </div>

            <ChartCard title="Teljes lista" note="rendezés gyakoriság szerint">
              <RankTable rows={funcRows} familyOf={familyOf} vocab={vocab} onSelect={setSelected} />
            </ChartCard>
          </div>
        )}

        {tab === "keszsegek" && scope.length > 0 && (
          <ChartCard
            title="Milyen készségeket kérnek a táblázatkezelés-feladatok"
            note={`n = ${hu.format(scope.length)} vizsga · hány vizsgán szerepel az útmutató szövegében`}
            actions={
              <button
                className="btn flex items-center gap-1.5"
                onClick={() =>
                  downloadCsv(
                    "tablazat_keszsegek.csv",
                    toCsv(
                      ["keszseg", "vizsga_db", "talalat_db", "vizsgak_szazaleka"],
                      skillRows.map((r) => [
                        skillLabel(r.key),
                        r.examCount,
                        r.total,
                        r.pct.toFixed(1),
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
              rows={skillRows}
              label={(r) => skillLabel(r.key)}
              value={skillValue}
              unit={skillUnit}
              colorIndex={2}
              ariaLabel="Táblázatkezelési készségek rangsora"
            />
          </ChartCard>
        )}

        {tab === "komplexitas" && scope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Hány mintaképlet szerepel az útmutatóban"
              note={`n = ${hu.format(scope.length)} vizsga · időszakonként összegezve`}
            >
              <TrendChart
                labels={trendLabels}
                series={[{ name: "Képletek száma", data: trendSeries("formula_count") }]}
                ariaLabel="Képletek száma időszakonként"
              />
            </ChartCard>

            <ChartCard
              title="Mennyire összetettek a képletek"
              note="a legmélyebb zárójelezés és a legtöbb függvény egy képletben"
            >
              <TrendChart
                labels={trendLabels}
                series={[
                  { name: "Beágyazási mélység", data: trendSeries("formula_depth_max") },
                  {
                    name: "Függvény egy képletben",
                    data: trendSeries("functions_per_formula_max"),
                  },
                ]}
                ariaLabel="Képlet-komplexitás időszakonként"
              />
            </ChartCard>
          </div>
        )}
      </PageLayout>
    </>
  );
}

/* ------------------------------------------------------------------ */

function FamilyChart({
  rows,
  familyOf,
  vocab,
}: {
  rows: Row[];
  familyOf: Map<string, string>;
  vocab: VocabFile | null;
}) {
  const t = chartTokens();
  const totals = new Map<string, number>();
  for (const r of rows) {
    const fam = familyOf.get(r.key) ?? "egyeb";
    totals.set(fam, (totals.get(fam) ?? 0) + r.total);
  }
  const data = [...totals.entries()]
    .map(([k, v]) => ({ name: vocab?.function_families[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);

  const option: EChartsOption = {
    ...baseOption(),
    legend: {
      ...baseOption().legend,
      orient: "vertical",
      left: "auto",
      right: 4,
      top: "middle",
    },
    tooltip: { ...baseOption().tooltip, trigger: "item" },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        center: ["26%", "50%"],
        data,
        label: { show: false },
        itemStyle: { borderColor: t.surface, borderWidth: 2 },
      },
    ],
  };
  return <EChart option={option} height={260} ariaLabel="Függvénycsaládok aránya" />;
}

function RankTable({
  rows,
  familyOf,
  vocab,
  onSelect,
}: {
  rows: Row[];
  familyOf: Map<string, string>;
  vocab: VocabFile | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="data">
        <thead>
          <tr>
            <th>Függvény</th>
            <th>Család</th>
            <th className="text-right">Képlet</th>
            <th className="text-right">Vizsga</th>
            <th className="text-right">Vizsgák %-a</th>
            <th>Első</th>
            <th>Utolsó</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={() => onSelect(r.key)}
              style={{ cursor: "pointer" }}
              title="Részletek"
            >
              <td className="t-mono">{r.key}</td>
              <td style={{ color: "var(--text-muted)" }}>
                {vocab?.function_families[familyOf.get(r.key) ?? ""] ?? ""}
              </td>
              <td className="text-right">{hu.format(r.total)}</td>
              <td className="text-right">{hu.format(r.examCount)}</td>
              <td className="text-right">{r.pct.toFixed(0)}%</td>
              <td style={{ color: "var(--text-muted)" }}>{r.first}</td>
              <td style={{ color: "var(--text-muted)" }}>{r.last}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({
  name,
  metrics,
  exams,
  onClose,
}: {
  name: string;
  metrics: MetricsFile | null;
  exams: Exam[];
  onClose: () => void;
}) {
  const trend = trendByPeriod(metrics, exams, name);
  const where = occurrences(metrics, exams, name);

  return (
    <ChartCard
      title={`${name} – időbeli alakulás`}
      note={`${hu.format(where.length)} vizsgán fordult elő a kiválasztott tartományban`}
      actions={
        <button className="btn flex items-center gap-1.5" onClick={onClose}>
          <X size={14} aria-hidden />
          Bezárás
        </button>
      }
    >
      <TrendChart
        labels={trend.map((p) => p.label)}
        series={[{ name, data: trend.map((p) => p.value) }]}
        height={220}
        ariaLabel={`${name} előfordulása időszakonként`}
      />
      <div className="mt-3 max-h-[200px] overflow-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Időszak</th>
              <th>Szint</th>
              <th className="text-right">Képlet</th>
            </tr>
          </thead>
          <tbody>
            {where.map(({ exam, count }) => (
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
  );
}
