import { useState } from "react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { cabecera, codigo, contenedorTabla, cuerpo, tabla, td, tarjeta, th } from "../components/estilos";
import { useCarga } from "../hooks/useCarga";

const PESTANAS = [
  { id: "matriz", etiqueta: "Matriz-instrumento" },
  { id: "riesgos", etiqueta: "Riesgos R-CONF" },
  { id: "tareas", etiqueta: "Tareas del DBA" },
  { id: "controles", etiqueta: "Controles ISO" },
  { id: "perfil", etiqueta: "Perfil por defecto" },
];

function Tabla({ columnas, filas }) {
  return (
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
        <tbody className={cuerpo}>{filas}</tbody>
      </table>
    </div>
  );
}

function MatrizInstrumento({ entradas }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cada fila es un control evaluable. Agregar un control es agregar una entrada al catálogo y su archivo <code>.sql</code>, sin
        tocar el código del sistema.
      </p>
      {entradas.map((e) => (
        <details key={e.id} className={tarjeta}>
          <summary className="cursor-pointer text-sm font-medium">
            <span className="font-mono">{e.id}</span> · {e.control_iso} · {e.nombre}{" "}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({e.riesgo} · {e.tarea} · {e.alcance} · severidad {e.severidad})
            </span>
          </summary>
          <div className="mt-3 space-y-3 text-sm">
            <p>
              <span className="font-medium">Versión mínima:</span> Oracle {e.version_min} · <span className="font-medium">Regla:</span> cada
              fila devuelta es un hallazgo · <span className="font-medium">Requiere:</span> {e.requiere.join(", ")}
            </p>
            <div>
              <p className="mb-1 font-medium">Control observable (detectivo)</p>
              <pre className={codigo}>{e.sql}</pre>
            </div>
            <div>
              <p className="mb-1 font-medium">Control correctivo (plantilla)</p>
              <pre className={codigo}>
                {e.correctivo.plantilla ?? Object.entries(e.correctivo.plantillas).map(([tipo, plantilla]) => `[${tipo}]\n${plantilla}`).join("\n\n")}
              </pre>
              {e.correctivo.nota && <p className="mt-1 text-slate-600 dark:text-slate-300">{e.correctivo.nota}</p>}
            </div>
            <p>
              <span className="font-medium">Control preventivo:</span> {e.preventivo}
            </p>
            {e.limitaciones && (
              <p className="text-slate-500 dark:text-slate-400">
                <span className="font-medium">Limitaciones:</span> {e.limitaciones}
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

const NIVELES = {
  Bajo: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  Medio: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  Alto: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
};

// Escala del plan: probabilidad 1-5 × impacto 1-5. 1-6 Bajo, 8-12 Medio, 15-25 Alto.
function clasificarNivel(nivel) {
  if (nivel <= 6) return "Bajo";
  if (nivel <= 12) return "Medio";
  return "Alto";
}

function MapaDeCalor({ riesgos }) {
  const probabilidades = [5, 4, 3, 2, 1];
  const impactos = [1, 2, 3, 4, 5];
  return (
    <div role="img" aria-label="Mapa de calor de riesgos: probabilidad por impacto" className="inline-block">
      <div className="grid grid-cols-[auto_repeat(5,4.5rem)] gap-1 text-xs">
        {probabilidades.map((p) => (
          <div key={p} className="contents">
            <div className="flex items-center justify-end pr-2 text-slate-500 dark:text-slate-400">P {p}</div>
            {impactos.map((i) => {
              const aqui = riesgos.filter((r) => r.probabilidad === p && r.impacto === i);
              return (
                <div
                  key={i}
                  className={`flex h-14 flex-col items-center justify-center rounded ${NIVELES[clasificarNivel(p * i)]}`}
                  title={`Probabilidad ${p} × impacto ${i} = ${p * i}`}
                >
                  {aqui.map((r) => (
                    <span key={r.id} className="font-mono font-semibold">
                      {r.id.replace("R-CONF-", "R")}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
        <div />
        {impactos.map((i) => (
          <div key={i} className="text-center text-slate-500 dark:text-slate-400">
            I {i}
          </div>
        ))}
      </div>
    </div>
  );
}

function Riesgos({ riesgos }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Escala: probabilidad 1-5 × impacto 1-5. Nivel: 1-6 Bajo · 8-12 Medio · 15-25 Alto.
      </p>
      <MapaDeCalor riesgos={riesgos} />
      {riesgos.map((r) => {
        const clasificacion = r.nivel ? clasificarNivel(r.nivel) : null;
        return (
          <details key={r.id} className={tarjeta}>
            <summary className="cursor-pointer text-sm font-medium">
              <span className="font-mono">{r.id}</span> · {r.resumen}{" "}
              {clasificacion && (
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${NIVELES[clasificacion]}`}>
                  {clasificacion} ({r.probabilidad} × {r.impacto} = {r.nivel})
                </span>
              )}
            </summary>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Descripción", r.descripcion],
                ["Causa", r.causa],
                ["Consecuencia", r.consecuencia],
                ["Justificación de la escala", r.justificacion],
                ["Relación con la Ley 8968", r.base_legal],
              ].map(([titulo, texto]) => (
                <div key={titulo}>
                  <dt className="font-medium">{titulo}</dt>
                  <dd className="text-slate-600 dark:text-slate-300">{texto ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </details>
        );
      })}
    </div>
  );
}

export default function Catalogo() {
  const [pestana, setPestana] = useState("matriz");
  const catalogo = useCarga(api.catalogo, []);
  const riesgos = useCarga(api.riesgos, []);
  const tareas = useCarga(api.tareas, []);
  const controles = useCarga(api.controlesIso, []);
  const perfil = useCarga(api.perfilDefault, []);

  const error = catalogo.error || riesgos.error || tareas.error || controles.error || perfil.error;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Catálogo del instrumento</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          La matriz genérica: no conoce a ninguna empresa. Se aplica igual a cualquier base Oracle que se registre.
        </p>
      </div>
      <Aviso tono="error">{error && `No se pudo contactar con el backend: ${error}`}</Aviso>

      <div role="tablist" aria-label="Secciones del catálogo" className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-800">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              pestana === p.id ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === "matriz" && (catalogo.datos ? <MatrizInstrumento entradas={catalogo.datos} /> : <Cargando />)}

      {pestana === "riesgos" && riesgos.datos && <Riesgos riesgos={riesgos.datos} />}

      {pestana === "tareas" && tareas.datos && (
        <Tabla
          columnas={["ID", "Tarea", "Descripción", "Frecuencia", "Riesgos asociados"]}
          filas={tareas.datos.map((t) => (
            <tr key={t.id}>
              <td className={`${td} font-mono`}>{t.id}</td>
              <td className={`${td} font-medium`}>{t.nombre}</td>
              <td className={`${td} max-w-md text-xs`}>{t.descripcion ?? "—"}</td>
              <td className={`${td} text-xs`}>{t.frecuencia ?? "—"}</td>
              <td className={`${td} font-mono text-xs`}>{t.riesgos_asociados.join(", ")}</td>
            </tr>
          ))}
        />
      )}

      {pestana === "controles" && controles.datos && (
        <Tabla
          columnas={["Control", "Nombre", "Tema", "Tipo"]}
          filas={controles.datos.map((c) => (
            <tr key={c.id}>
              <td className={`${td} font-mono`}>{c.id}</td>
              <td className={td}>{c.nombre}</td>
              <td className={td}>{c.tema}</td>
              <td className={td}>{c.nucleo ? "Núcleo (asignación)" : "Extra justificado"}</td>
            </tr>
          ))}
        />
      )}

      {pestana === "perfil" && perfil.datos && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">{perfil.datos.descripcion}</p>
          <pre className={codigo}>{JSON.stringify({ parametros: perfil.datos.parametros, patrones_sensibles: perfil.datos.patrones_sensibles }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
