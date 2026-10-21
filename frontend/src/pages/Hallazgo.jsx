import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { etiquetaEjecucion } from "../components/estados";
import { cabecera, campo, codigo, contenedorTabla, cuerpo, tabla, td, th } from "../components/estilos";
import { BotonCopiar, Encabezado, Ficha } from "../components/ui";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

/** Un eslabón de la cadena observable, evidencia, correctivo y re-observación. */
function Eslabon({ numero, titulo, tipo, descripcion, ultimo = false, children }) {
  return (
    <li className="relative grid grid-cols-[2rem_1fr] gap-x-4">
      {!ultimo && <span aria-hidden="true" className="absolute top-9 bottom-0 left-4 w-px -translate-x-1/2 bg-linea-fuerte" />}
      <span aria-hidden="true" className="z-[1] grid size-8 place-items-center rounded-full bg-barra text-sm font-bold text-barra-texto tabular">
        {numero}
      </span>
      <section className="min-w-0 pb-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          {tipo && <span className="text-sm text-texto-3">Control {tipo}</span>}
        </div>
        {descripcion && <p className="mt-0.5 text-sm text-texto-2">{descripcion}</p>}
        <div className="mt-3 space-y-3">{children}</div>
      </section>
    </li>
  );
}

export default function Hallazgo() {
  const { obsId } = useParams();
  const { empresa, ejecucionId, ejecuciones } = useEmpresa();
  const [otra, setOtra] = useState("");

  const hallazgo = useCarga(() => (ejecucionId ? api.hallazgo(ejecucionId, obsId) : Promise.resolve(null)), [ejecucionId, obsId]);
  const reobservacion = useCarga(() => (otra ? api.hallazgo(otra, obsId) : Promise.resolve(null)), [otra, obsId]);

  if (!ejecucionId) return <Aviso>No hay ejecuciones. Observa la base desde el Dashboard.</Aviso>;
  if (hallazgo.cargando && !hallazgo.datos) return <Cargando />;
  if (hallazgo.error) return <Aviso tono="error">{hallazgo.error}</Aviso>;

  const { entrada, resultado, correctivos } = hallazgo.datos;
  const columnas = resultado.hallazgos[0] ? Object.keys(resultado.hallazgos[0]) : [];
  const despues = reobservacion.datos?.resultado;

  return (
    <div className="space-y-7">
      <Link to={`/empresas/${empresa.id}?ejecucion=${ejecucionId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-texto-2 hover:text-acento">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al Dashboard
      </Link>

      <Encabezado titulo={entrada.nombre} ayuda="hallazgo">
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-semibold">{entrada.id}</span>
          <EstadoBadge estado={resultado.estado} />
          <span className="text-sm text-texto-3">
            {resultado.hallazgos.length} {resultado.hallazgos.length === 1 ? "hallazgo" : "hallazgos"} en la ejecución #{ejecucionId}
          </span>
        </div>
      </Encabezado>

      <Ficha
        columnas="grid-cols-2 lg:grid-cols-4"
        datos={[
          ["Control ISO", entrada.control_iso, true],
          ["Riesgo", entrada.riesgo, true],
          ["Tarea del DBA", entrada.tarea, true],
          ["Alcance", entrada.alcance],
        ]}
      />

      <ol>
        <Eslabon
          numero={1}
          titulo="Observable"
          tipo="detectivo"
          descripcion="Consulta de solo lectura sobre el diccionario de datos. Cada fila devuelta es un hallazgo."
        >
          <div className="relative">
            <pre className={`${codigo} pr-28`}>{entrada.sql}</pre>
            <div className="absolute top-2 right-2">
              <BotonCopiar texto={entrada.sql} />
            </div>
          </div>
        </Eslabon>

        <Eslabon numero={2} titulo="Evidencia" descripcion="Lo que devolvió la consulta en esta ejecución.">
          {resultado.estado === "No evaluable" && (
            <Aviso tono="aviso" titulo="No se pudo observar">
              {resultado.motivo}
            </Aviso>
          )}
          {resultado.estado === "Cumple" && <Aviso tono="info">Sin hallazgos: la consulta no devolvió filas.</Aviso>}
          {resultado.truncado && <Aviso tono="aviso">Se muestran solo las primeras filas; el resultado se truncó.</Aviso>}
          {columnas.length > 0 && (
            <div className={contenedorTabla}>
              <table className={tabla}>
                <thead className={cabecera}>
                  <tr>
                    {columnas.map((c) => (
                      <th key={c} scope="col" className={`${th} font-mono`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cuerpo}>
                  {resultado.hallazgos.map((fila, i) => (
                    <tr key={i}>
                      {columnas.map((c) => (
                        <td key={c} className={`${td} font-mono text-[0.8125rem]`}>
                          {String(fila[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Eslabon>

        <Eslabon
          numero={3}
          titulo="Correctivo generado"
          tipo="correctivo"
          descripcion="El instrumento solo propone. El DBA lo revisa y lo aplica con su gestión de cambios."
        >
          {correctivos.length === 0 ? (
            <p className="text-sm text-texto-3">No hay nada que corregir en esta ejecución.</p>
          ) : (
            <>
              {entrada.correctivo.nota && <Aviso tono="aviso">{entrada.correctivo.nota}</Aviso>}
              {correctivos.map((c, i) =>
                c.script ? (
                  <div key={i} className="relative">
                    <pre className={`${codigo} pr-28`}>{c.script}</pre>
                    <div className="absolute top-2 right-2">
                      <BotonCopiar texto={c.script} />
                    </div>
                  </div>
                ) : (
                  <Aviso key={i} tono="aviso" titulo="Revisar manualmente">
                    {c.error}
                  </Aviso>
                ),
              )}
            </>
          )}
        </Eslabon>

        <Eslabon
          numero={4}
          titulo="Re-observación"
          tipo="detectivo"
          descripcion="Compara con otra ejecución para comprobar que el hallazgo se cerró."
          ultimo
        >
          <select value={otra} onChange={(e) => setOtra(e.target.value)} className={`${campo} max-w-md`} aria-label="Ejecución a comparar">
            <option value="">Elige una ejecución…</option>
            {ejecuciones
              .filter((e) => e.id !== ejecucionId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {etiquetaEjecucion(e)}
                </option>
              ))}
          </select>
          {reobservacion.cargando && otra && <Cargando />}
          <Aviso tono="error">{reobservacion.error}</Aviso>
          {despues && (
            <div className="grid items-center gap-3 rounded-xl bg-superficie px-5 py-4 shadow-tarjeta sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <p className="text-xs text-texto-3">Ejecución #{ejecucionId}</p>
                <div className="mt-1 flex items-center gap-2">
                  <EstadoBadge estado={resultado.estado} />
                  <span className="text-sm text-texto-2 tabular">{resultado.hallazgos.length} hallazgos</span>
                </div>
              </div>
              <ArrowRight aria-hidden="true" className="size-5 text-texto-3 max-sm:rotate-90" />
              <div>
                <p className="text-xs text-texto-3">Ejecución #{otra}</p>
                <div className="mt-1 flex items-center gap-2">
                  <EstadoBadge estado={despues.estado} />
                  <span className="text-sm text-texto-2 tabular">{despues.hallazgos.length} hallazgos</span>
                </div>
              </div>
            </div>
          )}
        </Eslabon>
      </ol>

      <section className="flex gap-3 rounded-xl bg-cumple-suave px-5 py-4">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-cumple" />
        <div>
          <h2 className="font-semibold">Control preventivo recomendado</h2>
          <p className="mt-1 text-sm text-texto">{entrada.preventivo}</p>
          {entrada.limitaciones && (
            <p className="mt-2 text-sm text-texto-2">
              <span className="font-medium text-texto">Limitaciones del observable:</span> {entrada.limitaciones}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
