import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

// Csak a hasznalt modulok kerulnek a csomagba: a teljes echarts import
// tobb mint 1 MB-tal noveli a letoltest.
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  SVGRenderer,
]);

/**
 * Vekony React-burkolat az ECharts fole. Ezt a fajlt az EChart.tsx tolti be
 * kesleltetve, hogy a diagramkonyvtar ne blokkolja az elso megjelenitest. Ujrahasznalja a peldanyt, figyeli az
 * atmeretezest, es a vilagos/sotet tema valtasakor ujrarajzol.
 */
export default function EChartImpl({
  option,
  height = 320,
  onSelect,
  ariaLabel,
}: {
  option: EChartsOption;
  height?: number;
  onSelect?: (name: string) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const handler = useRef(onSelect);
  handler.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const inst = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.current = inst;
    inst.on("click", (params) => {
      const name = typeof params.name === "string" ? params.name : "";
      if (name) handler.current?.(name);
    });

    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(ref.current);

    const scheme = window.matchMedia?.("(prefers-color-scheme: dark)");
    const redraw = () => inst.setOption(option, true);
    scheme?.addEventListener?.("change", redraw);

    return () => {
      ro.disconnect();
      scheme?.removeEventListener?.("change", redraw);
      inst.dispose();
      chart.current = null;
    };
    // szandekosan csak egyszer fut: az option frissiteset a masodik effekt vegzi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ height }} role="img" aria-label={ariaLabel} />;
}
