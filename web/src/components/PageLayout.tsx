import type { ReactNode } from "react";

/**
 * Egyseges oldalvaz: cim, egymondatos leiras, opcionalis muveletsav.
 * Minden oldal ezt hasznalja, hogy a tipografia es a tavolsagok azonosak legyenek.
 */
export default function PageLayout({
  title,
  lead,
  actions,
  children,
}: {
  title: string;
  lead?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-title m-0">{title}</h1>
          {lead && (
            <p className="t-small m-0 mt-1 max-w-[70ch]" style={{ color: "var(--text-muted)" }}>
              {lead}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
