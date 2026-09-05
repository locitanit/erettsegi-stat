import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Placeholder from "./components/Placeholder";
import Vizsgak from "./pages/Vizsgak";
import Adatokrol from "./pages/Adatokrol";
import { NavLink, useLocation } from "react-router-dom";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Mobil fejlec */}
      <div
        className="flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <span className="t-subtitle">Érettségi-statisztika</span>
        <button
          className="btn flex items-center gap-1.5"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Menü bezárása" : "Menü megnyitása"}
        >
          {menuOpen ? <X size={15} aria-hidden /> : <Menu size={15} aria-hidden />}
          Menü
        </button>
      </div>

      {/* Oldalsav */}
      <aside
        className={`${menuOpen ? "block" : "hidden"} shrink-0 border-b px-3 py-4 md:sticky md:top-0 md:block md:h-screen md:w-[236px] md:border-b-0 md:border-r`}
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-5 hidden px-3 md:block">
          <div className="t-subtitle">Érettségi-statisztika</div>
          <div className="t-small" style={{ color: "var(--text-faint)" }}>
            digitális kultúra · informatika
          </div>
        </div>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
        <div className="mt-5 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <NavLink
            to="/adatokrol"
            className="block rounded-[5px] px-3 py-[7px] text-[13px] no-underline"
            style={({ isActive }) => ({
              color: isActive ? "var(--text)" : "var(--text-faint)",
              background: isActive ? "var(--surface-2)" : "transparent",
            })}
          >
            Adatokról
          </NavLink>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<Placeholder title="Áttekintés" phase="3. fázisban" />} />
          <Route path="/tablazatkezeles" element={<Placeholder title="Táblázatkezelés" phase="1. fázisban" />} />
          <Route path="/adatbazis" element={<Placeholder title="Adatbázis-kezelés" phase="2. fázisban" />} />
          <Route path="/programozas" element={<Placeholder title="Programozás" phase="2. fázisban" />} />
          <Route path="/szovegszerkesztes" element={<Placeholder title="Szövegszerkesztés" phase="3. fázisban" />} />
          <Route path="/weblap" element={<Placeholder title="Weblap" phase="3. fázisban" />} />
          <Route path="/prezentacio" element={<Placeholder title="Prezentáció és grafika" phase="3. fázisban" />} />
          <Route path="/esedekes" element={<Placeholder title="Mikor volt utoljára" phase="1. fázisban" />} />
          <Route path="/vizsgak" element={<Vizsgak />} />
          <Route path="/adatokrol" element={<Adatokrol />} />
          <Route path="*" element={<Placeholder title="Nincs ilyen oldal" phase="menüből elérhető oldalakon" />} />
        </Routes>
      </main>
    </div>
  );
}
