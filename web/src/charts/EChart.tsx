import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

/**
 * Vekony React-burkolat az ECharts fole. Ujrahasznalja a peldanyt, figyeli az
 * atmeretezest, es a vilagos/sotet tema valtasakor ujrarajzol.
 */
export default function EChart({
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
