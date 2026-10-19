import { NavLink, Outlet } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/matriz", label: "Matriz de evaluación" },
  { to: "/pruebas", label: "Pruebas" },
  { to: "/riesgos", label: "Riesgos" },
  { to: "/tareas", label: "Tareas" },
  { to: "/plan-mejora", label: "Plan de mejora" },
  { to: "/documentacion", label: "Documentación" },
];

function navLinkClass({ isActive }) {
  return [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ].join(" ");
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">
              Auditoría de Confidencialidad — Clínica Los Robles S.A.
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Controles ISO/IEC 27001:2022 en Oracle 21c XE
            </p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
