import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { botonSecundario, cabecera, campo, codigo, contenedorTabla, cuerpo, tabla, td, tarjeta, th } from "../components/estilos";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

function copiar(texto) {
  navigator.clipboard?.writeText(texto);
}

export default function Hallazgo() {
  const { obsId } = useParams();
  const { empresa, ejecucionId, ejecuciones } = useEmpresa();
  const [otra, setOtra] = useState("");

  const hallazgo = useCarga(
    () => (ejecucionId ? api.hallazgo(ejecucionId, obsId) : Promise.resolve(null)),
    [ejecucionId, obsId],
  );
  const reobservacion = useCarga(() => (otra ? api.hallazgo(otra, obsId) : Promise.resolve(null)), [otra, obsId]);

  if (!ejecucionId) return <Aviso>No hay ejecuciones. Observe la base desde el Dashboard.</Aviso>;
  if (hallazgo.cargando && !hallazgo.datos) return <Cargando />;
  if (hallazgo.error) return <Aviso tono="error">{hallazgo.error}</Aviso>;

  const { entrada, resultado, correctivos } = hallazgo.datos;
  const columnas = resultado.hallazgos[0] ? Object.keys(resultado.hallazgos[0]) : [];

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link to={`/empresas/${empresa.id}?ejecucion=${ejecucionId}`} className="underline underline-offset-2">
          ← Dashboard
        </Link>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
            {entrada.id} · {entrada.control_iso} · {entrada.riesgo} · {entrada.tarea} · alcance {entrada.alcance}
          </p>
          <h3 className="text-lg font-semibold">{entrada.nombre}</h3>
        </div>
        <EstadoBadge estado={resultado.estado} />
      </div>

      <section className="space-y-2">
        <h4 className="font-semibold">1. Observable</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Consulta de solo lectura sobre catálogo y metadatos. Cada fila devuelta es un hallazgo.
        </p>
        <pre className={codigo}>{entrada.sql}</pre>
      </section>

      <section className="space-y-2">
        <h4 className="font-semibold">2. Evidencia</h4>
        {resultado.estado === "No evaluable" && <Aviso tono="aviso">No se pudo observar: {resultado.motivo}</Aviso>}
        {resultado.estado === "Cumple" && <Aviso tono="info">Sin hallazgos: el observable no devolvió filas.</Aviso>}
        {resultado.truncado && <Aviso tono="aviso">Se muestran solo las primeras filas; el resultado fue truncado.</Aviso>}
        {columnas.length > 0 && (
          <div className={contenedorTabla}>
            <table className={tabla}>
              <thead className={cabecera}>
                <tr>
                  {columnas.map((c) => (
                    <th key={c} scope="col" className={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cuerpo}>
                {resultado.hallazgos.map((fila, i) => (
                  <tr key={i}>
                    {columnas.map((c) => (
                      <td key={c} className={`${td} font-mono text-xs`}>
                        {String(fila[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {correctivos.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-semibold">3. Correctivo generado</h4>
          <Aviso tono="aviso">
            El instrumento solo propone. El DBA de la empresa revisa y aplica el script bajo su gestión de cambios.
          </Aviso>
          {entrada.correctivo.nota && <p className="text-sm text-slate-600 dark:text-slate-300">{entrada.correctivo.nota}</p>}
          {correctivos.map((c, i) => (
            <div key={i} className={`${tarjeta} space-y-2`}>
              {c.script ? (
                <>
                  <pre className={codigo}>{c.script}</pre>
                  <button type="button" onClick={() => copiar(c.script)} className={botonSecundario}>
                    Copiar
                  </button>
                </>
              ) : (
                <Aviso tono="aviso">Revisar manualmente: {c.error}</Aviso>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h4 className="font-semibold">4. Re-observación</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">Compare con otra ejecución para comprobar que el hallazgo se cerró.</p>
        <select value={otra} onChange={(e) => setOtra(e.target.value)} className={`${campo} max-w-md`} aria-label="Ejecución a comparar">
          <option value="">Seleccione una ejecución…</option>
          {ejecuciones
            .filter((e) => e.id !== ejecucionId)
            .map((e) => (
              <option key={e.id} value={e.id}>
                #{e.id}
                {e.etiqueta ? ` · ${e.etiqueta}` : ""} · {new Date(e.iniciada_en).toLocaleString()}
              </option>
            ))}
        </select>
        {reobservacion.cargando && otra && <Cargando />}
        <Aviso tono="error">{reobservacion.error}</Aviso>
        {reobservacion.datos && (
          <p className="text-sm">
            Ejecución #{ejecucionId}: <EstadoBadge estado={resultado.estado} /> ({resultado.hallazgos.length} hallazgos) → ejecución #{otra}:{" "}
            <EstadoBadge estado={reobservacion.datos.resultado.estado} /> ({reobservacion.datos.resultado.hallazgos.length} hallazgos)
          </p>
        )}
      </section>

      <section className="space-y-1">
        <h4 className="font-semibold">Control preventivo recomendado</h4>
        <p className="text-sm">{entrada.preventivo}</p>
        {entrada.limitaciones && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium">Limitaciones del observable:</span> {entrada.limitaciones}
          </p>
        )}
      </section>
    </div>
  );
}
