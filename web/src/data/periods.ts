import type { Exam } from "./types";
import { monthLabel } from "./loader";

/** Egy vizsgaidoszak (ev + honap), szinttol es targytol fuggetlenul. */
export interface PeriodStep {
  key: string; // "2025m" / "2025o" / "2006f"
  year: number;
  month: number;
  label: string; // "2025. május"
}

const MONTH_CODE: Record<number, string> = { 2: "f", 5: "m", 10: "o" };

export function periodKey(year: number, month: number): string {
  return `${year}${MONTH_CODE[month] ?? month}`;
}

/** A letezo idoszakok idorendben – ez adja a csuszka lepeseit (TERV 6.1). */
export function periodSteps(exams: Exam[]): PeriodStep[] {
  const seen = new Map<string, PeriodStep>();
  for (const e of exams) {
    const key = periodKey(e.year, e.month);
    if (!seen.has(key)) {
      seen.set(key, {
        key,
        year: e.year,
        month: e.month,
        label: `${e.year}. ${monthLabel[e.month]}`,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** A csuszka ket vegenek indexe; hianyzo szurore az alapertelmezett tartomany. */
export function rangeIndexes(
  steps: PeriodStep[],
  from: string,
  to: string,
  defaultFromKey?: string,
): [number, number] {
  const idx = (key: string) => steps.findIndex((s) => s.key === key);
  let a = from ? idx(from) : -1;
  let b = to ? idx(to) : -1;
  if (a < 0) a = defaultFromKey ? Math.max(0, idx(defaultFromKey)) : 0;
  if (b < 0) b = steps.length - 1;
  if (a > b) [a, b] = [b, a];
  return [a, b];
}

/** A 2017-es és 2022-es változás jelölői a csúszka alatt. */
export const MARKERS: { year: number; label: string; note: string }[] = [
  { year: 2017, label: "2017", note: "vizsgaleírás-változás" },
  { year: 2022, label: "2022", note: "informatika helyett digitális kultúra" },
];
