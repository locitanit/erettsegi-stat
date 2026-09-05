import { Suspense, lazy } from "react";
import type { EChartsOption } from "echarts";

/**
 * A diagramkonyvtar kulon csomagban tolt be, az oldal szovege utan. Igy a cim es
 * a tablazatok azonnal megjelennek, es a helyorzo miatt a diagram beerkezese nem
 * tolja el a tartalmat (nincs elrendezes-ugras).
 */
const EChartImpl = lazy(() => import("./EChartImpl"));

export interface EChartProps {
  option: EChartsOption;
  height?: number;
  onSelect?: (name: string) => void;
  ariaLabel: string;
}

export default function EChart(props: EChartProps) {
  const height = props.height ?? 320;
  return (
    <Suspense fallback={<div style={{ height }} aria-hidden />}>
      <EChartImpl {...props} height={height} />
    </Suspense>
  );
}
