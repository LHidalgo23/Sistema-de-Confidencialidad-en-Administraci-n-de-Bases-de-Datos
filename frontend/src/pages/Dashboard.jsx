import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { boton, botonSecundario, cabecera, campo, contenedorTabla, cuerpo, tabla, td, tarjeta, th } from "../components/estilos";
import { useAccion, useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

const ORDEN_ESTADOS = ["Cumple", "Parcial", "No cumple", "No evaluable"];

function datosGrafico(antes, despues) {
  const madurezAntes = Object.fromEntries(antes.controles.map((c) => [c.control_id, c.madurez ?? 0]));
  return despues.controles.map((c) => ({
    control: c.control_id,
    Antes: madurezAntes[c.control_id] ?? 0,
    Después: c.madurez ?? 0,
  }));
}

function etiquetaEjecucion(e) {
  const fecha = new Date(e.iniciada_en).toLocaleString();
  return `#${e.id}${e.etiqueta ? ` · ${e.etiqueta}` : ""} · ${fecha}`;
}

export default function Dashboard() {
  const { empresa, password, ejecuciones, recargarEjecuciones, ejecucionId, seleccionarEjecucion } = useEmpresa();
  const [etiqueta, setEtiqueta] = useState("antes");
  const [comparacion, setComparacion] = useState({ antes: null, despues: null });
  const [revision, setRevision] = useState({ revisor: "", notas: "" });

  const auditar = useAccion(useCallback((et) => api.auditar(empresa.id, password, et), [empresa.id, password]));
  const revisar = useAccion(useCallback((cuerpoPeticion) => api.revisar(ejecucionId, cuerpoPeticion), [ejecucionId]));
  const actual = useCarga(() => (ejecucionId ? api.ejecucion(ejecucionId) : Promise.resolve(null)), [ejecucionId]);

  const idDespues = comparacion.despues ?? ejecuciones[0]?.id ?? null;
  const idAntes = comparacion.antes ?? ejecuciones[1]?.id ?? null;
  const comparada = useCarga(async () => {
    if (!idAntes || !idDespues || idAntes === idDespues) return null;
    const [antes, despues] = await Promise.all([api.ejecucion(idAntes), api.ejecucion(idDespues)]);
    return { antes, despues };
  }, [idAntes, idDespues]);

  const grafico = useMemo(
    () => (comparada.datos ? datosGrafico(comparada.datos.antes, comparada.datos.despues) : null),
    [comparada.datos],
  );

  async function ejecutarAuditoria() {
    const nueva = await auditar.ejecutar(etiqueta);
    if (nueva) {
      setComparacion({ antes: null, despues: null });
      recargarEjecuciones();
      seleccionarEjecucion(nueva.id);
    }
  }

  async function registrarRevision(evento) {
    evento.preventDefault();
    const resultado = await revisar.ejecutar(revision);
    if (resultado) {
      actual.recargar();
      recargarEjecuciones();
    }
  }

  const ejecucion = actual.datos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Semáforo de controles</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ejecucion
              ? `Ejecución #${ejecucion.id}${ejecucion.etiqueta ? ` (${ejecucion.etiqueta})` : ""} · ${new Date(ejecucion.iniciada_en).toLocaleString()} · Oracle ${ejecucion.version_oracle} · ${ejecucion.contenedor}`
              : "Aún no hay ejecuciones: observe la base por primera vez."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Etiqueta</span>
            <input list="etiquetas" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} maxLength={40} className={`${campo} w-36`} />
            <datalist id="etiquetas">
              <option value="antes" />
              <option value="despues" />
            </datalist>
          </label>
          <button type="button" onClick={ejecutarAuditoria} disabled={auditar.cargando} className={boton}>
            {auditar.cargando ? "Observando…" : "Observar (auditar)"}
          </button>
        </div>
      </div>

      <Aviso tono="error">{auditar.error}</Aviso>
      {actual.cargando && !ejecucion && ejecucionId && <Cargando texto="Cargando ejecución…" />}

      {ejecucion && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className={tarjeta}>
              <p className="text-xs text-slate-500 dark:text-slate-400">Madurez promedio</p>
              <p className="mt-1 text-2xl font-semibold">{ejecucion.madurez_promedio ?? "—"}<span className="text-sm font-normal"> / 4</span></p>
            </div>
            {ORDEN_ESTADOS.map((estado) => (
              <div key={estado} className={tarjeta}>
                <p className="text-xs text-slate-500 dark:text-slate-400">{estado}</p>
                <p className="mt-1 text-2xl font-semibold">{ejecucion.conteo_controles[estado]}</p>
              </div>
            ))}
            <div className={tarjeta}>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revisión</p>
              <p className="mt-1 text-sm font-medium">{ejecucion.revisada_por ? `Revisada por ${ejecucion.revisada_por}` : "Sin revisar"}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ejecucion.controles.map((control) => (
              <div key={control.control_id} className={tarjeta}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                      {control.control_id}
                      {!control.nucleo && " · extra"}
                    </p>
                    <p className="font-medium">{control.nombre}</p>
                  </div>
                  <EstadoBadge estado={control.estado} />
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {control.madurez === null ? "Sin madurez calculable" : `Madurez ${control.madurez}/4`} · cobertura{" "}
                  {Math.round(control.cobertura * 100)} %
                </p>
                {control.aceptado && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Parcial justificado: {control.justificacion}</p>
                )}
                {control.con_hallazgos.length > 0 && (
                  <p className="mt-2 text-sm">
                    {control.con_hallazgos.map((obs) => (
                      <Link
                        key={obs}
                        to={`/empresas/${empresa.id}/hallazgos/${obs}?ejecucion=${ejecucion.id}`}
                        className="mr-2 font-mono underline underline-offset-2"
                      >
                        {obs}
                      </Link>
                    ))}
                  </p>
                )}
                {control.no_evaluables.length > 0 && (
                  <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">No evaluable: {control.no_evaluables.join(", ")}</p>
                )}
              </div>
            ))}
          </div>

          <section className="space-y-2">
            <h4 className="font-semibold">Observables de esta ejecución</h4>
            <div className={contenedorTabla}>
              <table className={tabla}>
                <thead className={cabecera}>
                  <tr>
                    {["Observable", "Control", "Descripción", "Severidad", "Estado", "Hallazgos", ""].map((titulo) => (
                      <th key={titulo} scope="col" className={th}>
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cuerpo}>
                  {ejecucion.observables.map((o) => (
                    <tr key={o.obs_id}>
                      <td className={`${td} font-mono`}>{o.obs_id}</td>
                      <td className={td}>{o.control_iso}</td>
                      <td className={td}>
                        {o.nombre}
                        {o.motivo && <span className="block text-xs text-slate-500 dark:text-slate-400">{o.motivo}</span>}
                      </td>
                      <td className={td}>{o.severidad}</td>
                      <td className={td}>
                        <EstadoBadge estado={o.estado} />
                      </td>
                      <td className={td}>{o.hallazgos}</td>
                      <td className={td}>
                        {o.estado !== "Cumple" && (
                          <Link to={`/empresas/${empresa.id}/hallazgos/${o.obs_id}?ejecucion=${ejecucion.id}`} className="underline underline-offset-2">
                            Ver
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form onSubmit={registrarRevision} className={`${tarjeta} space-y-3`}>
            <h4 className="font-semibold">Registrar revisión de esta ejecución</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              La revisión firmada del DBA es una de las condiciones del nivel 4 (Gestionado).
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                required
                minLength={2}
                placeholder="Revisor"
                aria-label="Revisor"
                value={revision.revisor}
                onChange={(e) => setRevision((p) => ({ ...p, revisor: e.target.value }))}
                className={campo}
              />
              <input
                placeholder="Notas (opcional)"
                aria-label="Notas de la revisión"
                value={revision.notas}
                onChange={(e) => setRevision((p) => ({ ...p, notas: e.target.value }))}
                className={`${campo} md:col-span-2`}
              />
            </div>
            <Aviso tono="error">{revisar.error}</Aviso>
            <button type="submit" disabled={revisar.cargando} className={botonSecundario}>
              Registrar revisión
            </button>
          </form>
        </>
      )}

      {ejecuciones.length > 1 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Antes y después</h3>
          <div className="flex flex-wrap gap-3">
            {[
              ["Antes", idAntes, "antes"],
              ["Después", idDespues, "despues"],
            ].map(([titulo, valor, clave]) => (
              <label key={clave} className="text-sm">
                <span className="mb-1 block text-slate-600 dark:text-slate-300">{titulo}</span>
                <select
                  value={valor ?? ""}
                  onChange={(e) => setComparacion((p) => ({ ...p, [clave]: Number(e.target.value) }))}
                  className={campo}
                >
                  {ejecuciones.map((e) => (
                    <option key={e.id} value={e.id}>
                      {etiquetaEjecucion(e)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {comparada.cargando && <Cargando />}
          <Aviso tono="error">{comparada.error}</Aviso>
          {grafico && (
            <div className={`${tarjeta} h-80`} role="img" aria-label="Madurez por control, antes y después">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="control" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Antes" fill="#94a3b8" />
                  <Bar dataKey="Después" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {ejecuciones.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Historial de ejecuciones</h3>
          <div className={contenedorTabla}>
            <table className={tabla}>
              <thead className={cabecera}>
                <tr>
                  {["Ejecución", "Etiqueta", "Fecha", "Oracle", "Observables con hallazgos", "Revisión", ""].map((titulo) => (
                    <th key={titulo} scope="col" className={th}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cuerpo}>
                {ejecuciones.map((e) => (
                  <tr key={e.id}>
                    <td className={`${td} font-mono`}>#{e.id}</td>
                    <td className={td}>{e.etiqueta || "—"}</td>
                    <td className={td}>{new Date(e.iniciada_en).toLocaleString()}</td>
                    <td className={td}>{e.version_oracle}</td>
                    <td className={td}>{e.con_hallazgos}</td>
                    <td className={td}>{e.revisada_por ?? "—"}</td>
                    <td className={td}>
                      <button type="button" onClick={() => seleccionarEjecucion(e.id)} className="underline underline-offset-2">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
