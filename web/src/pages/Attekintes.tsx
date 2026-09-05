import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { EChartsOption } from "echarts";
import ChartCard from "../components/ChartCard";
import EChart from "../charts/EChart";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import TrendChart from "../charts/TrendChart";
import { aggregate } from "../data/aggregate";
import { hu } from "../data/loader";
import { periodKey } from "../data/periods";
import type { Exam, MetricsFile } from "../data/types";
import { baseOption, chartTokens, TOPIC_COLORS } from "../charts/theme";
import { labelMap, useAnalysis } from "../state/useAnalysis";

const FILES = ["points_by_topic.json", "exam_shape.json"];

/** A TOP-listák: melyik metrika, milyen címke, hova visz a link. */
const HIGHLIGHTS = [
  { file: "excel_functions.json", title: "Táblázatkezelés", to: "/tablazatkezeles", vocab: null },
  { file: "sql_clauses.json", title: "Adatbázis-kezelés", to: "/adatbazis", vocab: "sql_keywords" },
  { file: "algorithms.json", title: "Programozás", to: "/programozas", vocab: "algorithms" },
  { file: "text_ops.json", title: "Szövegszerkesztés", to: "/szovegszerkesztes", vocab: "text_ops" },
  { file: "html_tags.json", title: "Weblap", to: "/weblap", vocab: null },
  { file: "presentation_ops.json", title: "Prezentáció és grafika", to: "/prezentacio", vocab: "presentation_ops" },
] as const;

const TOPIC_ORDER = [
  "szoveg",
  "prezentacio",
  "prezentacio_grafika",
  "weblap",
  "tablazat",
  "adatbazis",
  "programozas",
] as const;

export default function Attekintes() {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, scope, withData,
  } = useAnalysis([...FILES, ...HIGHLIGHTS.map((h) => h.file)]);

  const points = metrics["points_by_topic.json"] ?? null;
  const shape = metrics["exam_shape.json"] ?? null;
  const pointScope = withData("points_by_topic.json");

  const topicLabel = useMemo(() => {
    const labels: Record<string, string> = {
      szoveg: "Szövegszerkesztés",
      tablazat: "Táblázatkezelés",
      adatbazis: "Adatbázis-kezelés",
      programozas: "Programozás",
      weblap: "Weblap",
      prezentacio: "Prezentáció",
      prezentacio_grafika: "Prezentáció és grafika",
    };
    return (key: string) => labels[key] ?? key;
  }, []);

  if (error) {
    return (
      <PageLayout title="Áttekintés">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  const lastExam = [...scope].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  )[0];

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
        title="Áttekintés"
        lead="Mennyit ér az egyes témakör a vizsgán, és mi a leggyakoribb elem témakörönként."
      >
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Stat label="Vizsga a tartományban" value={hu.format(scope.length)} />
          <Stat
            label="Ebből pontszámadattal"
            value={hu.format(pointScope.length)}
            note="a pontozótábla 2012-től érhető el"
          />
          <Stat
            label="Legutóbbi vizsga"
            value={lastExam?.period_label ?? "–"}
            note={lastExam ? (lastExam.level === "emelt" ? "emelt" : "közép") : undefined}
          />
        </div>

        <div className="grid gap-4">
          <ChartCard
            title="Hogyan oszlanak meg a pontok a témakörök között"
            note={`n = ${hu.format(pointScope.length)} vizsga · a vizsga pontszámának százalékában`}
          >
            {pointScope.length ? (
              <PointShareChart
                exams={pointScope}
                metrics={points}
                topicLabel={topicLabel}
              />
            ) : (
              <p className="t-small m-0" style={{ color: "var(--text-muted)" }}>
                A kiválasztott tartományban nincs pontszámadat.
              </p>
            )}
          </ChartCard>

          <ChartCard
            title="Mekkora a vizsga"
            note="összpontszám és a pontozási sorok száma időszakonként"
          >
            <TrendChart
              labels={trendLabels(shape, pointScope)}
              series={[
                { name: "Összpontszám", data: trendValues(shape, pointScope, "total_points") },
                { name: "Pontozási sor", data: trendValues(shape, pointScope, "subtask_count") },
              ]}
              ariaLabel="A vizsga mérete időszakonként"
            />
          </ChartCard>

          <section>
            <h2 className="t-subtitle mb-2">A leggyakoribb elem témakörönként</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <TopCard
                  key={h.file}
                  title={h.title}
                  to={h.to}
                  rows={aggregate(metrics[h.file] ?? null, scope).slice(0, 5)}
                  label={
                    h.vocab
                      ? labelMap(vocab?.[h.vocab as "sql_keywords"])
                      : (k: string) => k
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className="t-small" style={{ color: "var(--text-faint)" }}>
        {label}
      </div>
      <div className="t-title mt-1">{value}</div>
      {note && (
        <div className="t-small" style={{ color: "var(--text-muted)" }}>
          {note}
        </div>
      )}
    </div>
  );
}

function TopCard({
  title,
  to,
  rows,
  label,
}: {
  title: string;
  to: string;
  rows: { key: string; total: number; examCount: number }[];
  label: (key: string) => string;
}) {
  return (
    <div className="card p-4">
      <Link to={to} className="t-subtitle no-underline" style={{ color: "var(--text)" }}>
        {title}
      </Link>
      {rows.length ? (
        <ol className="m-0 mt-2 list-none p-0">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-baseline justify-between gap-2 py-[3px]">
              <span className="t-small" style={{ color: "var(--text-faint)", width: "1.2em" }}>
                {i + 1}
              </span>
              <span className="flex-1 truncate text-[13px]" title={label(r.key)}>
                {label(r.key)}
              </span>
              <span className="t-small">{hu.format(r.examCount)} vizsga</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="t-small m-0 mt-2" style={{ color: "var(--text-muted)" }}>
          Nincs adat a tartományban.
        </p>
      )}
    </div>
  );
}

function trendLabels(metrics: MetricsFile | null, exams: Exam[]): string[] {
  return periodBuckets(metrics, exams, "total_points").map((b) => b.label);
}

function trendValues(metrics: MetricsFile | null, exams: Exam[], key: string): number[] {
  return periodBuckets(metrics, exams, key).map((b) => b.value);
}

function periodBuckets(metrics: MetricsFile | null, exams: Exam[], key: string) {
  const buckets = new Map<string, { label: string; value: number; n: number; order: number }>();
  for (const e of exams) {
    const pk = periodKey(e.year, e.month);
    const entry = buckets.get(pk) ?? {
      label: e.period_label,
      value: 0,
      n: 0,
      order: e.year * 100 + e.month,
    };
    const v = metrics?.by_exam[e.id]?.[key];
    if (typeof v === "number") {
      entry.value += v;
      entry.n += 1;
    }
    buckets.set(pk, entry);
  }
  // Idoszakonkent atlagolunk: kozep es emelt egyutt kulonben duplazna.
  return [...buckets.values()]
    .sort((a, b) => a.order - b.order)
    .map((b) => ({ label: b.label, value: b.n ? Math.round(b.value / b.n) : 0 }));
}

function PointShareChart({
  exams,
  metrics,
  topicLabel,
}: {
  exams: Exam[];
  metrics: MetricsFile | null;
  topicLabel: (key: string) => string;
}) {
  const t = chartTokens();

  const periods = new Map<string, { label: string; order: number; sums: Map<string, number> }>();
  for (const e of exams) {
    const pk = periodKey(e.year, e.month);
    const entry =
      periods.get(pk) ??
      { label: e.period_label, order: e.year * 100 + e.month, sums: new Map<string, number>() };
    for (const [topic, value] of Object.entries(metrics?.by_exam[e.id] ?? {})) {
      entry.sums.set(topic, (entry.sums.get(topic) ?? 0) + value);
    }
    periods.set(pk, entry);
  }
  const ordered = [...periods.values()].sort((a, b) => a.order - b.order);
  const topics = TOPIC_ORDER.filter((t2) => ordered.some((p) => p.sums.has(t2)));

  const option: EChartsOption = {
    ...baseOption(),
    legend: { ...baseOption().legend, type: "scroll" },
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    tooltip: {
      ...baseOption().tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => `${Number(v).toFixed(0)}%`,
    },
    xAxis: {
      type: "category",
      data: ordered.map((p) => p.label),
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.faint, fontSize: 10, rotate: 45, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint, formatter: "{value}%" },
    },
    series: topics.map((topic) => ({
      type: "bar" as const,
      stack: "total",
      name: topicLabel(topic),
      barMaxWidth: 18,
      itemStyle: { color: TOPIC_COLORS[topic] },
      data: ordered.map((p) => {
        const total = [...p.sums.values()].reduce((a, b) => a + b, 0);
        return total ? Math.round(((p.sums.get(topic) ?? 0) / total) * 100) : 0;
      }),
    })),
  };

  return <EChart option={option} height={330} ariaLabel="Pontarányok témakörönként" />;
}
