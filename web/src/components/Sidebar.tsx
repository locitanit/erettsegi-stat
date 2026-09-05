import { NavLink } from "react-router-dom";

/** Legfeljebb 9 menupont, fix sorrend, almenu nelkul (TERV 6.3). */
export const NAV = [
  { to: "/", label: "Áttekintés", topic: null, end: true },
  { to: "/tablazatkezeles", label: "Táblázatkezelés", topic: "tablazat" },
  { to: "/adatbazis", label: "Adatbázis-kezelés", topic: "adatbazis" },
  { to: "/programozas", label: "Programozás", topic: "programozas" },
  { to: "/szovegszerkesztes", label: "Szövegszerkesztés", topic: "szoveg" },
  { to: "/weblap", label: "Weblap", topic: "weblap" },
  { to: "/prezentacio", label: "Prezentáció és grafika", topic: "prezentacio_grafika" },
  { to: "/esedekes", label: "Mikor volt utoljára", topic: null },
  { to: "/vizsgak", label: "Vizsgák", topic: null },
] as const;

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Fő menü" className="flex flex-col gap-px">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item ? item.end : false}
          onClick={onNavigate}
          className="group relative flex items-center rounded-[5px] px-3 py-[7px] text-[13.5px] no-underline"
          style={({ isActive }) => ({
            color: isActive ? "var(--text)" : "var(--text-muted)",
            background: isActive ? "var(--surface-2)" : "transparent",
            fontWeight: isActive ? 500 : 400,
          })}
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full"
                style={{
                  background: isActive && item.topic ? `var(--t-${item.topic})` : "transparent",
                }}
              />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
