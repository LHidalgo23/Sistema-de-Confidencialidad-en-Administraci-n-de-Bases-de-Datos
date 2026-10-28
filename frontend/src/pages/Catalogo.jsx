import { ChevronRight, FlaskConical, Grid3x3, ListChecks, Search, SlidersHorizontal, TriangleAlert, Users } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { cabecera, campo, codigo, codigoEnLinea, contenedorTabla, cuerpo, tabla, td, th } from "../components/estilos";
import { BotonCopiar, Desplegable, Encabezado } from "../components/ui";
import { useCarga } from "../hooks/useCarga";

const PESTANAS = [
  { id: "matriz", etiqueta: "Matriz-instrumento", icono: ListChecks },
  { id: "mapeo", etiqueta: "Mapeo de controles", icono: Grid3x3 },
  { id: "bateria", etiqueta: "Batería de pruebas", icono: FlaskConical },
  { id: "riesgos", etiqueta: "Riesgos R-CONF", icono: TriangleAlert },
  { id: "tareas", etiqueta: "Tareas del DBA", icono: Users },
  { id: "perfil", etiqueta: "Perfil por defecto", icono: SlidersHorizontal },
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

function Nota({ children }) {
  return <p className="max-w-[80ch] text-sm text-texto-2">{children}</p>;
}

function Etiqueta({ children, mono = false }) {
  return (
    <span className={`rounded bg-superficie-2 px-1.5 py-0.5 text-xs text-texto-2 shadow-[inset_0_0_0_1px_var(--linea)] ${mono ? "font-mono" : ""}`}>
      {children}
    </span>
  );
}

const RE_PENDIENTE = /<[A-Z0-9_]+>/g;

function placeholdersManuales(texto) {
  return [...new Set(texto.match(RE_PENDIENTE) ?? [])];
}

function AdvertenciaManual({ texto }) {
  const pendientes = placeholdersManuales(texto);
  if (pendientes.length === 0) return null;
  return (
    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-nocumple-suave px-3 py-2 text-xs text-nocumple">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Completar a mano antes de ejecutar: <span className="font-mono">{pendientes.join(", ")}</span>. El instrumento no puede generar este
        valor (es un secreto o depende del negocio).
      </span>
    </p>
  );
}

function BloqueCodigo({ titulo, texto }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{titulo}</p>
        <BotonCopiar texto={texto} />
      </div>
      <pre className={codigo}>{texto}</pre>
    </div>
  );
}

function MatrizInstrumento({ entradas }) {
  const [busqueda, setBusqueda] = useState("");
  const termino = busqueda.trim().toLowerCase();
  const visibles = entradas.filter(
    (e) => !termino || [e.id, e.control_iso, e.nombre, e.riesgo, e.tarea].some((v) => String(v).toLowerCase().includes(termino)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Nota>
          Cada entrada es un control evaluable. Agregar un control es agregar una entrada al catálogo y su archivo{" "}
          <code className={codigoEnLinea}>.sql</code>, sin tocar el código del sistema.
        </Nota>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar en el catálogo</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-3" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="OBS-09, A8.2, R-CONF-01…"
            className={`${campo} pl-9`}
          />
        </label>
      </div>
      <p className="text-sm text-texto-3 tabular" aria-live="polite">
        {visibles.length} de {entradas.length} observables
      </p>
      <div className="space-y-2">
        {visibles.map((e) => (
          <Desplegable
            key={e.id}
            resumen={
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="font-mono text-sm font-semibold">{e.id}</span>
                <span className="font-mono text-[0.8125rem] text-texto-2">{e.control_iso}</span>
                <span className="min-w-0 basis-full font-medium sm:basis-auto sm:flex-1">{e.nombre}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Etiqueta mono>{e.riesgo}</Etiqueta>
                  <Etiqueta mono>{e.tarea}</Etiqueta>
                  <Etiqueta>{e.alcance}</Etiqueta>
                  <Etiqueta>Severidad {String(e.severidad).toLowerCase()}</Etiqueta>
                </span>
              </div>
            }
          >
            <div className="space-y-5 text-sm">
              {e.descripcion && (
                <div>
                  <p className="text-sm font-semibold">Descripción</p>
                  <p className="mt-1.5 text-texto">{e.descripcion}</p>
                  {e.fuentes?.length > 0 && (
                    <details className="group mt-2">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-texto-3 hover:text-texto">
                        <ChevronRight aria-hidden="true" className="size-3.5 transition-transform duration-150 group-open:rotate-90" />
                        Fuentes ({e.fuentes.length})
                      </summary>
                      <ul className="mt-1.5 ml-[1.125rem] space-y-1">
                        {e.fuentes.map((f) => (
                          <li key={f.url} className="text-xs">
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-acento hover:underline">
                              {f.titulo}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <dl className="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <dt className="text-xs text-texto-3">Versión mínima</dt>
                  <dd className="font-medium">Oracle {e.version_min}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-3">Regla</dt>
                  <dd className="font-medium">Cada fila devuelta es un hallazgo</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-3">Requiere</dt>
                  <dd className="font-mono text-[0.8125rem]">{e.requiere.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-3">Variables</dt>
                  <dd className="font-mono text-[0.8125rem]">{e.binds?.length > 0 ? e.binds.map((b) => `:${b}`).join(", ") : "ninguna"}</dd>
                </div>
              </dl>
              <div>
                <BloqueCodigo titulo="Observable (control detectivo)" texto={e.sql} />
                {e.notas_implementacion && <p className="mt-2 text-texto-2">{e.notas_implementacion}</p>}
              </div>
              {e.correctivo.pasos?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Pasos previos o condicionales</p>
                  <ol className="space-y-2">
                    {e.correctivo.pasos.map((paso, i) => (
                      <li key={i} className="rounded-lg bg-superficie-2 px-4 py-3 shadow-[inset_0_0_0_1px_var(--linea)]">
                        <p className="text-xs font-medium text-texto-2">{paso.condicion ? `Si ${paso.condicion}:` : `Paso ${i + 1}`}</p>
                        <pre className={`${codigo} mt-1.5`}>{paso.sql}</pre>
                        <AdvertenciaManual texto={paso.sql} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div>
                <BloqueCodigo
                  titulo="Plantilla del correctivo"
                  texto={
                    e.correctivo.plantilla ??
                    Object.entries(e.correctivo.plantillas)
                      .map(([tipo, plantilla]) => `[${tipo}]\n${plantilla}`)
                      .join("\n\n")
                  }
                />
                <AdvertenciaManual
                  texto={
                    e.correctivo.plantilla ??
                    Object.values(e.correctivo.plantillas ?? {}).join("\n")
                  }
                />
                {e.correctivo.nota && <p className="mt-2 text-texto-2">{e.correctivo.nota}</p>}
              </div>
              <div className="rounded-lg bg-cumple-suave px-4 py-3">
                <p className="text-xs font-semibold text-cumple">Control preventivo</p>
                <p className="mt-0.5 text-texto">{e.preventivo}</p>
              </div>
              {e.limitaciones && (
                <p className="text-texto-2">
                  <span className="font-semibold text-texto">Limitaciones:</span> {e.limitaciones}
                </p>
              )}
            </div>
          </Desplegable>
        ))}
      </div>
    </div>
  );
}

const NIVELES = {
  Bajo: "bg-cumple-suave text-cumple",
  Medio: "bg-parcial-suave text-parcial",
  Alto: "bg-nocumple-suave text-nocumple",
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
    <figure className="rounded-xl bg-superficie p-5 shadow-tarjeta">
      <div role="img" aria-label="Mapa de calor de riesgos: probabilidad por impacto" className="overflow-x-auto">
        <div className="inline-grid grid-cols-[1.5rem_auto_repeat(5,minmax(3.5rem,4.5rem))] gap-1 text-xs">
          <div className="row-span-5 flex items-center justify-center">
            <span className="-rotate-90 font-medium whitespace-nowrap text-texto-3">Probabilidad</span>
          </div>
          {probabilidades.map((p) => (
            <div key={p} className="contents">
              <div className="flex items-center justify-end pr-1.5 font-medium text-texto-3 tabular">{p}</div>
              {impactos.map((i) => {
                const aqui = riesgos.filter((r) => r.probabilidad === p && r.impacto === i);
                return (
                  <div
                    key={i}
                    className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-md ${NIVELES[clasificarNivel(p * i)]}`}
                    title={`Probabilidad ${p} × impacto ${i} = ${p * i}`}
                  >
                    {aqui.map((r) => (
                      <span key={r.id} className="rounded bg-superficie px-1 font-mono text-[0.6875rem] font-bold text-texto shadow-tarjeta">
                        {r.id.replace("R-CONF-", "R")}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
          <div />
          <div />
          {impactos.map((i) => (
            <div key={i} className="pt-1 text-center font-medium text-texto-3 tabular">
              {i}
            </div>
          ))}
          <div />
          <div />
          <div className="col-span-5 text-center font-medium text-texto-3">Impacto</div>
        </div>
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-2">
        {Object.entries(NIVELES).map(([nivel, clase]) => (
          <span key={nivel} className="inline-flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${clase}`} />
            {nivel} ({nivel === "Bajo" ? "1-6" : nivel === "Medio" ? "8-12" : "15-25"})
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function Riesgos({ riesgos }) {
  return (
    <div className="space-y-5">
      <Nota>Nivel = probabilidad (1-5) × impacto (1-5). De 1 a 6 es Bajo, de 8 a 12 es Medio y de 15 a 25 es Alto.</Nota>
      <MapaDeCalor riesgos={riesgos} />
      <div className="space-y-2">
        {riesgos.map((r) => {
          const clasificacion = r.nivel ? clasificarNivel(r.nivel) : null;
          return (
            <Desplegable
              key={r.id}
              resumen={
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-semibold">{r.id}</span>
                  <span className="min-w-0 flex-1 font-medium">{r.resumen}</span>
                  {clasificacion && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular ${NIVELES[clasificacion]}`}>
                      {clasificacion}: {r.probabilidad} × {r.impacto} = {r.nivel}
                    </span>
                  )}
                </div>
              }
            >
              <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-2">
                {[
                  ["Descripción", r.descripcion],
                  ["Causa", r.causa],
                  ["Consecuencia", r.consecuencia],
                  ["Justificación de la escala", r.justificacion],
                  ["Relación con la Ley 8968", r.base_legal],
                ].map(([titulo, texto]) => (
                  <div key={titulo}>
                    <dt className="font-semibold">{titulo}</dt>
                    <dd className="mt-0.5 text-texto-2">{texto ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </Desplegable>
          );
        })}
      </div>
    </div>
  );
}

export default function Catalogo() {
  const [parametros, setParametros] = useSearchParams();
  const pestana = PESTANAS.some((p) => p.id === parametros.get("vista")) ? parametros.get("vista") : "matriz";
  const catalogo = useCarga(api.catalogo, []);
  const riesgos = useCarga(api.riesgos, []);
  const tareas = useCarga(api.tareas, []);
  const mapeo = useCarga(api.mapeo, []);
  const bateria = useCarga(api.bateria, []);
  const perfil = useCarga(api.perfilDefault, []);

  const error = catalogo.error || mapeo.error || bateria.error || riesgos.error || tareas.error || perfil.error;
  const cuentas = {
    matriz: catalogo.datos?.length,
    mapeo: mapeo.datos?.length,
    bateria: bateria.datos?.length,
    riesgos: riesgos.datos?.length,
    tareas: tareas.datos?.length,
  };
  const actual = PESTANAS.find((p) => p.id === pestana);

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Catálogo del instrumento"
        ayuda={`catalogo-${pestana}`}
        descripcion="La parte genérica del instrumento: no conoce a ninguna empresa y se aplica igual a cualquier base Oracle que se registre."
      />
      <Aviso tono="error" titulo="No se pudo contactar con el backend">
        {error}
      </Aviso>

      <div role="tablist" aria-label="Secciones del catálogo" className="-mx-1 flex gap-1 overflow-x-auto border-b border-linea px-1">
        {PESTANAS.map(({ id, etiqueta, icono: Icono }) => {
          const activa = pestana === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`pestana-${id}`}
              aria-selected={activa}
              aria-controls="panel-catalogo"
              onClick={() => setParametros({ vista: id }, { replace: true })}
              className={`-mb-px inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                activa ? "border-acento text-texto" : "border-transparent text-texto-3 hover:border-linea-fuerte hover:text-texto"
              }`}
            >
              <Icono aria-hidden="true" className="size-4" />
              {etiqueta}
              {cuentas[id] !== undefined && <span className="text-xs text-texto-3 tabular">{cuentas[id]}</span>}
            </button>
          );
        })}
      </div>

      <div id="panel-catalogo" role="tabpanel" aria-labelledby={`pestana-${actual.id}`} className="space-y-4">
        {pestana === "matriz" && (catalogo.datos ? <MatrizInstrumento entradas={catalogo.datos} /> : <Cargando />)}

        {pestana === "riesgos" && (riesgos.datos ? <Riesgos riesgos={riesgos.datos} /> : <Cargando />)}

        {pestana === "tareas" &&
          (tareas.datos ? (
            <>
              <Nota>Las tareas críticas del DBA que ejecutan los controles, con su frecuencia y los riesgos que cubren.</Nota>
              <Tabla
                columnas={["ID", "Tarea", "Descripción", "Frecuencia", "Riesgos"]}
                filas={tareas.datos.map((t) => (
                  <tr key={t.id}>
                    <td className={`${td} font-mono font-semibold`}>{t.id}</td>
                    <td className={`${td} font-semibold whitespace-nowrap`}>{t.nombre}</td>
                    <td className={`${td} min-w-72 text-[0.8125rem] text-texto-2`}>{t.descripcion ?? "—"}</td>
                    <td className={`${td} min-w-32 text-[0.8125rem] text-texto-2`}>{t.frecuencia ?? "—"}</td>
                    <td className={`${td} font-mono text-xs whitespace-nowrap text-texto-2`}>{t.riesgos_asociados.join(", ")}</td>
                  </tr>
                ))}
              />
            </>
          ) : (
            <Cargando />
          ))}

        {pestana === "mapeo" &&
          (mapeo.datos ? (
            <>
              <Nota>
                Para cada control: qué riesgo mitiga, qué tarea del DBA lo ejecuta, por qué su mecanismo funciona en Oracle, cómo se implementa y con
                qué se comprueba.
              </Nota>
              <Tabla
                columnas={["Control", "Riesgos", "Tareas", "Justificación del mecanismo", "Implementación en Oracle", "Evidencia observable", "Observables"]}
                filas={mapeo.datos.map((m) => (
                  <tr key={m.control_id}>
                    <th scope="row" className={`${td} min-w-44 text-left font-semibold`}>
                      <span className="font-mono">{m.control_id}</span> {m.nombre}
                      {!m.nucleo && <span className="mt-1 block text-xs font-normal text-texto-3">Extra justificado</span>}
                    </th>
                    <td className={`${td} font-mono text-xs whitespace-nowrap text-texto-2`}>{m.riesgos.join(", ")}</td>
                    <td className={`${td} min-w-36 text-xs text-texto-2`}>{m.tareas.join("; ")}</td>
                    <td className={`${td} min-w-80 text-[0.8125rem]`}>{m.justificacion}</td>
                    <td className={`${td} min-w-60 text-[0.8125rem] text-texto-2`}>{m.implementacion}</td>
                    <td className={`${td} min-w-48 font-mono text-xs`}>{m.evidencia}</td>
                    <td className={`${td} font-mono text-xs text-texto-2`}>{m.observables.join(", ")}</td>
                  </tr>
                ))}
              />
            </>
          ) : (
            <Cargando />
          ))}

        {pestana === "bateria" &&
          (bateria.datos ? (
            <>
              <Nota>
                Cada observable es una prueba de solo lectura. Las pruebas negativas que dependen de los usuarios de una empresa (por ejemplo, que
                recepción no pueda leer expedientes) son opcionales y viven en el laboratorio de esa empresa.
              </Nota>
              <Tabla
                columnas={["ID", "Control", "Tipo", "Procedimiento", "Resultado esperado", "Herramienta"]}
                filas={bateria.datos.map((b) => (
                  <tr key={b.id}>
                    <td className={`${td} font-mono font-semibold`}>{b.id}</td>
                    <td className={`${td} font-mono text-[0.8125rem]`}>{b.control_iso}</td>
                    <td className={`${td} text-xs whitespace-nowrap text-texto-2`}>{b.tipo}</td>
                    <td className={`${td} min-w-72 text-[0.8125rem]`}>{b.procedimiento}</td>
                    <td className={`${td} min-w-64 text-[0.8125rem]`}>{b.resultado_esperado}</td>
                    <td className={`${td} min-w-48 text-xs text-texto-2`}>{b.herramienta}</td>
                  </tr>
                ))}
              />
            </>
          ) : (
            <Cargando />
          ))}

        {pestana === "perfil" &&
          (perfil.datos ? (
            <>
              <Nota>{perfil.datos.descripcion}</Nota>
              <BloqueCodigo
                titulo="Parámetros y patrones sensibles"
                texto={JSON.stringify({ parametros: perfil.datos.parametros, patrones_sensibles: perfil.datos.patrones_sensibles }, null, 2)}
              />
            </>
          ) : (
            <Cargando />
          ))}
      </div>
    </div>
  );
}
