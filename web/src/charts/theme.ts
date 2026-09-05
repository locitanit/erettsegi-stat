import type { EChartsOption } from "echarts";

/**
 * Egyseges ECharts-tema (TERV 6.3): vekony tengelyek, nincs 3D, arnyek es
 * gradiens, racsvonal csak vizszintesen es halvanyan, magyar szamformatum.
 */

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const huNumber = new Intl.NumberFormat("hu-HU");

export function chartTokens() {
  return {
    text: cssVar("--text", "#1c1c1a"),
    muted: cssVar("--text-muted", "#6b6b66"),
    faint: cssVar("--text-faint", "#96968f"),
    border: cssVar("--border", "#e3e3df"),
    surface: cssVar("--surface", "#ffffff"),
    accent: cssVar("--accent", "#2f5d8a"),
  };
}

/** Sorrend-stabil, visszafogott paletta a sorozatokhoz. */
export const SERIES_COLORS = [
  "#2f7d5f",
  "#3a6ea5",
  "#8a5a2b",
  "#6b4c8a",
  "#b0563a",
  "#47707d",
  "#7a7a35",
  "#9a4b6e",
];

export const TOPIC_COLORS: Record<string, string> = {
  szoveg: "#3a6ea5",
  tablazat: "#2f7d5f",
  adatbazis: "#8a5a2b",
  programozas: "#6b4c8a",
  weblap: "#b0563a",
  prezentacio: "#47707d",
  prezentacio_grafika: "#47707d",
};

/** Minden diagram erre az alapra epul. */
export function baseOption(): EChartsOption {
  const t = chartTokens();
  return {
    animationDuration: 220,
    textStyle: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 12, color: t.text },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    legend: {
      top: 0,
      left: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: t.muted, fontSize: 12 },
    },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 1,
      textStyle: { color: t.text, fontSize: 12 },
      extraCssText: "box-shadow:none;border-radius:5px;",
    },
    color: SERIES_COLORS,
  };
}

export const axisLine = (color: string) => ({
  lineStyle: { color, width: 1 },
});

export const splitLine = (color: string) => ({
  show: true,
  lineStyle: { color, width: 1, type: "solid" as const },
});
