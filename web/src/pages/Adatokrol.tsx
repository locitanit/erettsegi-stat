import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { hu, loadExams } from "../data/loader";
import type { ExamsFile } from "../data/types";

export default function Adatokrol() {
  const [file, setFile] = useState<ExamsFile | null>(null);

  useEffect(() => {
    loadExams()
      .then(setFile)
      .catch(() => setFile(null));
  }, []);

  const exams = file?.exams ?? [];
  const utmutato = exams.filter((e) => e.has.utmutato).length;
  const ocr = exams.filter((e) => e.ocr_needed).length;

  return (
    <PageLayout
      title="Adatokról"
      lead="Honnan jönnek a számok, mit tartalmaznak és mit nem."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="t-subtitle m-0 mb-2">Forrás</h2>
          <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
            A vizsgafeladatlapok, javítási-értékelési útmutatók és mintamegoldások az Oktatási
            Hivatal nyilvános érettségi anyagai. Ez az oldal ezekből kizárólag aggregált számokat
            közöl: hány függvény, hány pont, hány oldal. A feladatok és útmutatók szövege nem
            kerül nyilvánosságra.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="t-subtitle m-0 mb-2">Módszer</h2>
          <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
            Egy offline Python-eszköz olvassa be a PDF-eket és a megoldásfájlokat, és statikus
            JSON-t készít. Nincs mesterséges intelligencia az elemzésben: minden számot
            szótárvezérelt szövegkeresés ad, ami visszakövethető és megismételhető. A weboldal
            csak ezt a kész JSON-t rajzolja ki.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="t-subtitle m-0 mb-2">Lefedettség</h2>
          {file ? (
            <table className="data">
              <tbody>
                <tr>
                  <td>Vizsgák a listában</td>
                  <td className="text-right">{hu.format(exams.length)}</td>
                </tr>
                <tr>
                  <td>Ebből van javítási útmutató</td>
                  <td className="text-right">{hu.format(utmutato)}</td>
                </tr>
                <tr>
                  <td>PDF, amelyből nem nyerhető ki szöveg</td>
                  <td className="text-right">{hu.format(ocr)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="t-small m-0">Betöltés…</p>
          )}
          <p className="t-small m-0 mt-3">
            A 2005–2007 közötti időszakokhoz az útmutató nem érhető el a forrásból; ezek a
            vizsgák szerepelnek a listában, de a szöveg alapú elemzésekből kimaradnak.
            OCR nem készül.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="t-subtitle m-0 mb-2">Állapot</h2>
          <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
            Jelenlegi fázis: 0. (váz). Elkészült a vizsgák felderítése, a PDF-szövegkinyerés
            gyorsítótárral és a Vizsgák oldal. A témakörönkénti elemzések a következő fázisokban
            készülnek el.
          </p>
          {file && (
            <p className="t-mono m-0 mt-3" style={{ color: "var(--text-faint)" }}>
              {file.generated_by}
            </p>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
