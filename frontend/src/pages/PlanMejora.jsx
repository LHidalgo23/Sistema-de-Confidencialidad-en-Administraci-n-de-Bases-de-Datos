import { CircleCheck, ListTodo } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { enlace } from "../components/estilos";
import { Encabezado, Vacio } from "../components/ui";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

const PRIORIDADES = {
  1: { etiqueta: "Prioridad 1", detalle: "Severidad alta: atender primero" },
  2: { etiqueta: "Prioridad 2", detalle: "Severidad media, o visibilidad del auditor por habilitar" },
  3: { etiqueta: "Prioridad 3", detalle: "Severidad baja" },
};

function Pendiente({ p, empresaId, ejecucionId }) {
  return (
    <li className="grid gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-[14rem_1fr_1fr]">
      <div>
        <Link to={`/empresas/${empresaId}/hallazgos/${p.obs_id}?ejecucion=${ejecucionId}`} className={`${enlace} font-mono`}>
          {p.obs_id}
        </Link>
        <span className="ml-2 font-mono text-xs text-texto-3">{p.control_iso}</span>
        <p className="mt-1 text-sm leading-snug font-medium text-texto">{p.nombre}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EstadoBadge estado={p.estado} />
          <span className="text-xs text-texto-3">{p.detalle}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-texto-3">Acción</p>
        <p className="mt-1 text-sm text-texto-2">{p.accion}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-texto-3">Control preventivo</p>
        <p className="mt-1 text-sm text-texto-2">{p.preventivo}</p>
      </div>
    </li>
  );
}

export default function PlanMejora() {
  const { empresa, ejecucionId } = useEmpresa();
  const plan = useCarga(() => (ejecucionId ? api.planMejora(ejecucionId) : Promise.resolve(null)), [ejecucionId]);

  const encabezado = (
    <Encabezado
      titulo="Plan de mejora"
      ayuda="planMejora"
      descripcion={`Lo que no cumple y lo que no se pudo evaluar${ejecucionId ? ` en la ejecución #${ejecucionId}` : ""}, con su acción y su control preventivo. Es la fase Actuar del ciclo PHVA.`}
    />
  );

  if (!ejecucionId)
    return (
      <div className="space-y-8">
        {encabezado}
        <Vacio icono={ListTodo} titulo="Aún no hay un plan">
          El plan se arma con los pendientes de una ejecución. Observa la base desde el Dashboard.
        </Vacio>
      </div>
    );

  const grupos = [1, 2, 3]
    .map((nivel) => ({ nivel, items: (plan.datos ?? []).filter((p) => p.prioridad === nivel) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-7">
      {encabezado}
      {plan.cargando && !plan.datos && <Cargando />}
      <Aviso tono="error">{plan.error}</Aviso>
      {plan.datos?.length === 0 && (
        <Vacio icono={CircleCheck} titulo="No hay pendientes">
          Todos los observables de esta ejecución cumplen. Mantén los controles preventivos y vuelve a observar en la próxima revisión.
        </Vacio>
      )}
      {grupos.map(({ nivel, items }) => {
        const config = PRIORIDADES[nivel];
        return (
          <section key={nivel} aria-labelledby={`prioridad-${nivel}`} className="overflow-hidden rounded-xl bg-superficie shadow-tarjeta">
            <div className="flex flex-wrap items-center gap-3 border-b border-linea bg-superficie-2 px-5 py-3">
              <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-barra text-sm font-bold text-barra-texto">
                {nivel}
              </span>
              <h2 id={`prioridad-${nivel}`} className="font-semibold">
                {config.etiqueta}
              </h2>
              <span className="text-sm text-texto-3">{config.detalle}</span>
              <span className="ml-auto text-sm text-texto-3 tabular">
                {items.length} {items.length === 1 ? "pendiente" : "pendientes"}
              </span>
            </div>
            <ul className="divide-y divide-linea">
              {items.map((p) => (
                <Pendiente key={p.obs_id} p={p} empresaId={empresa.id} ejecucionId={ejecucionId} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
