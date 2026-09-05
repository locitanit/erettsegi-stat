import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import PageLayout from "../components/PageLayout";
import ToggleGroup from "../components/ToggleGroup";
import { hu, levelLabel, loadExams, subjectLabel, topicShort } from "../data/loader";
import type { Exam, ExamsFile } from "../data/types";
import { useFilters } from "../state/filters";

function csvEscape(v: string | number): string {
  const s = String(v);
  const quote = '"';
  return /[";\n]/.test(s) ? quote + s.split(quote).join(quote + quote) + quote : s;
}

function downloadCsv(rows: Exam[], labels: Record<string, string>) {
  const head = [
    "azonosito", "ev", "honap", "idoszak", "szint", "targy", "valtozat", "temakorok",
    "feladatlap_pdf", "feladatlap_oldal", "utmutato_oldal", "forras_fajl", "megoldas_fajl",
    "figyelmeztetesek",
  ];
  const body = rows.map((e) => [
    e.id, e.year, e.month, e.period_label, levelLabel[e.level], subjectLabel[e.subject],
    e.variant === "idegen" ? "idegen nyelvű" : "normál",
    e.topics.map((t) => labels[t] ?? t).join(" | "),
    e.file_counts.feladatlap_pdf, e.pages.feladatlap, e.pages.utmutato,
    e.file_counts.forras, e.file_counts.megoldas,
    e.warnings.join(" | "),
  ]);
  // BOM, hogy az Excel felismerje az UTF-8-at; pontosvesszo, mert magyar Excel.
  const csv = "﻿" + [head, ...body].map((r) => r.map(csvEscape).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "vizsgak.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Vizsgak() {
  const [file, setFile] = useState<ExamsFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, update, reset] = useFilters();

  useEffect(() => {
    loadExams()
      .then(setFile)
      .catch((e: Error) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    if (!file) return [];
    const q = filters.q.trim().toLowerCase();
    return file.exams
      .filter((e) => (filters.idegen ? true : e.variant === "normal"))
      .filter((e) => (filters.level ? e.level === filters.level : true))
      .filter((e) => (filters.subject ? e.subject === filters.subject : true))
      .filter((e) =>
        q
          ? `${e.period_label} ${e.id} ${e.year} ${levelLabel[e.level]} ${subjectLabel[e.subject]}`
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort(
        (a, b) =>
          b.year - a.year ||
          b.month - a.month ||
          a.level.localeCompare(b.level) ||
          a.id.localeCompare(b.id),
      );
  }, [file, filters]);

  const labels = file?.topic_labels ?? ({} as Record<string, string>);
  const years = rows.length ? `${rows[rows.length - 1].year}–${rows[0].year}` : "–";

  if (error) {
    return (
      <PageLayout title="Vizsgák">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
          <p className="t-small m-0 mt-3">
            Futtasd a repo gyökerében: <span className="t-mono">python -m extractor --all</span>,
            majd a web mappában: <span className="t-mono">npm run sync-data</span>.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Vizsgák"
      lead="Az összes felderített vizsgaidőszak, szintenként és tárgyanként. Az utolsó oszlop az adatminőségi jelzéseket mutatja."
      actions={
        <button
          className="btn flex items-center gap-1.5"
          onClick={() => downloadCsv(rows, labels)}
          disabled={!rows.length}
        >
          <Download size={14} aria-hidden />
          CSV letöltés
        </button>
      }
    >
      <div className="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-3">
        <label className="flex items-center gap-2">
          <Search size={14} aria-hidden style={{ color: "var(--text-faint)" }} />
          <input
            className="input w-[200px]"
            type="search"
            placeholder="Keresés időszakra"
            value={filters.q}
            onChange={(ev) => update({ q: ev.target.value })}
            aria-label="Keresés időszakra"
          />
        </label>

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

        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={filters.idegen}
            onChange={(ev) => update({ idegen: ev.target.checked })}
          />
          Idegen nyelvű vizsgák
        </label>

        <button className="btn ml-auto" onClick={reset}>
          Szűrők törlése
        </button>
      </div>

      {/* Allapotsor: egy kepernyokepen is egyertelmu legyen, mit latunk. */}
      <p className="t-small mb-3">
        {file
          ? `${hu.format(rows.length)} vizsga · ${years} · ${
              filters.level ? levelLabel[filters.level] : "közép és emelt"
            }${filters.idegen ? " · idegen nyelvűekkel" : ""}`
          : "Betöltés…"}
      </p>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Időszak</th>
              <th>Szint</th>
              <th>Tárgy</th>
              <th>Témakörök</th>
              <th className="text-right">Feladatlap</th>
              <th className="text-right">Útmutató</th>
              <th className="text-right">Forrás</th>
              <th className="text-right">Megoldás</th>
              <th>Jelzés</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  <div>{e.period_label}</div>
                  <div className="t-mono" style={{ color: "var(--text-faint)" }}>
                    {e.id}
                  </div>
                </td>
                <td className="whitespace-nowrap">{levelLabel[e.level]}</td>
                <td className="whitespace-nowrap">
                  {subjectLabel[e.subject]}
                  {e.variant === "idegen" && (
                    <div className="t-small" style={{ color: "var(--text-faint)" }}>
                      idegen nyelvű
                    </div>
                  )}
                </td>
                {/* Semleges felsorolas: a temakor-szinek a tervben csak diagramokon
                    es a menu aktiv jelolojen jelenhetnek meg (TERV 6.3). */}
                <td
                  className="min-w-[190px]"
                  title={e.topics.map((t) => labels[t] ?? t).join(", ")}
                >
                  {e.topics.map((t) => topicShort[t] ?? labels[t] ?? t).join(" · ")}
                </td>
                <td className="whitespace-nowrap text-right">
                  {e.file_counts.feladatlap_pdf} db
                  <div className="t-small">{e.pages.feladatlap} oldal</div>
                </td>
                <td className="whitespace-nowrap text-right">
                  {e.has.utmutato ? (
                    `${e.pages.utmutato} oldal`
                  ) : (
                    <span style={{ color: "var(--text-faint)" }}>nincs</span>
                  )}
                </td>
                <td className="text-right">{e.file_counts.forras || ""}</td>
                <td className="text-right">{e.file_counts.megoldas || ""}</td>
                <td>
                  {e.warnings.length ? (
                    <span className="badge badge-warn" title={e.warnings.join("\n")}>
                      {e.warnings.length === 1 ? e.warnings[0] : `${e.warnings.length} jelzés`}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {file && !rows.length && (
              <tr>
                <td colSpan={9} className="t-small" style={{ color: "var(--text-muted)" }}>
                  A szűrőknek egyetlen vizsga sem felel meg.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
