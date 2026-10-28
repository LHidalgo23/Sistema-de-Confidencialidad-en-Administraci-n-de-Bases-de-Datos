import { Building2, CircleHelp, FlaskConical, GraduationCap, Library, Menu, Monitor, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { useTema } from "../hooks/useTema";
import { PASOS, pasoDeRuta } from "./ciclo";

const ENLACES = [
  { to: "/", etiqueta: "Empresas", icono: Building2, exacto: true },
  { to: "/catalogo", etiqueta: "Catálogo", icono: Library },
  { to: "/practica", etiqueta: "Práctica", icono: FlaskConical },
  { to: "/documentacion", etiqueta: "Defensa y documentos", icono: GraduationCap },
];

const TEMAS = [
  { valor: "claro", etiqueta: "Tema claro", icono: Sun },
  { valor: "oscuro", etiqueta: "Tema oscuro", icono: Moon },
  { valor: "sistema", etiqueta: "Tema del sistema", icono: Monitor },
];

const claseNav = (activo) =>
  `group flex min-h-9 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 group-hover/rail:justify-start ${
    activo ? "bg-barra-activo text-barra-texto" : "text-barra-texto-2 hover:bg-barra-activo/60 hover:text-barra-texto"
  }`;

function Marca({ compacto }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#2b4a7a] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
        <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={2} />
      </span>
      <div className={`leading-tight ${compacto ? "hidden group-hover/rail:block" : "block"}`}>
        <p className="text-[0.9375rem] font-bold text-barra-texto whitespace-nowrap">Auditor ISO 27001</p>
        <p className="text-xs text-barra-texto-2 whitespace-nowrap">Confidencialidad en Oracle</p>
      </div>
    </div>
  );
}

function CicloEmpresa({ empresaId, resto, compacto }) {
  const { search } = useLocation();
  const actual = pasoDeRuta(resto);
  return (
    <div className="mt-4">
      <p className={`px-3 text-xs font-semibold text-barra-texto-2 ${compacto ? "hidden group-hover/rail:block" : "block"}`}>
        Ciclo de auditoría
      </p>
      <ol className="mt-2 space-y-0.5">
        {PASOS.map((paso) => {
          const activo = actual?.ruta === paso.ruta;
          return (
            <li key={paso.ruta}>
              <NavLink
                to={{ pathname: `/empresas/${empresaId}${paso.ruta ? `/${paso.ruta}` : ""}`, search }}
                aria-current={activo ? "page" : undefined}
                title={compacto ? `${paso.numero}. ${paso.etiqueta}` : undefined}
                className={claseNav(activo)}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular transition-colors duration-150 ${
                    activo ? "bg-acento text-acento-texto" : "bg-barra-linea text-barra-texto-2 group-hover:text-barra-texto"
                  }`}
                >
                  {paso.numero}
                </span>
                <span className={`min-w-0 ${compacto ? "hidden group-hover/rail:block" : "block"}`}>
                  <span className="block truncate">{paso.etiqueta}</span>
                  <span className="block truncate text-xs font-normal text-barra-texto-2">{paso.detalle}</span>
                </span>
              </NavLink>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function siguienteTema(actual) {
  const indice = TEMAS.findIndex((t) => t.valor === actual);
  return TEMAS[(indice + 1) % TEMAS.length].valor;
}

function abrirAyuda() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
}

function AccionesRail({ tema, setTema }) {
  const actual = TEMAS.find((t) => t.valor === tema) ?? TEMAS[0];
  const IconoTema = actual.icono;
  return (
    <div className="mt-4 flex flex-col items-center gap-1 border-t border-barra-linea pt-4 group-hover/rail:hidden">
      <button
        type="button"
        onClick={() => setTema(siguienteTema(tema))}
        title={`Tema: ${actual.etiqueta} (clic para cambiar)`}
        aria-label={`Cambiar tema, actual: ${actual.etiqueta}`}
        className="grid size-10 cursor-pointer place-items-center rounded-lg text-barra-texto-2 transition-colors duration-150 hover:bg-barra-activo/60 hover:text-barra-texto"
      >
        <IconoTema aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={abrirAyuda}
        title="Ayuda de esta pantalla (tecla ?)"
        aria-label="Abrir la ayuda"
        className="grid size-10 cursor-pointer place-items-center rounded-lg text-barra-texto-2 transition-colors duration-150 hover:bg-barra-activo/60 hover:text-barra-texto"
      >
        <CircleHelp aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function SelectorTema({ tema, setTema }) {
  const nombre = useId();
  return (
    <fieldset className="m-0 flex items-center justify-between gap-2 border-0 px-3 p-0">
      <legend className="sr-only">Tema de la interfaz</legend>
      <span aria-hidden="true" className="text-xs text-barra-texto-2">
        Tema
      </span>
      <div className="flex gap-0.5 rounded-lg bg-barra-linea p-0.5">
        {TEMAS.map(({ valor, etiqueta, icono: Icono }) => (
          <label
            key={valor}
            title={etiqueta}
            className={`grid size-8 cursor-pointer place-items-center rounded-md transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#78aef5] ${
              tema === valor ? "bg-barra-activo text-barra-texto" : "text-barra-texto-2 hover:text-barra-texto"
            }`}
          >
            <input type="radio" name={nombre} value={valor} checked={tema === valor} onChange={() => setTema(valor)} className="sr-only" aria-label={etiqueta} />
            <Icono aria-hidden="true" className="size-4" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BarraLateral({ alNavegar, tema, setTema, compacto = false }) {
  const coincidencia = useMatch("/empresas/:empresaId/*");
  return (
    <div className="flex h-full flex-col bg-barra px-3 pt-5 pb-4">
      <div className="px-2">
        <Marca compacto={compacto} />
      </div>
      <nav aria-label="Principal" className="mt-5 flex-1 overflow-x-hidden overflow-y-auto" onClick={alNavegar}>
        <ul className="space-y-0.5">
          {ENLACES.map(({ to, etiqueta, icono: Icono, exacto }) => (
            <li key={to}>
              <NavLink to={to} end={exacto} className={({ isActive }) => claseNav(isActive || (to === "/" && Boolean(coincidencia)))}>
                <Icono aria-hidden="true" className="size-[1.125rem] shrink-0" strokeWidth={1.75} />
                <span className={`whitespace-nowrap ${compacto ? "hidden group-hover/rail:inline" : "inline"}`}>{etiqueta}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        {coincidencia && (
          <CicloEmpresa empresaId={coincidencia.params.empresaId} resto={coincidencia.params["*"]} compacto={compacto} />
        )}
      </nav>
      {compacto && <AccionesRail tema={tema} setTema={setTema} />}
      <div
        className={`mt-4 space-y-3 border-t border-barra-linea pt-4 ${compacto ? "hidden group-hover/rail:block" : "block"}`}
      >
        <SelectorTema tema={tema} setTema={setTema} />
        <p className="px-3 text-xs text-barra-texto-2">
          Pulsa <kbd className="rounded bg-barra-linea px-1.5 py-0.5 font-mono text-barra-texto">?</kbd> para abrir la ayuda
        </p>
      </div>
    </div>
  );
}

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [tema, setTema] = useTema();
  const { pathname } = useLocation();

  // Al cambiar de pantalla la vista vuelve arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPulsar = (evento) => evento.key === "Escape" && setMenuAbierto(false);
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [menuAbierto]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[4.5rem_1fr] lg:transition-[grid-template-columns] lg:duration-200 lg:ease-out lg:has-[aside:hover]:grid-cols-[16.5rem_1fr]">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-acento px-4 py-2 font-semibold text-acento-texto focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      {/* Escritorio: rail angosto que se expande al pasar el mouse, empujando el contenido (no una capa encima) */}
      <aside className="group/rail sticky top-0 hidden h-screen overflow-hidden lg:block">
        <div className="h-full w-full">
          <BarraLateral tema={tema} setTema={setTema} compacto />
        </div>
      </aside>

      {/* Móvil: barra superior y menú deslizable */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-barra px-4 py-3 lg:hidden">
        <Marca />
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir el menú"
          aria-expanded={menuAbierto}
          className="grid size-11 cursor-pointer place-items-center rounded-lg text-barra-texto hover:bg-barra-activo"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className={`fixed inset-0 z-40 lg:hidden ${menuAbierto ? "" : "pointer-events-none"}`} aria-hidden={!menuAbierto}>
        <div
          onClick={() => setMenuAbierto(false)}
          className={`absolute inset-0 bg-[rgb(9_16_26/0.5)] transition-opacity duration-200 ${menuAbierto ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[18rem] max-w-[85vw] transition-[translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
            menuAbierto ? "translate-x-0" : "-translate-x-full"
          }`}
          inert={!menuAbierto}
        >
          {/* En el móvil, elegir un enlace cierra el menú. */}
          <BarraLateral tema={tema} setTema={setTema} alNavegar={(e) => e.target.closest("a") && setMenuAbierto(false)} />
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar el menú"
            className="absolute top-4 right-3 grid size-10 cursor-pointer place-items-center rounded-lg text-barra-texto-2 hover:bg-barra-activo hover:text-barra-texto"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <main id="contenido" className="min-w-0 px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-9">
        <div className="mx-auto max-w-[76rem]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
