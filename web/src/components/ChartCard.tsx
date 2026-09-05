import type { ReactNode } from "react";

/**
 * Egyseges diagram-keret: egymondatos cim, egysoros mintaszam-felirat, opcionalis
 * muvelet (pl. CSV letoltes). Minden diagram ezt hasznalja (TERV 6.3).
 */
export default function ChartCard({
  title,
  note,
  actions,
  children,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="t-subtitle m-0">{title}</h2>
          {note && (
            <p className="t-small m-0" style={{ color: "var(--text-faint)" }}>
              {note}
            </p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
