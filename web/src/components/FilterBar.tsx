import PeriodSlider from "./PeriodSlider";
import ToggleGroup from "./ToggleGroup";
import type { PeriodStep } from "../data/periods";
import type { Filters } from "../state/filters";
import { hu, levelLabel } from "../data/loader";

/**
 * Globalis vezerlo"k az elemzo" oldalak tetejen (TERV 6.1). Az aktiv szuro" allapota
 * szovegesen is ki van irva, hogy egy kepernyokepen is egyertelmu legyen.
 */
export default function FilterBar({
  steps,
  fromIndex,
  toIndex,
  filters,
  update,
  examCount,
}: {
  steps: PeriodStep[];
  fromIndex: number;
  toIndex: number;
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  examCount: number;
}) {
  const summary = [
    steps.length ? `${steps[fromIndex]?.label} – ${steps[toIndex]?.label}` : "",
    filters.level ? levelLabel[filters.level] : "közép és emelt",
    filters.subject === "digitalis_kultura"
      ? "digitális kultúra"
      : filters.subject === "informatika"
        ? "informatika"
        : "",
    `${hu.format(examCount)} vizsga`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="sticky top-0 z-10 mb-5 border-b px-4 py-3 sm:px-8"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-end gap-x-8 gap-y-3">
        <PeriodSlider
          steps={steps}
          from={fromIndex}
          to={toIndex}
          onChange={(a, b) => update({ from: steps[a]?.key ?? "", to: steps[b]?.key ?? "" })}
        />

        <ToggleGroup
          label="Szint"
          value={filters.level}
          onChange={(v) => update({ level: v })}
          options={[
            { value: "", label: "Mindkettő" },
            { value: "kozep", label: "Közép" },
            { value: "emelt", label: "Emelt" },
          ]}
        />

        <ToggleGroup
          label="Tárgy"
          value={filters.subject}
          onChange={(v) => update({ subject: v })}
          options={[
            { value: "", label: "Mind" },
            { value: "digitalis_kultura", label: "Dig. kultúra" },
            { value: "informatika", label: "Informatika" },
          ]}
        />

        <ToggleGroup
          label="Mérték"
          value={filters.norm}
          onChange={(v) => update({ norm: v })}
          options={[
            { value: "db", label: "Darab" },
            { value: "pct", label: "Vizsgák %-a" },
          ]}
        />
      </div>
      <p className="t-small mx-auto mt-2 max-w-[1200px]">{summary}</p>
    </div>
  );
}
