import type { EChartsOption } from "echarts";
import EChart from "./EChart";
import { baseOption, chartTokens, SERIES_COLORS } from "./theme";
import { hu } from "../data/loader";
import type { Row } from "../data/aggregate";

/**
 * Vizszintes rangsor-diagram. Minden temakor-oldal ezt hasznalja, hogy a
 * megjelenes egyseges legyen (TERV 6.3).
 */
export default function RankChart({
  rows,
  label,
  value,
  unit,
  onSelect,
  colorIndex = 0,
  ariaLabel,
}: {
  rows: Row[];
  /** A tengelyen megjeleno" cimke (pl. a kulcs magyar neve). */
  label?: (r: Row) => string;
  value: (r: Row) => number;
  unit: string;
  onSelect?: (name: string) => void;
  colorIndex?: number;
  ariaLabel: string;
}) {
  const t = chartTokens();
  const named = rows.map((r) => ({ row: r, name: label ? label(r) : r.key }));
  const data = [...named].reverse();

  const option: EChartsOption = {
    ...baseOption(),
    grid: { left: 8, right: 52, top: 4, bottom: 4, containLabel: true },
    legend: { show: false },
    tooltip: {
      ...baseOption().tooltip,
      formatter: (p: unknown) => {
        const item = p as { name: string; value: number };
        const hit = named.find((n) => n.name === item.name)?.row;
        return `<b>${item.name}</b><br>${hu.format(item.value)} ${unit}${
          hit ? `<br>${hu.format(hit.examCount)} vizsgán (${hit.pct.toFixed(0)}%)` : ""
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
      data: data.map((d) => d.name),
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.muted, fontSize: 11.5 },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => value(d.row)),
        itemStyle: {
          color: SERIES_COLORS[colorIndex % SERIES_COLORS.length],
          borderRadius: [0, 2, 2, 0],
        },
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
      height={Math.max(200, rows.length * 22 + 30)}
      onSelect={
        onSelect
          ? (name) => {
              const hit = named.find((n) => n.name === name);
              if (hit) onSelect(hit.row.key);
            }
          : undefined
      }
      ariaLabel={ariaLabel}
    />
  );
}
