import { useEffect, useMemo, useState } from "react";
import { analysedExams } from "../data/aggregate";
import { loadExams, loadMetrics, loadVocab } from "../data/loader";
import { periodSteps, rangeIndexes } from "../data/periods";
import type { Exam, MetricsFile, VocabFile } from "../data/types";
import { useFilters } from "./filters";

/**
 * Minden elemzo" oldal ugyanazt csinalja: betolti a vizsgakat, a szotarat es a
 * kert metrika-fajlokat, majd a csuszka + szuro"k szerint leszukiti a vizsgakat.
 */
export function useAnalysis(metricFiles: string[]) {
  const [filters, update] = useFilters();
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [vocab, setVocab] = useState<VocabFile | null>(null);
  const [metrics, setMetrics] = useState<Record<string, MetricsFile>>({});

  const key = metricFiles.join(",");
  useEffect(() => {
    const names = key ? key.split(",") : [];
    Promise.all([loadExams(), loadVocab(), ...names.map(loadMetrics)])
      .then(([e, v, ...rest]) => {
        setExams((e as { exams: Exam[] }).exams);
        setVocab(v as VocabFile);
        const map: Record<string, MetricsFile> = {};
        names.forEach((n, i) => (map[n] = rest[i] as MetricsFile));
        setMetrics(map);
      })
      .catch((err: Error) => setError(err.message));
  }, [key]);

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

  /** Csak azok a vizsgák számítanak, amelyekhez az adott metrikában van adat. */
  const withData = (name: string) => scope.filter((e) => metrics[name]?.by_exam[e.id]);

  return {
    filters,
    update,
    error,
    exams,
    vocab,
    metrics,
    steps,
    fromIndex,
    toIndex,
    scope,
    withData,
  };
}

/** Kulcs -> magyar címke a vocab.json egyik listájából. */
export function labelMap(
  items: { key: string; label: string }[] | undefined,
): (key: string) => string {
  const map = new Map((items ?? []).map((i) => [i.key, i.label]));
  return (key: string) => map.get(key) ?? key;
}
