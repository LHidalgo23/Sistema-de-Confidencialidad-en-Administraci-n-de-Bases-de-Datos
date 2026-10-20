import { NavLink, Outlet } from "react-router-dom";
import { claseEnlace } from "./estilos";

const ENLACES = [
  { to: "/", etiqueta: "Empresas", exacto: true },
  { to: "/catalogo", etiqueta: "Catálogo" },
  { to: "/documentacion", etiqueta: "Documentación" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Instrumento de auditoría de confidencialidad</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ISO/IEC 27001:2022 · Oracle 19c/21c · Observar, corregir, re-observar</p>
          </div>
          <nav aria-label="Principal" className="flex flex-wrap gap-1">
            {ENLACES.map((enlace) => (
              <NavLink key={enlace.to} to={enlace.to} end={enlace.exacto} className={claseEnlace}>
                {enlace.etiqueta}
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
