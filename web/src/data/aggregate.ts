import type { Exam, MetricsFile } from "./types";
import { periodKey } from "./periods";
import type { Filters } from "../state/filters";

/**
 * A metrikak idoszakonkent vannak tarolva, igy a szures es az osszegzes teljes
 * egeszeben a bongeszo"ben tortenik – ujraszamolas nelkul (TERV 4.4).
 */

/** Az elemzesbe bevont vizsgak: az idegen nyelvuek soha nem szerepelnek. */
export function analysedExams(exams: Exam[], filters: Filters, steps: string[]): Exam[] {
  const allowed = new Set(steps);
  return exams.filter(
    (e) =>
      e.variant === "normal" &&
      allowed.has(periodKey(e.year, e.month)) &&
      (filters.level ? e.level === filters.level : true) &&
      (filters.subject ? e.subject === filters.subject : true),
  );
}

export interface Row {
  key: string;
  /** Hany kepletben (vagy hany talalat) osszesen a tartomanyban. */
  total: number;
  /** Hany vizsgan fordult elo legalabb egyszer. */
  examCount: number;
  /** A vizsgak szazaleka, ahol elofordult. */
  pct: number;
  /** Elso es utolso elofordulas idoszaka (a szurt tartomanyon belul). */
  first?: string;
  last?: string;
}

export function aggregate(metrics: MetricsFile | null, exams: Exam[]): Row[] {
  if (!metrics) return [];
  const totals = new Map<string, number>();
  const seenIn = new Map<string, Exam[]>();

  for (const e of exams) {
    const bucket = metrics.by_exam[e.id];
    if (!bucket) continue;
    for (const [key, n] of Object.entries(bucket)) {
      totals.set(key, (totals.get(key) ?? 0) + n);
      const list = seenIn.get(key);
      if (list) list.push(e);
      else seenIn.set(key, [e]);
    }
  }

  const denom = exams.length || 1;
  const rows: Row[] = [];
  for (const [key, total] of totals) {
    const where = seenIn.get(key) ?? [];
    const ordered = [...where].sort((a, b) => a.year - b.year || a.month - b.month);
    rows.push({
      key,
      total,
      examCount: where.length,
      pct: (where.length / denom) * 100,
      first: ordered[0]?.period_label,
      last: ordered[ordered.length - 1]?.period_label,
    });
  }
  return rows.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key, "hu"));
}

/** Egy kulcs idobeli alakulasa: idoszakonkenti darabszam. */
export function trendByPeriod(
  metrics: MetricsFile | null,
  exams: Exam[],
  key: string,
): { label: string; value: number }[] {
  if (!metrics) return [];
  const buckets = new Map<string, { label: string; value: number; order: number }>();
  for (const e of exams) {
    const pk = periodKey(e.year, e.month);
    const entry = buckets.get(pk) ?? {
      label: e.period_label,
      value: 0,
      order: e.year * 100 + e.month,
    };
    entry.value += metrics.by_exam[e.id]?.[key] ?? 0;
    buckets.set(pk, entry);
  }
  return [...buckets.values()].sort((a, b) => a.order - b.order);
}

/** Melyik vizsgakon fordult elo a kulcs – a reszletpanelhez. */
export function occurrences(
  metrics: MetricsFile | null,
  exams: Exam[],
  key: string,
): { exam: Exam; count: number }[] {
  if (!metrics) return [];
  return exams
    .map((e) => ({ exam: e, count: metrics.by_exam[e.id]?.[key] ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.exam.year - a.exam.year || b.exam.month - a.exam.month);
}

export function toCsv(head: string[], rows: (string | number)[][]): string {
  const q = '"';
  const esc = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? q + s.split(q).join(q + q) + q : s;
  };
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
