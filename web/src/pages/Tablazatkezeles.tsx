import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import type { EChartsOption } from "echarts";
import ChartCard from "../components/ChartCard";
import EChart from "../charts/EChart";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import Tabs from "../components/Tabs";
import { aggregate, analysedExams, downloadCsv, occurrences, toCsv, trendByPeriod } from "../data/aggregate";
import type { Row } from "../data/aggregate";
import { hu, levelLabel, loadExams, loadMetrics, loadVocab } from "../data/loader";
import { periodSteps, rangeIndexes } from "../data/periods";
import type { Exam, MetricsFile, VocabFile } from "../data/types";
import { baseOption, chartTokens, SERIES_COLORS } from "../charts/theme";
import { useFilters } from "../state/filters";

type Tab = "fuggvenyek" | "keszsegek" | "komplexitas";

const TOP_N = 20;

export default function Tablazatkezeles() {
  const [filters, update] = useFilters();
  const [tab, setTab] = useState<Tab>("fuggvenyek");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[] | null>(null);
  const [vocab, setVocab] = useState<VocabFile | null>(null);
  const [functions, setFunctions] = useState<MetricsFile | null>(null);
  const [pairs, setPairs] = useState<MetricsFile | null>(null);
  const [skills, setSkills] = useState<MetricsFile | null>(null);
  const [complexity, setComplexity] = useState<MetricsFile | null>(null);

  useEffect(() => {
    Promise.all([
      loadExams(),
      loadVocab(),
      loadMetrics("excel_functions.json"),
      loadMetrics("excel_function_pairs.json"),
      loadMetrics("tablazat_skills.json"),
      loadMetrics("tablazat_complexity.json"),
    ])
      .then(([e, v, f, p, s, c]) => {
        setExams(e.exams);
        setVocab(v);
        setFunctions(f);
        setPairs(p);
        setSkills(s);
        setComplexity(c);
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
  /** Csak azok a vizsgák számítanak nevezőnek, ahol van táblázatkezelés-adat. */
  const withData = useMemo(
    () => scope.filter((e) => functions?.by_exam[e.id]),
    [scope, functions],
  );

  const funcRows = useMemo(() => aggregate(functions, withData), [functions, withData]);
  const pairRows = useMemo(() => aggregate(pairs, withData), [pairs, withData]);
  const skillRows = useMemo(() => aggregate(skills, scope), [skills, scope]);

  const familyOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of vocab?.functions ?? []) map.set(f.canon, f.family);
    return map;
  }, [vocab]);

  const value = (r: Row) => (filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.total);
  const unit = filters.norm === "pct" ? "%" : "képlet";

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

  return (
    <>
      <FilterBar
        steps={steps}
        fromIndex={fromIndex}
        toIndex={toIndex}
        filters={filters}
        update={update}
        examCount={withData.length}
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

        {!withData.length && (
          <div className="card p-6">
            <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
              A kiválasztott tartományban nincs táblázatkezelés-adat. Tágítsd az időszakot,
              vagy kapcsold ki a szint- és tárgyszűrőt.
            </p>
          </div>
        )}

        {tab === "fuggvenyek" && withData.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Melyik függvény fordul elő a leggyakrabban"
              note={`n = ${hu.format(withData.length)} vizsga · kattints egy sávra a részletekért`}
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
                value={value}
                unit={unit}
                onSelect={setSelected}
              />
            </ChartCard>

            {selected && (
              <DetailPanel
                name={selected}
                metrics={functions}
                exams={withData}
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
                <PairChart rows={pairRows.slice(0, 12)} />
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
            note={`n = ${hu.format(withData.length)} vizsga · az útmutató szövegében talált kulcsszavak`}
            actions={
              <button
                className="btn flex items-center gap-1.5"
                onClick={() =>
                  downloadCsv(
                    "tablazat_keszsegek.csv",
                    toCsv(
                      ["keszseg", "talalat_db", "vizsga_db", "vizsgak_szazaleka"],
                      skillRows.map((r) => [
                        vocab?.tablazat_skills.find((s) => s.key === r.key)?.label ?? r.key,
                        r.total,
                        r.examCount,
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
              rows={skillRows.map((r) => ({
                ...r,
                key: vocab?.tablazat_skills.find((s) => s.key === r.key)?.label ?? r.key,
              }))}
              value={(r) => (filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.total)}
              unit={filters.norm === "pct" ? "%" : "találat"}
            />
          </ChartCard>
        )}

        {tab === "komplexitas" && withData.length > 0 && (
          <ComplexityCharts metrics={complexity} exams={withData} />
        )}
      </PageLayout>
    </>
  );
}

/* ------------------------------------------------------------------ */

function RankChart({
  rows,
  value,
  unit,
  onSelect,
}: {
  rows: Row[];
  value: (r: Row) => number;
  unit: string;
  onSelect?: (key: string) => void;
}) {
  const t = chartTokens();
  const data = [...rows].reverse();
  const option: EChartsOption = {
    ...baseOption(),
    grid: { left: 8, right: 48, top: 4, bottom: 4, containLabel: true },
    legend: { show: false },
    tooltip: {
      ...baseOption().tooltip,
      formatter: (p: unknown) => {
        const item = p as { name: string; value: number };
        const row = rows.find((r) => r.key === item.name);
        return `<b>${item.name}</b><br>${hu.format(item.value)} ${unit}<br>${
          row ? `${hu.format(row.examCount)} vizsgán (${row.pct.toFixed(0)}%)` : ""
        }`;
      },
    },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint },
    },
    yAxis: {
      type: "category",
      data: data.map((r) => r.key),
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.muted, fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5 },
    },
    series: [
      {
        type: "bar",
        data: data.map((r) => value(r)),
        itemStyle: { color: SERIES_COLORS[0], borderRadius: [0, 2, 2, 0] },
        barMaxWidth: 14,
        label: {
          show: true,
          position: "right",
          color: t.muted,
          fontSize: 11,
          formatter: (p) => hu.format(Number(p.value ?? 0)),
        },
      },
    ],
  };
  return (
    <EChart
      option={option}
      height={Math.max(220, rows.length * 22 + 30)}
      onSelect={onSelect}
      ariaLabel="Függvények gyakorisági rangsora"
    />
  );
}

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

function PairChart({ rows }: { rows: Row[] }) {
  const t = chartTokens();
  const data = [...rows].reverse();
  const option: EChartsOption = {
    ...baseOption(),
    grid: { left: 8, right: 40, top: 4, bottom: 4, containLabel: true },
    legend: { show: false },
    tooltip: { ...baseOption().tooltip },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint },
    },
    yAxis: {
      type: "category",
      data: data.map((r) => r.key.replace("+", " + ")),
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.muted, fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        data: data.map((r) => r.total),
        itemStyle: { color: SERIES_COLORS[1], borderRadius: [0, 2, 2, 0] },
        barMaxWidth: 12,
        label: { show: true, position: "right", color: t.muted, fontSize: 11 },
      },
    ],
  };
  return <EChart option={option} height={260} ariaLabel="Együtt előforduló függvénypárok" />;
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
  const t = chartTokens();
  const trend = trendByPeriod(metrics, exams, name);
  const where = occurrences(metrics, exams, name);

  const option: EChartsOption = {
    ...baseOption(),
    legend: { show: false },
    tooltip: { ...baseOption().tooltip, trigger: "axis" },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: trend.map((p) => p.label),
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.faint, fontSize: 10, rotate: 45, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint },
    },
    series: [
      {
        type: "line",
        data: trend.map((p) => p.value),
        smooth: false,
        symbolSize: 5,
        lineStyle: { width: 1.5, color: SERIES_COLORS[0] },
        itemStyle: { color: SERIES_COLORS[0] },
      },
    ],
  };

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
      <EChart option={option} height={220} ariaLabel={`${name} előfordulása időszakonként`} />
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

function ComplexityCharts({ metrics, exams }: { metrics: MetricsFile | null; exams: Exam[] }) {
  const t = chartTokens();
  const series = (key: string) => trendByPeriod(metrics, exams, key);
  const count = series("formula_count");
  const depth = series("formula_depth_max");
  const perFormula = series("functions_per_formula_max");

  const line = (
    labels: string[],
    sets: { name: string; data: number[] }[],
  ): EChartsOption => ({
    ...baseOption(),
    tooltip: { ...baseOption().tooltip, trigger: "axis" },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.faint, fontSize: 10, rotate: 45, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint },
    },
    series: sets.map((s, i) => ({
      type: "line" as const,
      name: s.name,
      data: s.data,
      smooth: false,
      symbolSize: 5,
      lineStyle: { width: 1.5, color: SERIES_COLORS[i] },
      itemStyle: { color: SERIES_COLORS[i] },
    })),
  });

  return (
    <div className="grid gap-4">
      <ChartCard
        title="Hány mintaképlet szerepel az útmutatóban"
        note={`n = ${hu.format(exams.length)} vizsga · időszakonként összegezve`}
      >
        <EChart
          option={line(count.map((p) => p.label), [
            { name: "Képletek száma", data: count.map((p) => p.value) },
          ])}
          height={260}
          ariaLabel="Képletek száma időszakonként"
        />
      </ChartCard>

      <ChartCard
        title="Mennyire összetettek a képletek"
        note="a legmélyebb zárójelezés és a legtöbb függvény egy képletben"
      >
        <EChart
          option={line(depth.map((p) => p.label), [
            { name: "Beágyazási mélység", data: depth.map((p) => p.value) },
            { name: "Függvény egy képletben", data: perFormula.map((p) => p.value) },
          ])}
          height={260}
          ariaLabel="Képlet-komplexitás időszakonként"
        />
      </ChartCard>
    </div>
  );
}
