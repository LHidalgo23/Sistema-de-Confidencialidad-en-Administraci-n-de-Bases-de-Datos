import { ArrowLeft, ArrowRight, Building2, KeyRound, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useCarga } from "../hooks/useCarga";
import { EmpresaContext } from "../hooks/useEmpresa";
import Aviso, { Cargando } from "./Aviso";
import { PASOS, pasoDeRuta } from "./ciclo";
import { etiquetaEjecucion } from "./estados";
import { campo } from "./estilos";

function CampoClave({ etiqueta, valor, onChange }) {
  return (
    <label className="block min-w-56 flex-1 text-sm">
      <span className="mb-1 block font-medium text-texto">{etiqueta}</span>
      <input type="password" autoComplete="off" value={valor} onChange={(e) => onChange(e.target.value)} className={campo} />
    </label>
  );
}

function PasoVecino({ paso, direccion, empresaId, search }) {
  if (!paso) return <span />;
  const siguiente = direccion === "siguiente";
  return (
    <Link
      to={{ pathname: `/empresas/${empresaId}${paso.ruta ? `/${paso.ruta}` : ""}`, search }}
      className={`group flex min-h-16 flex-1 items-center gap-3 rounded-xl bg-superficie px-4 py-3 shadow-tarjeta transition-[box-shadow,background-color] duration-150 hover:bg-superficie-2 sm:max-w-sm ${
        siguiente ? "justify-end text-right sm:ml-auto" : ""
      }`}
    >
      {!siguiente && <ArrowLeft aria-hidden="true" className="size-4 shrink-0 text-texto-3 group-hover:text-acento" />}
      <span>
        <span className="block text-xs text-texto-3">
          {siguiente ? "Paso siguiente" : "Paso anterior"}, {paso.fase.toLowerCase()}
        </span>
        <span className="block font-semibold text-texto">
          {paso.numero}. {paso.etiqueta}
        </span>
      </span>
      {siguiente && <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-texto-3 group-hover:text-acento" />}
    </Link>
  );
}

export default function EmpresaLayout() {
  const params = useParams();
  const empresaId = Number(params.empresaId);
  const { search } = useLocation();
  const [parametros, setParametros] = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordInstancia, setPasswordInstancia] = useState("");

  const empresa = useCarga(() => api.empresa(empresaId), [empresaId]);
  const ejecuciones = useCarga(() => api.ejecuciones(empresaId), [empresaId]);

  const ejecucionId = Number(parametros.get("ejecucion")) || ejecuciones.datos?.[0]?.id || null;

  const contexto = useMemo(
    () => ({
      empresa: empresa.datos,
      claves: { password, passwordInstancia },
      recargarEmpresa: empresa.recargar,
      ejecuciones: ejecuciones.datos ?? [],
      recargarEjecuciones: ejecuciones.recargar,
      ejecucionId,
      seleccionarEjecucion: (id) => setParametros(id ? { ejecucion: String(id) } : {}),
    }),
    [empresa.datos, empresa.recargar, password, passwordInstancia, ejecuciones.datos, ejecuciones.recargar, ejecucionId, setParametros],
  );

  if (empresa.cargando && !empresa.datos) return <Cargando texto="Cargando empresa…" />;
  if (empresa.error) return <Aviso tono="error">{empresa.error}</Aviso>;

  const datos = empresa.datos;
  const pideClave = !datos.credenciales_guardadas;
  const pideClaveInstancia = datos.instancia_configurada && !datos.credenciales_instancia_guardadas;
  const listaEjecuciones = ejecuciones.datos ?? [];

  const paso = pasoDeRuta(params["*"]);
  const esHallazgo = (params["*"] ?? "").startsWith("hallazgos");
  const anterior = paso && !esHallazgo ? PASOS[paso.numero - 2] : null;
  const siguiente = paso && !esHallazgo ? PASOS[paso.numero] : null;

  return (
    <EmpresaContext.Provider value={contexto}>
      <div className="space-y-7">
        <div className="rounded-xl bg-superficie shadow-tarjeta">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <div className="min-w-0 flex-1 basis-72">
              <Link to="/" className="inline-flex items-center gap-1 text-sm text-texto-3 hover:text-acento">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Todas las empresas
              </Link>
              <p className="mt-1 flex items-center gap-2 text-lg leading-tight font-bold text-texto">
                <Building2 aria-hidden="true" className="size-5 shrink-0 text-texto-3" strokeWidth={1.75} />
                <span className="truncate">{datos.nombre}</span>
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-texto-3">Sector</dt>
                <dd className="font-medium">{datos.sector || "Sin sector"}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-3">Conexión</dt>
                <dd className="font-mono text-[0.8125rem]">{datos.dsn}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-3">Usuario auditor</dt>
                <dd className="font-mono text-[0.8125rem]">{datos.usuario}</dd>
              </div>
            </dl>
            {listaEjecuciones.length > 0 && (
              <label className="text-sm">
                <span className="mb-1 block text-xs text-texto-3">Ejecución activa</span>
                <select
                  value={ejecucionId ?? ""}
                  onChange={(e) => contexto.seleccionarEjecucion(Number(e.target.value))}
                  className={`${campo} min-h-9 w-auto max-w-72 py-1.5`}
                >
                  {listaEjecuciones.map((e) => (
                    <option key={e.id} value={e.id}>
                      {etiquetaEjecucion(e)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {(pideClave || pideClaveInstancia) && (
            <div className="flex flex-wrap items-end gap-4 border-t border-linea bg-superficie-2/70 px-5 py-4">
              <div className="flex max-w-xs basis-64 gap-3">
                <KeyRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-texto-3" />
                <p className="text-sm text-texto-2">
                  Esta empresa no guarda contraseñas. Escríbelas para conectarte: viven solo en la memoria de esta pestaña.
                </p>
              </div>
              {pideClave && <CampoClave etiqueta="Contraseña del auditor" valor={password} onChange={setPassword} />}
              {pideClaveInstancia && (
                <CampoClave etiqueta="Contraseña de instancia" valor={passwordInstancia} onChange={setPasswordInstancia} />
              )}
            </div>
          )}
          {!pideClave && !pideClaveInstancia && (
            <p className="flex items-center gap-2 border-t border-linea px-5 py-2.5 text-xs text-texto-3">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Credenciales cifradas en reposo: no hace falta escribirlas.
            </p>
          )}
        </div>

        <Outlet />

        {(anterior || siguiente) && (
          <nav aria-label="Pasos del ciclo" className="flex flex-col gap-3 border-t border-linea pt-6 sm:flex-row">
            <PasoVecino paso={anterior} direccion="anterior" empresaId={empresaId} search={search} />
            <PasoVecino paso={siguiente} direccion="siguiente" empresaId={empresaId} search={search} />
          </nav>
        )}
      </div>
    </EmpresaContext.Provider>
  );
}
