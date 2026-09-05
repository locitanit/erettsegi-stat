import type { EChartsOption } from "echarts";
import EChart from "./EChart";
import { baseOption, chartTokens, SERIES_COLORS } from "./theme";

/**
 * Ido"beli trend. Az x-tengely mindig az ido"szak (nem az ev), mert a vizsgak nem
 * egyenletesen kovetik egymast (TERV 6.4).
 */
export default function TrendChart({
  labels,
  series,
  height = 260,
  stacked = false,
  ariaLabel,
}: {
  labels: string[];
  series: { name: string; data: number[] }[];
  height?: number;
  stacked?: boolean;
  ariaLabel: string;
}) {
  const t = chartTokens();
  const option: EChartsOption = {
    ...baseOption(),
    legend: { ...baseOption().legend, show: series.length > 1 },
    grid: { left: 8, right: 16, top: series.length > 1 ? 26 : 8, bottom: 8, containLabel: true },
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
    series: series.map((s, i) => ({
      type: stacked ? ("bar" as const) : ("line" as const),
      name: s.name,
      data: s.data,
      stack: stacked ? "total" : undefined,
      smooth: false,
      symbolSize: 5,
      barMaxWidth: 16,
      lineStyle: { width: 1.5, color: SERIES_COLORS[i % SERIES_COLORS.length] },
      itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
    })),
  };
  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
