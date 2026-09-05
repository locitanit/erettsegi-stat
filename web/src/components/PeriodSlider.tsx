import { MARKERS, type PeriodStep } from "../data/periods";

/**
 * Dupla fogantyus idoszak-csuszka. A lepesek a LETEZO idoszakok (nem evek),
 * mert a vizsgak nem egyenletesen kovetik egymast (majus/oktober, kimarado evek).
 * Alatta a 2017-es es a 2022-es valtozas jelolo"je.
 */
export default function PeriodSlider({
  steps,
  from,
  to,
  onChange,
}: {
  steps: PeriodStep[];
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  const max = Math.max(0, steps.length - 1);
  if (!steps.length) return null;

  const pos = (i: number) => (max === 0 ? 0 : (i / max) * 100);

  return (
    <div className="min-w-[260px] flex-1">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="t-small" style={{ color: "var(--text-faint)" }}>
          Időszak
        </span>
        <span className="t-small">
          {steps[from]?.label} – {steps[to]?.label}
        </span>
      </div>

      <div className="relative h-6">
        {/* sav */}
        <div
          className="pointer-events-none absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded"
          style={{ background: "var(--border)" }}
        />
        {/* kijelolt tartomany */}
        <div
          className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 rounded"
          style={{
            left: `${pos(from)}%`,
            width: `${pos(to) - pos(from)}%`,
            background: "var(--accent)",
          }}
        />
        {/* valtozas-jelolo"k */}
        {MARKERS.map((m) => {
          const i = steps.findIndex((s) => s.year >= m.year);
          if (i < 0) return null;
          return (
            <span
              key={m.year}
              title={`${m.label}: ${m.note}`}
              className="pointer-events-none absolute top-1/2 h-[11px] w-[1px] -translate-y-1/2"
              style={{ left: `${pos(i)}%`, background: "var(--text-faint)" }}
            />
          );
        })}

        <input
          type="range"
          min={0}
          max={max}
          value={from}
          aria-label="Időszak kezdete"
          onChange={(e) => onChange(Math.min(Number(e.target.value), to), to)}
          className="range-thumb absolute inset-0 h-6 w-full"
        />
        <input
          type="range"
          min={0}
          max={max}
          value={to}
          aria-label="Időszak vége"
          onChange={(e) => onChange(from, Math.max(Number(e.target.value), from))}
          className="range-thumb absolute inset-0 h-6 w-full"
        />
      </div>

      <div className="mt-0.5 flex gap-2">
        <button
          className="btn !px-2 !py-0.5 !text-[11.5px]"
          onClick={() => {
            const i = steps.findIndex((s) => s.year >= 2022);
            onChange(i < 0 ? 0 : i, max);
          }}
        >
          Digitális kultúra (2022–)
        </button>
        <button
          className="btn !px-2 !py-0.5 !text-[11.5px]"
          onClick={() => onChange(Math.max(0, max - 9), max)}
        >
          Utolsó 5 év
        </button>
        <button className="btn !px-2 !py-0.5 !text-[11.5px]" onClick={() => onChange(0, max)}>
          Minden
        </button>
      </div>
    </div>
  );
}
