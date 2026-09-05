import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import ChartCard from "../components/ChartCard";
import FilterBar from "../components/FilterBar";
import PageLayout from "../components/PageLayout";
import RankChart from "../charts/RankChart";
import Tabs from "../components/Tabs";
import { aggregate, downloadCsv, toCsv } from "../data/aggregate";
import { hu } from "../data/loader";
import { labelMap, useAnalysis } from "../state/useAnalysis";

const FILES = ["html_tags.json", "css_props.json", "selector_types.json", "web_ops.json"];
type Tab = "html" | "css" | "keszsegek";

export default function Weblap() {
  const {
    filters, update, error, vocab, metrics, steps, fromIndex, toIndex, withData,
  } = useAnalysis(FILES);
  const [tab, setTab] = useState<Tab>("html");

  /** A HTML-adat a mintamegoldásokból jön, a készségek az útmutatóból. */
  const htmlScope = withData("html_tags.json");
  const opsScope = withData("web_ops.json");

  const tags = metrics["html_tags.json"] ?? null;
  const props = metrics["css_props.json"] ?? null;
  const selectors = metrics["selector_types.json"] ?? null;
  const ops = metrics["web_ops.json"] ?? null;

  const opsLabel = useMemo(() => labelMap(vocab?.web_ops), [vocab]);
  const selectorLabel = useMemo(() => labelMap(vocab?.selector_types), [vocab]);

  const tagRows = useMemo(() => aggregate(tags, htmlScope), [tags, htmlScope]);
  const propRows = useMemo(() => aggregate(props, htmlScope), [props, htmlScope]);
  const selectorRows = useMemo(() => aggregate(selectors, htmlScope), [selectors, htmlScope]);
  const opsRows = useMemo(() => aggregate(ops, opsScope), [ops, opsScope]);

  const byCount = (r: { pct: number; total: number }) =>
    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.total;
  const byExam = (r: { pct: number; examCount: number }) =>
    filters.norm === "pct" ? Number(r.pct.toFixed(1)) : r.examCount;

  if (error) {
    return (
      <PageLayout title="Weblap">
        <div className="card p-6">
          <p className="t-body m-0">Az adatok betöltése nem sikerült.</p>
          <p className="t-mono m-0 mt-2">{error}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <FilterBar
        steps={steps}
        fromIndex={fromIndex}
        toIndex={toIndex}
        filters={filters}
        update={update}
        examCount={opsScope.length}
      />
      <PageLayout
        title="Weblap"
        lead="A kiadott HTML- és CSS-mintamegoldásokból kinyert elemek, tulajdonságok és kijelölő-típusok, valamint az útmutató készség-kulcsszavai."
      >
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "html", label: "HTML-elemek" },
            { value: "css", label: "CSS" },
            { value: "keszsegek", label: "Készségek" },
          ]}
        />

        {tab !== "keszsegek" && !htmlScope.length && (
          <div className="card p-6">
            <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
              A kiválasztott tartományban nincs HTML-mintamegoldás. Az OH nem minden
              időszakhoz adja ki a megoldásfájlokat.
            </p>
          </div>
        )}

        {tab === "html" && htmlScope.length > 0 && (
          <ChartCard
            title="Mely HTML-elemek szerepelnek a mintamegoldásokban"
            note={`n = ${hu.format(htmlScope.length)} vizsga · a keretrendszerek (Bootstrap, jQuery) fájljai nem számítanak bele`}
            actions={
              <button
                className="btn flex items-center gap-1.5"
                onClick={() =>
                  downloadCsv(
                    "html_elemek.csv",
                    toCsv(
                      ["elem", "elofordulas", "vizsga_db", "vizsgak_szazaleka", "elso", "utolso"],
                      tagRows.map((r) => [
                        r.key,
                        r.total,
                        r.examCount,
                        r.pct.toFixed(1),
                        r.first ?? "",
                        r.last ?? "",
                      ]),
                    ),
                  )
                }
              >
                <Download size={14} aria-hidden />
                CSV letöltés
              </button>
            }
          >
            <RankChart
              rows={tagRows.slice(0, 25)}
              value={byCount}
              unit={filters.norm === "pct" ? "%" : "előfordulás"}
              colorIndex={4}
              ariaLabel="HTML-elemek gyakorisága"
            />
          </ChartCard>
        )}

        {tab === "css" && htmlScope.length > 0 && (
          <div className="grid gap-4">
            <ChartCard
              title="Mely CSS-tulajdonságokat használják a mintamegoldások"
              note={`n = ${hu.format(htmlScope.length)} vizsga`}
              actions={
                <button
                  className="btn flex items-center gap-1.5"
                  onClick={() =>
                    downloadCsv(
                      "css_tulajdonsagok.csv",
                      toCsv(
                        ["tulajdonsag", "elofordulas", "vizsga_db", "vizsgak_szazaleka"],
                        propRows.map((r) => [r.key, r.total, r.examCount, r.pct.toFixed(1)]),
                      ),
                    )
                  }
                >
                  <Download size={14} aria-hidden />
                  CSV letöltés
                </button>
              }
            >
              <RankChart
                rows={propRows.slice(0, 25)}
                value={byCount}
                unit={filters.norm === "pct" ? "%" : "előfordulás"}
                colorIndex={5}
                ariaLabel="CSS-tulajdonságok gyakorisága"
              />
            </ChartCard>

            <ChartCard
              title="Milyen kijelölőket használnak"
              note="elem, osztály, azonosító, leszármazott, pszeudo-osztály, attribútum"
            >
              <RankChart
                rows={selectorRows}
                label={(r) => selectorLabel(r.key)}
                value={byCount}
                unit={filters.norm === "pct" ? "%" : "szabály"}
                colorIndex={6}
                ariaLabel="CSS-kijelölő típusok"
              />
            </ChartCard>
          </div>
        )}

        {tab === "keszsegek" && (
          <ChartCard
            title="Mit kér az útmutató a weblap-feladatban"
            note={`n = ${hu.format(opsScope.length)} vizsga · hány vizsgán szerepel az útmutató szövegében`}
            actions={
              <button
                className="btn flex items-center gap-1.5"
                onClick={() =>
                  downloadCsv(
                    "weblap_keszsegek.csv",
                    toCsv(
                      ["keszseg", "vizsga_db", "talalat_db", "vizsgak_szazaleka"],
                      opsRows.map((r) => [
                        opsLabel(r.key),
                        r.examCount,
                        r.total,
                        r.pct.toFixed(1),
                      ]),
                    ),
                  )
                }
              >
                <Download size={14} aria-hidden />
                CSV letöltés
              </button>
            }
          >
            <RankChart
              rows={opsRows}
              label={(r) => opsLabel(r.key)}
              value={byExam}
              unit={filters.norm === "pct" ? "%" : "vizsga"}
              colorIndex={4}
              ariaLabel="Weblapkészítési készségek"
            />
          </ChartCard>
        )}
      </PageLayout>
    </>
  );
}
