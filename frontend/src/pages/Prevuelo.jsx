import { useCallback } from "react";
import { api } from "../api/client";
import Aviso from "../components/Aviso";
import { boton, cabecera, contenedorTabla, cuerpo, tabla, td, tarjeta, th } from "../components/estilos";
import { useAccion } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

function Dato({ titulo, valor }) {
  return (
    <div className={tarjeta}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className="mt-1 font-mono text-sm break-all">{valor}</p>
    </div>
  );
}

export default function Prevuelo() {
  const { empresa, password } = useEmpresa();
  const prevuelo = useAccion(useCallback(() => api.prevuelo(empresa.id, password), [empresa.id, password]));
  const resultado = prevuelo.resultado;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Pre-vuelo</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Verifica versión, contenedor y privilegios del auditor, y anticipa qué controles quedarán como «No evaluable» y por qué.
          </p>
        </div>
        <button type="button" onClick={() => prevuelo.ejecutar()} disabled={prevuelo.cargando} className={boton}>
          {prevuelo.cargando ? "Verificando…" : "Ejecutar pre-vuelo"}
        </button>
      </div>

      <Aviso tono="error">{prevuelo.error}</Aviso>

      {resultado && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato titulo="Versión de Oracle" valor={resultado.version} />
            <Dato titulo="Contenedor" valor={`${resultado.contenedor} (${resultado.tipo_contenedor})`} />
            <Dato titulo="Usuario auditor" valor={resultado.usuario} />
            <Dato
              titulo="Controles evaluables"
              valor={`${resultado.observables_total - resultado.no_evaluables.length} de ${resultado.observables_total}`}
            />
          </div>

          {resultado.advertencias.map((texto) => (
            <Aviso key={texto} tono="aviso">
              {texto}
            </Aviso>
          ))}

          <section className="space-y-2">
            <h4 className="font-semibold">Privilegios efectivos del auditor</h4>
            <p className="text-sm">
              <span className="font-medium">Roles:</span> {resultado.roles.join(", ") || "ninguno"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Privilegios de sistema:</span> {resultado.privilegios.join(", ") || "ninguno"}
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold">Controles que quedarían «No evaluable»</h4>
            {resultado.no_evaluables.length === 0 ? (
              <Aviso tono="info">El auditor puede observar todos los controles del catálogo.</Aviso>
            ) : (
              <div className={contenedorTabla}>
                <table className={tabla}>
                  <thead className={cabecera}>
                    <tr>
                      {["Observable", "Control ISO", "Motivo"].map((titulo) => (
                        <th key={titulo} scope="col" className={th}>
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={cuerpo}>
                    {resultado.no_evaluables.map((fila) => (
                      <tr key={fila.obs_id}>
                        <td className={`${td} font-mono`}>{fila.obs_id}</td>
                        <td className={td}>{fila.control_iso}</td>
                        <td className={td}>{fila.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
