import { Radar, ScanEye, Signature } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { ESTADOS, ORDEN_ESTADOS, etiquetaEjecucion } from "../components/estados";
import { boton, botonSecundario, cabecera, campo, contenedorTabla, cuerpo, enlace, etiquetaCampo, tabla, td, th } from "../components/estilos";
import { Encabezado, MedidorMadurez, Seccion, Segmentado, Vacio } from "../components/ui";
import { useAccion, useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

function datosGrafico(antes, despues) {
  const madurezAntes = Object.fromEntries(antes.controles.map((c) => [c.control_id, c.madurez ?? 0]));
  return despues.controles.map((c) => ({
    control: c.control_id,
    Antes: madurezAntes[c.control_id] ?? 0,
    Después: c.madurez ?? 0,
  }));
}

/** Resumen de la ejecución: madurez promedio, reparto por estado y revisión. */
function Resumen({ ejecucion }) {
  const total = ejecucion.controles.length;
  return (
    <section aria-label="Resumen de la ejecución" className="overflow-hidden rounded-xl bg-superficie shadow-tarjeta">
      <div className="grid grid-cols-2 gap-px bg-linea sm:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="col-span-2 bg-superficie px-5 py-4 sm:col-span-1">
          <p className="text-sm text-texto-3">Madurez promedio</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[2.5rem] leading-none font-bold tracking-tight tabular">{ejecucion.madurez_promedio ?? "—"}</span>
            <span className="text-texto-3">de 4</span>
          </p>
          <p className="mt-2 text-xs text-texto-3">
            Sobre los controles con madurez calculable ({total - ejecucion.conteo_controles["No evaluable"]} de {total})
          </p>
        </div>
        {ORDEN_ESTADOS.map((estado) => {
          const { icono: Icono, clase } = ESTADOS[estado];
          return (
            <div key={estado} className="bg-superficie px-5 py-4">
              <p className="flex items-center gap-1.5 text-sm text-texto-2">
                <span className={`grid size-5 place-items-center rounded-full ${clase}`}>
                  <Icono aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
                </span>
                {estado}
              </p>
              <p className="mt-2 text-[1.75rem] leading-none font-bold tabular">{ejecucion.conteo_controles[estado]}</p>
              <p className="mt-1 text-xs text-texto-3">controles</p>
            </div>
          );
        })}
      </div>
      <div className="border-t border-linea px-5 py-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-linea" aria-hidden="true">
          {ORDEN_ESTADOS.map((estado) => {
            const n = ejecucion.conteo_controles[estado];
            return n ? <span key={estado} className={ESTADOS[estado].punto} style={{ width: `${(n / total) * 100}%` }} /> : null;
          })}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-texto-3">
          <span className="inline-flex items-center gap-1.5">
            <Signature aria-hidden="true" className="size-3.5" />
            {ejecucion.revisada_por ? `Revisada por ${ejecucion.revisada_por}` : "Sin revisión registrada"}
          </span>
          <span>
            Oracle {ejecucion.version_oracle}, contenedor {ejecucion.contenedor}
          </span>
        </p>
      </div>
    </section>
  );
}

function TarjetaControl({ control, empresaId, ejecucionId }) {
  return (
    <article className="flex flex-col gap-3 border-r border-b border-linea px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="font-mono text-[0.8125rem] font-medium text-texto-2">{control.control_id}</span>
            {!control.nucleo && (
              <span className="rounded bg-superficie-2 px-1.5 py-px text-[0.6875rem] font-medium text-texto-3 shadow-[inset_0_0_0_1px_var(--linea)]">
                extra
              </span>
            )}
          </p>
          <h3 className="mt-0.5 leading-snug font-semibold text-texto">{control.nombre}</h3>
        </div>
        <EstadoBadge estado={control.estado} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MedidorMadurez valor={control.madurez} estado={control.estado} />
        <span className="text-xs text-texto-3 tabular">Cobertura {Math.round(control.cobertura * 100)} %</span>
      </div>
      {control.aceptado && (
        <p className="rounded-md bg-parcial-suave px-2.5 py-1.5 text-xs text-texto-2">
          <span className="font-semibold text-parcial">Parcial justificado.</span> {control.justificacion}
        </p>
      )}
      {(control.con_hallazgos.length > 0 || control.no_evaluables.length > 0) && (
        <div className="mt-auto space-y-1.5 border-t border-linea pt-3 text-xs">
          {control.con_hallazgos.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-texto-3">Con hallazgos:</span>
              {control.con_hallazgos.map((obs) => (
                <Link
                  key={obs}
                  to={`/empresas/${empresaId}/hallazgos/${obs}?ejecucion=${ejecucionId}`}
                  className="rounded bg-nocumple-suave px-1.5 py-0.5 font-mono font-medium text-nocumple hover:underline"
                >
                  {obs}
                </Link>
              ))}
            </p>
          )}
          {control.no_evaluables.length > 0 && (
            <p className="text-texto-3">
              No evaluable: <span className="font-mono text-noeval">{control.no_evaluables.join(", ")}</span>
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Controles({ ejecucion, empresaId }) {
  const [filtro, setFiltro] = useState("");
  const visibles = ejecucion.controles.filter((c) => !filtro || c.estado === filtro);
  const opciones = [
    { valor: "", etiqueta: "Todos", cuenta: ejecucion.controles.length },
    ...ORDEN_ESTADOS.map((estado) => ({
      valor: estado,
      etiqueta: estado,
      punto: ESTADOS[estado].punto,
      cuenta: ejecucion.controles.filter((c) => c.estado === estado).length,
    })),
  ];
  return (
    <Seccion
      titulo="Controles ISO 27001"
      descripcion="Los 15 controles del enunciado y 4 extras. La madurez se calcula con el porcentaje de observables que cumplen."
      acciones={<Segmentado etiqueta="Filtrar controles por estado" nombre="filtro-controles" opciones={opciones} valor={filtro} onChange={setFiltro} />}
    >
      {visibles.length === 0 ? (
        <p className="text-sm text-texto-3">Ningún control está en «{filtro}».</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-superficie shadow-tarjeta">
          {/* Cada tarjeta dibuja su borde derecho e inferior; el margen negativo esconde los del borde exterior. */}
          <div className="-mr-px -mb-px grid sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((control) => (
              <TarjetaControl key={control.control_id} control={control} empresaId={empresaId} ejecucionId={ejecucion.id} />
            ))}
          </div>
        </div>
      )}
    </Seccion>
  );
}

function Observables({ ejecucion, empresaId }) {
  const [soloPendientes, setSoloPendientes] = useState(false);
  const filas = ejecucion.observables.filter((o) => !soloPendientes || o.estado !== "Cumple");
  return (
    <Seccion
      titulo="Observables de esta ejecución"
      descripcion="Las 24 consultas de solo lectura. Cada fila devuelta por una consulta es un hallazgo."
      acciones={
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-texto-2">
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="size-4 accent-[var(--acento)]" />
          Solo los que no cumplen
        </label>
      }
    >
      <div className={contenedorTabla}>
        <table className={tabla}>
          <thead className={cabecera}>
            <tr>
              {["Observable", "Control", "Qué revisa", "Origen", "Severidad", "Estado", "Hallazgos"].map((titulo) => (
                <th key={titulo} scope="col" className={th}>
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cuerpo}>
            {filas.map((o) => (
              <tr key={o.obs_id}>
                <td className={`${td} whitespace-nowrap`}>
                  {o.estado !== "Cumple" ? (
                    <Link to={`/empresas/${empresaId}/hallazgos/${o.obs_id}?ejecucion=${ejecucion.id}`} className={`${enlace} font-mono`}>
                      {o.obs_id}
                    </Link>
                  ) : (
                    <span className="font-mono text-texto-2">{o.obs_id}</span>
                  )}
                </td>
                <td className={`${td} font-mono text-[0.8125rem]`}>{o.control_iso}</td>
                <td className={`${td} min-w-64`}>
                  {o.nombre}
                  {o.motivo && <span className="mt-0.5 block text-xs text-texto-3">{o.motivo}</span>}
                </td>
                <td className={`${td} text-xs text-texto-2`}>{o.origen}</td>
                <td className={`${td} text-texto-2`}>{o.severidad}</td>
                <td className={td}>
                  <EstadoBadge estado={o.estado} />
                </td>
                <td className={`${td} text-right font-medium tabular`}>{o.hallazgos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

function Comparacion({ ejecuciones }) {
  const [comparacion, setComparacion] = useState({ antes: null, despues: null });
  const idDespues = comparacion.despues ?? ejecuciones[0]?.id ?? null;
  const idAntes = comparacion.antes ?? ejecuciones[1]?.id ?? null;
  const comparada = useCarga(async () => {
    if (!idAntes || !idDespues || idAntes === idDespues) return null;
    const [antes, despues] = await Promise.all([api.ejecucion(idAntes), api.ejecucion(idDespues)]);
    return { antes, despues };
  }, [idAntes, idDespues]);

  const grafico = useMemo(() => (comparada.datos ? datosGrafico(comparada.datos.antes, comparada.datos.despues) : null), [comparada.datos]);

  return (
    <Seccion
      titulo="Antes y después"
      descripcion="Madurez de cada control en dos ejecuciones. Así se demuestra que el correctivo funcionó."
      acciones={
        <div className="flex flex-wrap gap-3">
          {[
            ["Antes", idAntes, "antes"],
            ["Después", idDespues, "despues"],
          ].map(([titulo, valor, clave]) => (
            <label key={clave} className="text-sm">
              <span className={etiquetaCampo}>{titulo}</span>
              <select
                value={valor ?? ""}
                onChange={(e) => setComparacion((p) => ({ ...p, [clave]: Number(e.target.value) }))}
                className={`${campo} w-auto max-w-72`}
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
      }
    >
      {comparada.cargando && <Cargando />}
      <Aviso tono="error">{comparada.error}</Aviso>
      {idAntes === idDespues && <p className="text-sm text-texto-3">Elige dos ejecuciones distintas para compararlas.</p>}
      {grafico && (
        <figure className="rounded-xl bg-superficie px-3 pt-5 pb-3 shadow-tarjeta">
          <div className="h-80" role="img" aria-label="Gráfico de barras: madurez por control, antes y después">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico} barGap={2} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="control" tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={{ stroke: "var(--linea)" }} />
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--superficie-2)" }}
                  contentStyle={{
                    background: "var(--superficie)",
                    border: "1px solid var(--linea)",
                    borderRadius: 8,
                    color: "var(--texto)",
                    fontSize: 13,
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: "var(--texto-2)" }} />
                {/* Sin animación: el gráfico se usa en capturas de evidencia y debe verse completo al instante. */}
                <Bar dataKey="Antes" fill="var(--linea-fuerte)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Después" fill="var(--acento)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="px-2 pt-2 text-xs text-texto-3">Escala 0-4. Un control sin madurez calculable se dibuja en 0.</figcaption>
        </figure>
      )}
    </Seccion>
  );
}

function Revision({ ejecucionId, alRegistrar }) {
  const [revision, setRevision] = useState({ revisor: "", notas: "" });
  const revisar = useAccion(useCallback((cuerpoPeticion) => api.revisar(ejecucionId, cuerpoPeticion), [ejecucionId]));

  async function registrar(evento) {
    evento.preventDefault();
    if (await revisar.ejecutar(revision)) alRegistrar();
  }

  return (
    <section aria-labelledby="titulo-revision" className="rounded-xl bg-superficie shadow-tarjeta">
      <div className="border-b border-linea px-5 py-4">
        <h2 id="titulo-revision" className="text-lg font-semibold">
          Registrar la revisión del DBA
        </h2>
        <p className="mt-0.5 text-sm text-texto-3">
          Una revisión firmada es una de las condiciones del nivel 4 (Gestionado), junto con la auditoría activa y la cobertura completa.
        </p>
      </div>
      <form onSubmit={registrar} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
        <label className="text-sm">
          <span className={etiquetaCampo}>Revisor</span>
          <input
            required
            minLength={2}
            value={revision.revisor}
            onChange={(e) => setRevision((p) => ({ ...p, revisor: e.target.value }))}
            className={campo}
          />
        </label>
        <label className="text-sm">
          <span className={etiquetaCampo}>Notas (opcional)</span>
          <input value={revision.notas} onChange={(e) => setRevision((p) => ({ ...p, notas: e.target.value }))} className={campo} />
        </label>
        <button type="submit" disabled={revisar.cargando} className={botonSecundario}>
          <Signature aria-hidden="true" className="size-4" />
          {revisar.cargando ? "Registrando…" : "Registrar revisión"}
        </button>
        <div className="md:col-span-3">
          <Aviso tono="error">{revisar.error}</Aviso>
        </div>
      </form>
    </section>
  );
}

function Historial({ ejecuciones, ejecucionId, seleccionar }) {
  return (
    <Seccion titulo="Historial de ejecuciones" descripcion="Cada observación queda guardada con su fecha y su versión de Oracle.">
      <div className={contenedorTabla}>
        <table className={tabla}>
          <thead className={cabecera}>
            <tr>
              {["Ejecución", "Etiqueta", "Fecha", "Oracle", "Observables con hallazgos", "Revisión", ""].map((titulo) => (
                <th key={titulo || "accion"} scope="col" className={th}>
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cuerpo}>
            {ejecuciones.map((e) => {
              const activa = e.id === ejecucionId;
              return (
                <tr key={e.id} aria-current={activa ? "true" : undefined} className={activa ? "bg-acento-suave/50" : ""}>
                  <td className={`${td} font-mono font-medium`}>#{e.id}</td>
                  <td className={td}>{e.etiqueta || "—"}</td>
                  <td className={`${td} whitespace-nowrap text-texto-2`}>{new Date(e.iniciada_en).toLocaleString()}</td>
                  <td className={`${td} text-texto-2`}>{e.version_oracle}</td>
                  <td className={`${td} tabular`}>{e.con_hallazgos}</td>
                  <td className={`${td} text-texto-2`}>{e.revisada_por ?? "—"}</td>
                  <td className={`${td} text-right`}>
                    {activa ? (
                      <span className="text-xs font-semibold text-acento">En pantalla</span>
                    ) : (
                      <button type="button" onClick={() => seleccionar(e.id)} className={botonSecundario}>
                        Ver
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

export default function Dashboard() {
  const { empresa, claves, ejecuciones, recargarEjecuciones, ejecucionId, seleccionarEjecucion } = useEmpresa();
  const [etiqueta, setEtiqueta] = useState(ejecuciones.length ? "despues" : "antes");

  const auditar = useAccion(useCallback((et) => api.auditar(empresa.id, claves, et), [empresa.id, claves]));
  const actual = useCarga(() => (ejecucionId ? api.ejecucion(ejecucionId) : Promise.resolve(null)), [ejecucionId]);

  async function ejecutarAuditoria(evento) {
    evento.preventDefault();
    const nueva = await auditar.ejecutar(etiqueta);
    if (nueva) {
      recargarEjecuciones();
      seleccionarEjecucion(nueva.id);
    }
  }

  const ejecucion = actual.datos;

  return (
    <div className="space-y-9">
      <Encabezado
        titulo="Dashboard de controles"
        ayuda="dashboard"
        descripcion="Observa la base con los 24 observables y mira la madurez de cada control. Para cerrar el ciclo, corrige y vuelve a observar."
        acciones={
          <form onSubmit={ejecutarAuditoria} className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className={etiquetaCampo}>Etiqueta</span>
              <input list="etiquetas" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} maxLength={40} className={`${campo} w-36`} />
              <datalist id="etiquetas">
                <option value="antes" />
                <option value="despues" />
              </datalist>
            </label>
            <button type="submit" disabled={auditar.cargando} className={boton}>
              <Radar aria-hidden="true" className={`size-4 ${auditar.cargando ? "animate-spin" : ""}`} />
              {auditar.cargando ? "Observando…" : "Observar la base"}
            </button>
          </form>
        }
      />

      <Aviso tono="error" titulo="La observación no terminó">
        {auditar.error}
      </Aviso>
      {actual.cargando && !ejecucion && ejecucionId && <Cargando texto="Cargando ejecución…" />}

      {!ejecucionId && (
        <Vacio icono={ScanEye} titulo="Esta base aún no se ha observado">
          Escribe la etiqueta «antes» y pulsa «Observar la base». Si es la primera vez, conviene ejecutar antes el Pre-vuelo y el Descubrimiento.
        </Vacio>
      )}

      {ejecucion && (
        <>
          <div className="space-y-2">
            <p className="text-sm text-texto-2">
              Mostrando la ejecución <span className="font-semibold text-texto">#{ejecucion.id}</span>
              {ejecucion.etiqueta && <> con etiqueta «{ejecucion.etiqueta}»</>}, del {new Date(ejecucion.iniciada_en).toLocaleString()}
            </p>
            <Resumen ejecucion={ejecucion} />
          </div>
          <Controles ejecucion={ejecucion} empresaId={empresa.id} />
          <Observables ejecucion={ejecucion} empresaId={empresa.id} />
        </>
      )}

      {ejecuciones.length > 1 && <Comparacion key={ejecuciones[0].id} ejecuciones={ejecuciones} />}

      {ejecucion && (
        <Revision
          key={ejecucion.id}
          ejecucionId={ejecucion.id}
          alRegistrar={() => {
            actual.recargar();
            recargarEjecuciones();
          }}
        />
      )}

      {ejecuciones.length > 0 && <Historial ejecuciones={ejecuciones} ejecucionId={ejecucionId} seleccionar={seleccionarEjecucion} />}
    </div>
  );
}
