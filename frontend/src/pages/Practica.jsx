import { CircleCheck, Database, FlaskConical, MousePointerClick, Undo2 } from "lucide-react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { codigo, codigoEnLinea } from "../components/estilos";
import { BotonCopiar, Desplegable, Encabezado, Vacio } from "../components/ui";
import { useCarga } from "../hooks/useCarga";

// El nivel de un escenario se marca con barras, no con colores de estado.
const NIVELES = { básico: 1, intermedio: 2, avanzado: 3 };

function Nivel({ nivel }) {
  const n = NIVELES[nivel] ?? 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-texto-2">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-1 rounded-sm ${i <= n ? "bg-acento" : "bg-linea-fuerte"}`} style={{ height: `${4 + i * 3}px` }} />
        ))}
      </span>
      {nivel}
    </span>
  );
}

const ICONOS = { sql: Database, esperado: CircleCheck, instrumento: MousePointerClick };

function Paso({ paso, numero }) {
  const Icono = ICONOS[paso.tipo] ?? MousePointerClick;
  const esperado = paso.tipo === "esperado";
  return (
    <li className="relative grid grid-cols-[1.75rem_1fr] gap-x-3 pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className={`z-[1] grid size-7 place-items-center rounded-full ${esperado ? "bg-cumple-suave text-cumple" : "bg-superficie-2 text-texto-2 shadow-[inset_0_0_0_1px_var(--linea)]"}`}
      >
        <Icono className="size-3.5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 pt-0.5">
        {paso.tipo === "sql" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Ejecuta este SQL <span className="font-normal text-texto-3">conectado como {paso.conexion}</span>
              </p>
              <BotonCopiar texto={paso.codigo} />
            </div>
            <pre className={codigo}>{paso.codigo}</pre>
          </div>
        )}
        {esperado && (
          <p className="rounded-lg bg-cumple-suave px-3 py-2 text-sm text-texto">
            <span className="font-semibold text-cumple">Resultado esperado {numero}.</span> {paso.texto}
          </p>
        )}
        {paso.tipo !== "sql" && !esperado && (
          <p className="text-sm text-texto">
            <span className="font-semibold">En el instrumento:</span> {paso.texto}
          </p>
        )}
      </div>
    </li>
  );
}

function Escenario({ escenario }) {
  return (
    <Desplegable
      resumen={
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <span className="font-mono text-sm font-semibold">{escenario.id}</span>
          <span className="min-w-0 flex-1 font-medium">{escenario.titulo}</span>
          <span className="flex flex-wrap items-center gap-3">
            <Nivel nivel={escenario.nivel} />
            <span className="font-mono text-xs text-texto-3">{escenario.observables.join(", ")}</span>
          </span>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-texto-2">
          <span className="font-semibold text-texto">Objetivo:</span> {escenario.objetivo}
        </p>
        <ol className="relative before:absolute before:top-2 before:bottom-2 before:left-[0.875rem] before:w-px before:bg-linea">
          {escenario.pasos.map((paso, i) => (
            <Paso key={i} paso={paso} numero={escenario.pasos.slice(0, i + 1).filter((p) => p.tipo === "esperado").length} />
          ))}
        </ol>
        {escenario.deshacer && (
          <div className="space-y-2 border-t border-linea pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Undo2 aria-hidden="true" className="size-4 text-texto-3" />
                Deshacer
              </p>
              <BotonCopiar texto={escenario.deshacer} />
            </div>
            <pre className={codigo}>{escenario.deshacer}</pre>
          </div>
        )}
      </div>
    </Desplegable>
  );
}

export default function Practica() {
  const guias = useCarga(api.laboratorios, []);

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Práctica"
        ayuda="practica"
        descripcion="Escenarios guiados para ver el ciclo completo con la empresa de demostración: provocas un hallazgo, lo observas, lo corriges y confirmas que se cerró."
      />
      {guias.cargando && !guias.datos && <Cargando />}
      <Aviso tono="error" titulo="No se pudo contactar con el backend">
        {guias.error}
      </Aviso>
      {guias.datos?.length === 0 && (
        <Vacio icono={FlaskConical} titulo="No hay guías de práctica instaladas">
          Cada empresa de demostración puede traer la suya en laboratorio/&lt;empresa&gt;/guia_practica.json.
        </Vacio>
      )}
      {guias.datos?.map((guia) => (
        <section key={guia.empresa} aria-labelledby={`guia-${guia.empresa}`} className="space-y-5">
          <div>
            <h2 id={`guia-${guia.empresa}`} className="text-xl font-semibold">
              {guia.titulo}
            </h2>
            <p className="mt-1 max-w-[75ch] text-texto-2">{guia.descripcion}</p>
          </div>
          <div className="rounded-xl bg-superficie shadow-tarjeta">
            <h3 className="border-b border-linea px-5 py-3 font-semibold">Antes de empezar</h3>
            <div className="space-y-3 px-5 py-4">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-texto-2 marker:font-semibold marker:text-texto-3">
                {guia.preparacion.map((texto) => (
                  <li key={texto} className="pl-1">
                    {texto}
                  </li>
                ))}
              </ol>
              <p className="text-sm">
                <span className="font-semibold">Conexión SQL de los escenarios:</span> <code className={codigoEnLinea}>{guia.conexion_sql}</code>
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {guia.escenarios.map((escenario) => (
              <Escenario key={escenario.id} escenario={escenario} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
