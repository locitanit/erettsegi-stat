import PageLayout from "./PageLayout";

/** A kesobbi fazisokban keszulo oldalak helye. */
export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <PageLayout title={title}>
      <div className="card p-6">
        <p className="t-body m-0" style={{ color: "var(--text-muted)" }}>
          Ez az oldal a(z) {phase} készül el. A jelenlegi, 0. fázis a vizsgák felderítését és a
          Vizsgák oldalt tartalmazza.
        </p>
      </div>
    </PageLayout>
  );
}
