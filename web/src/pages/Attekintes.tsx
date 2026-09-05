import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import ChartCard from "../components/ChartCard";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import RankChart from "../charts/RankChart";
import { aggregate, sortedBy } from "../data/aggregate";
import { hu } from "../data/loader";
import { labelMap, useAnalysis } from "../state/useAnalysis";

const CHOICE_FILE = "valaszthato_dokumentum.json";

/** A TOP-listák: melyik metrika, milyen címke, hova visz a link. */
const HIGHLIGHTS = [
  { file: "excel_functions.json", title: "Táblázatkezelés", to: "/tablazatkezeles", vocab: null },
  { file: "sql_clauses.json", title: "Adatbázis-kezelés", to: "/adatbazis", vocab: "sql_keywords" },
  { file: "algorithms.json", title: "Programozás", to: "/programozas", vocab: "algorithms" },
  { file: "text_ops.json", title: "Szövegszerkesztés", to: "/szovegszerkesztes", vocab: "text_ops" },
  { file: "html_tags.json", title: "Weblap", to: "/weblap", vocab: null },
  { file: "presentation_ops.json", title: "Prezentáció és grafika", to: "/prezentacio", vocab: "presentation_ops" },
] as const;

const TOPIC_LABEL: Record<string, string> = {
  szoveg: "Szövegszerkesztés",
  tablazat: "Táblázatkezelés",
  adatbazis: "Adatbázis-kezelés",
  programozas: "Programozás",
  weblap: "Weblap",
  prezentacio: "Prezentáció",
  prezentacio_grafika: "Prezentáció és grafika",
};

export default function Attekintes() {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, scope, withData,
  } = useAnalysis([CHOICE_FILE, ...HIGHLIGHTS.map((h) => h.file)]);

  const choice = metrics[CHOICE_FILE] ?? null;
  const choiceScope = withData(CHOICE_FILE);

  const choiceRows = useMemo(
    () =>
      sortedBy(aggregate(choice, choiceScope), (r) =>
        filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.examCount,
      ),
    [choice, choiceScope, filters.norm],
  );

  if (error) {
    return (
      <PageLayout title="Áttekintés">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  const lastExam = [...scope].sort((a, b) => b.year - a.year || b.month - a.month)[0];

  return (
    <>
      <FilterBar
        steps={steps}
        fromIndex={fromIndex}
        toIndex={toIndex}
        filters={filters}
        update={update}
        examCount={scope.length}
      />
      <PageLayout
        title="Áttekintés"
        lead="Mi a leggyakoribb elem témakörönként, és miből áll az emelt szint választható feladata."
      >
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Stat label="Vizsga a tartományban" value={hu.format(scope.length)} />
          <Stat
            label="Legutóbbi vizsga"
            value={lastExam?.period_label ?? "–"}
            note={lastExam ? (lastExam.level === "emelt" ? "emelt" : "közép") : undefined}
          />
          <Stat
            label="Választható feladat"
            value={hu.format(choiceScope.length)}
            note="emelt vizsga A/B választással"
          />
        </div>

        <div className="grid gap-4">
          <ChartCard
            title="Miből áll az emelt szint választható dokumentumkészítés-feladata"
            note={`n = ${hu.format(choiceScope.length)} emelt vizsga · a másik választható feladat mindig táblázatkezelés`}
          >
            {choiceRows.length ? (
              <>
                <RankChart
                  rows={choiceRows}
                  label={(r) => TOPIC_LABEL[r.key] ?? r.key}
                  value={(r) =>
                    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.examCount
                  }
                  unit={filters.norm === "pct" ? "%" : "vizsga"}
                  colorIndex={3}
                  ariaLabel="A választható dokumentumkészítés-feladat témakörei"
                />
                <p className="t-small m-0 mt-2" style={{ color: "var(--text-muted)" }}>
                  2022-től az emelt vizsga 1. feladatát két változatban adják ki: az egyik
                  táblázatkezelés, a másik dokumentumkészítés. Ez a diagram azt mutatja, hogy a
                  dokumentumkészítés-változat milyen témakörökből állt. A vizsga többi feladata
                  (adatbázis-kezelés, programozás) rögzített, és középszinten az arányok is
                  állandóak – onnan nem nyerhető ki trend.
                </p>
              </>
            ) : (
              <p className="t-small m-0" style={{ color: "var(--text-muted)" }}>
                A kiválasztott tartományban nincs A/B választásos vizsga. Ez 2022-től, emelt
                szinten fordul elő – állítsd a szintet emeltre és az időszakot 2022-től.
              </p>
            )}
          </ChartCard>

          <section>
            <h2 className="t-subtitle mb-2">A leggyakoribb elem témakörönként</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <TopCard
                  key={h.file}
                  title={h.title}
                  to={h.to}
                  rows={sortedBy(
                    aggregate(metrics[h.file] ?? null, scope),
                    (r) => r.examCount,
                  ).slice(0, 5)}
                  label={
                    h.vocab ? labelMap(vocab?.[h.vocab as "sql_keywords"]) : (k: string) => k
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className="t-small" style={{ color: "var(--text-faint)" }}>
        {label}
      </div>
      <div className="t-title mt-1">{value}</div>
      {note && (
        <div className="t-small" style={{ color: "var(--text-muted)" }}>
          {note}
        </div>
      )}
    </div>
  );
}

function TopCard({
  title,
  to,
  rows,
  label,
}: {
  title: string;
  to: string;
  rows: { key: string; total: number; examCount: number }[];
  label: (key: string) => string;
}) {
  const { search } = useLocation();
  return (
    <div className="card p-4">
      <Link
        to={{ pathname: to, search }}
        className="t-subtitle no-underline"
        style={{ color: "var(--text)" }}
      >
        {title}
      </Link>
      {rows.length ? (
        <ol className="m-0 mt-2 list-none p-0">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-baseline justify-between gap-2 py-[3px]">
              <span className="t-small" style={{ color: "var(--text-faint)", width: "1.2em" }}>
                {i + 1}
              </span>
              <span className="flex-1 truncate text-[13px]" title={label(r.key)}>
                {label(r.key)}
              </span>
              <span className="t-small">{hu.format(r.examCount)} vizsga</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="t-small m-0 mt-2" style={{ color: "var(--text-muted)" }}>
          Nincs adat a tartományban.
        </p>
      )}
    </div>
  );
}
