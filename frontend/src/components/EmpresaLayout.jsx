import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useCarga } from "../hooks/useCarga";
import { EmpresaContext } from "../hooks/useEmpresa";
import Aviso, { Cargando } from "./Aviso";
import { claseEnlace } from "./estilos";

const SECCIONES = [
  { ruta: "", etiqueta: "Dashboard", exacto: true },
  { ruta: "prevuelo", etiqueta: "Pre-vuelo" },
  { ruta: "descubrimiento", etiqueta: "Descubrimiento" },
  { ruta: "matriz", etiqueta: "Matriz" },
  { ruta: "correctivos", etiqueta: "Correctivos" },
  { ruta: "plan-mejora", etiqueta: "Plan de mejora" },
];

export default function EmpresaLayout() {
  const empresaId = Number(useParams().empresaId);
  const { search } = useLocation();
  const [parametros, setParametros] = useSearchParams();
  const [password, setPassword] = useState("");

  const empresa = useCarga(() => api.empresa(empresaId), [empresaId]);
  const ejecuciones = useCarga(() => api.ejecuciones(empresaId), [empresaId]);

  const ejecucionId = Number(parametros.get("ejecucion")) || ejecuciones.datos?.[0]?.id || null;

  const contexto = useMemo(
    () => ({
      empresa: empresa.datos,
      password,
      ejecuciones: ejecuciones.datos ?? [],
      recargarEjecuciones: ejecuciones.recargar,
      ejecucionId,
      seleccionarEjecucion: (id) => setParametros(id ? { ejecucion: String(id) } : {}),
    }),
    [empresa.datos, password, ejecuciones.datos, ejecuciones.recargar, ejecucionId, setParametros],
  );

  if (empresa.cargando && !empresa.datos) return <Cargando texto="Cargando empresa…" />;
  if (empresa.error) return <Aviso tono="error">{empresa.error}</Aviso>;

  return (
    <EmpresaContext.Provider value={contexto}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm">
              <Link to="/" className="text-slate-500 underline-offset-2 hover:underline dark:text-slate-400">
                Empresas
              </Link>{" "}
              /
            </p>
            <h2 className="text-xl font-semibold">{empresa.datos.nombre}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {empresa.datos.sector || "Sin sector"} · <span className="font-mono">{empresa.datos.dsn}</span> · usuario{" "}
              <span className="font-mono">{empresa.datos.usuario}</span>
            </p>
          </div>
          {!empresa.datos.credenciales_guardadas && (
            <label className="text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Contraseña del auditor (solo en memoria)</span>
              <input
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          )}
        </div>

        <nav aria-label="Secciones de la empresa" className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-800">
          {SECCIONES.map((seccion) => (
            <NavLink
              key={seccion.ruta}
              to={{ pathname: `/empresas/${empresaId}${seccion.ruta ? `/${seccion.ruta}` : ""}`, search }}
              end={seccion.exacto}
              className={claseEnlace}
            >
              {seccion.etiqueta}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </EmpresaContext.Provider>
  );
}
