import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { hu, loadExams, loadMetrics, loadVocab } from "../data/loader";
import type { ExamsFile, MetricsFile, VocabFile } from "../data/types";

export default function Adatokrol() {
  const [file, setFile] = useState<ExamsFile | null>(null);
  const [vocab, setVocab] = useState<VocabFile | null>(null);
  const [points, setPoints] = useState<MetricsFile | null>(null);

  useEffect(() => {
    Promise.all([loadExams(), loadVocab(), loadMetrics("points_by_topic.json")])
      .then(([e, v, p]) => {
        setFile(e);
        setVocab(v);
        setPoints(p);
      })
      .catch(() => setFile(null));
  }, []);

  const exams = file?.exams ?? [];
  const analysed = exams.filter((e) => e.variant === "normal");
  const utmutato = analysed.filter((e) => e.has.utmutato).length;
  const withPoints = points ? Object.keys(points.by_exam).length : 0;

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
            közöl: hány függvény, hány lekérdezés, hány pont, hány oldal. A feladatok és
            útmutatók szövege nem kerül nyilvánosságra.
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
                  <td>Vizsga a listában</td>
                  <td className="text-right">{hu.format(exams.length)}</td>
                </tr>
                <tr>
                  <td>Ebből az elemzésben</td>
                  <td className="text-right">{hu.format(analysed.length)}</td>
                </tr>
                <tr>
                  <td>Van javítási útmutató</td>
                  <td className="text-right">{hu.format(utmutato)}</td>
                </tr>
                <tr>
                  <td>Van pontszámadat</td>
                  <td className="text-right">{hu.format(withPoints)}</td>
                </tr>
                <tr>
                  <td>Ismert függvény a szótárban</td>
                  <td className="text-right">{hu.format(vocab?.functions.length ?? 0)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="t-small m-0">Betöltés…</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="t-subtitle m-0 mb-2">Korlátok</h2>
          <ul className="t-body m-0 list-disc space-y-1 pl-5" style={{ color: "var(--text-muted)" }}>
            <li>
              Az idegen nyelvű vizsgák nem szerepelnek az elemzésben: a forrásban nincs saját
              nyelvű útmutatójuk. A Vizsgák oldalon láthatók.
            </li>
            <li>
              A 2005–2007 közötti időszakokhoz nincs útmutató a forrásban, ezek kimaradnak az
              elemzésekből. OCR nem készül.
            </li>
            <li>
              A pontszámok a pontozótáblákból jönnek, amelyek 2012-től érhetők el. Egy vizsga
              pontjai csak akkor kerülnek be, ha az összpontszám pontosan 100 vagy 120.
            </li>
            <li>
              A típusalgoritmusok és a témakörönkénti készségek kulcsszavas becslések: az
              útmutató nem nevezi meg őket, csak leírja a feladatot. Trendre jók, pontos
              darabszámnak nem.
            </li>
            <li>
              A HTML- és CSS-adat csak azokból az időszakokból van, amelyekhez az OH kiadta a
              mintamegoldást. A keretrendszerek (Bootstrap, jQuery) fájljai nem számítanak bele.
            </li>
          </ul>
        </section>

        <section className="card p-5 md:col-span-2">
          <h2 className="t-subtitle m-0 mb-2">Mit jelentenek a mértékek</h2>
          <table className="data">
            <tbody>
              <tr>
                <td style={{ width: "34%" }}>Darab</td>
                <td>
                  Függvényeknél és SQL-elemeknél: hány képletben, illetve hány lekérdezésben
                  szerepel. Kulcsszavaknál: hány vizsgán fordul elő – a nyers találatszám
                  félrevezetne, mert egy hosszabb szövegben többször szerepel ugyanaz a szó.
                </td>
              </tr>
              <tr>
                <td>Vizsgák %-a</td>
                <td>
                  A kiválasztott tartomány hány százalékában fordul elő legalább egyszer. Ez az
                  összehasonlítható mérték, ha az időszak-csúszkát mozgatod.
                </td>
              </tr>
              <tr>
                <td>Eltelt időszak</td>
                <td>
                  A „Mikor volt utoljára” oldalon: hány vizsgaidőszak telt el az utolsó
                  előfordulás óta a tartomány végéig.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card p-5 md:col-span-2">
          <h2 className="t-subtitle m-0 mb-2">Állapot</h2>
          <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
            Mind a hat témakörnek van elemzése: táblázatkezelés, adatbázis-kezelés,
            programozás, szövegszerkesztés, weblap, prezentáció és grafika. A pontarányok az
            Áttekintés oldalon láthatók.
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
