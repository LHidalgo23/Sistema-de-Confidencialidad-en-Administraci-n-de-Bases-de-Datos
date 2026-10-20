import { Link } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { cabecera, contenedorTabla, cuerpo, tabla, td, th } from "../components/estilos";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

export default function PlanMejora() {
  const { empresa, ejecucionId } = useEmpresa();
  const plan = useCarga(() => (ejecucionId ? api.planMejora(ejecucionId) : Promise.resolve(null)), [ejecucionId]);

  if (!ejecucionId) return <Aviso>No hay ejecuciones. Observe la base desde el Dashboard.</Aviso>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Plan de mejora (Actuar)</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pendientes de la ejecución #{ejecucionId}: lo que no cumple y lo que no se pudo evaluar, con su acción y su control preventivo.
        </p>
      </div>
      {plan.cargando && !plan.datos && <Cargando />}
      <Aviso tono="error">{plan.error}</Aviso>
      {plan.datos?.length === 0 && <Aviso tono="info">No hay pendientes: todos los observables cumplen.</Aviso>}
      {plan.datos?.length > 0 && (
        <div className={contenedorTabla}>
          <table className={tabla}>
            <thead className={cabecera}>
              <tr>
                {["Prioridad", "Observable", "Control", "Estado", "Detalle", "Acción", "Control preventivo"].map((titulo) => (
                  <th key={titulo} scope="col" className={th}>
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cuerpo}>
              {plan.datos.map((p) => (
                <tr key={p.obs_id}>
                  <td className={`${td} text-center font-semibold`}>{p.prioridad}</td>
                  <td className={td}>
                    <Link
                      to={`/empresas/${empresa.id}/hallazgos/${p.obs_id}?ejecucion=${ejecucionId}`}
                      className="font-mono underline underline-offset-2"
                    >
                      {p.obs_id}
                    </Link>
                    <span className="block text-xs">{p.nombre}</span>
                  </td>
                  <td className={td}>{p.control_iso}</td>
                  <td className={td}>
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className={`${td} text-xs`}>{p.detalle}</td>
                  <td className={`${td} max-w-sm text-xs`}>{p.accion}</td>
                  <td className={`${td} max-w-sm text-xs`}>{p.preventivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
