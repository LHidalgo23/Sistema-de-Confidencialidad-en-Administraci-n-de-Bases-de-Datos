import { Check, CircleCheck, Clock, Download, FileCode2, PenLine, RotateCcw, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { ayudaCampo, boton, botonSecundario, campo, codigo, etiquetaCampo } from "../components/estilos";
import { BotonCopiar, Desplegable, Encabezado, Seccion, Vacio } from "../components/ui";
import { useAccion, useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

// Separación de funciones: lo que hace el DBA con el script, en orden.
const PASOS_DBA = [
  ["Revisar", "Completar los campos marcados abajo y leer las notas de cada observable."],
  ["Probar", "Ejecutarlo primero en un ambiente que no sea producción."],
  ["Respaldar", "Tomar un respaldo antes de aplicarlo."],
  ["Aplicar", "Ejecutarlo bajo la gestión de cambios de la empresa."],
  ["Re-observar", "Volver a observar y comparar en la Matriz."],
];

const SEVERIDAD_CLASE = {
  alta: "bg-nocumple-suave text-nocumple",
  media: "bg-parcial-suave text-parcial",
  baja: "bg-cumple-suave text-cumple",
};

const insignia = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";
const botonMarcar =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-cumple px-3 py-1.5 text-sm font-semibold text-acento-texto transition-[scale,opacity] duration-150 hover:opacity-90 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55";
const botonPendiente =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-acento px-3 py-1.5 text-sm font-semibold text-acento-texto transition-[scale,opacity] duration-150 hover:opacity-90 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55";
const botonDeshacer =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-parcial-suave px-3 py-1.5 text-sm font-semibold text-parcial transition-[scale,background-color] duration-150 hover:bg-parcial/20 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55";

function etiquetaCampoDe(token) {
  return token.toUpperCase().replaceAll("_", " ");
}

function dedupeCampos(lista) {
  const vistos = new Map();
  for (const c of lista) if (!vistos.has(c.token)) vistos.set(c.token, c);
  return [...vistos.values()];
}

/** Separa el detalle del backend en tres grupos por la marca del DBA (no por si los
 * campos están llenos): activos entran al script, pendientes y aplicados no. Solo los
 * activos se usan para calcular cuántos campos faltan por completar (totalFaltantes),
 * porque son los únicos que de verdad van a salir en el script. */
function useResumen(observables, globales, porHallazgo) {
  return useMemo(() => {
    if (!observables) return null;

    const activos = observables.filter((o) => !o.resuelto && !o.pendiente_marcado);
    const pendientes = observables.filter((o) => o.pendiente_marcado);
    const aplicados = observables.filter((o) => o.resuelto);

    const globalesGuia = new Map();
    let faltantesPorHallazgo = 0;

    const activosConCampos = activos.map((obs) => {
      let completo = true;
      const items = obs.items.map((item) => {
        if (item.error) {
          completo = false;
          return { ...item, campos: [] };
        }
        const campos = dedupeCampos([...item.pendientes, ...item.pasos.flatMap((p) => p.pendientes)]).map((c) => {
          if (c.alcance === "global") {
            const lleno = Boolean(globales[c.token]?.trim());
            globalesGuia.set(c.token, c.guia);
            if (!lleno) completo = false;
            return { ...c, lleno };
          }
          const lleno = Boolean(porHallazgo[obs.obs_id]?.[item.clave]?.[c.token]?.trim());
          if (!lleno) {
            completo = false;
            faltantesPorHallazgo += 1;
          }
          return { ...c, lleno };
        });
        return { ...item, campos };
      });
      return { ...obs, items, completo };
    });

    const faltantesGlobales = [...globalesGuia.keys()].filter((token) => !globales[token]?.trim()).length;
    return {
      total: observables.length,
      activos: activosConCampos,
      pendientes,
      aplicados,
      globalesGuia,
      totalFaltantes: faltantesGlobales + faltantesPorHallazgo,
    };
  }, [observables, globales, porHallazgo]);
}

function CampoManual({ etiqueta, guia, valor, onChange }) {
  return (
    <label className="block text-sm">
      <span className={etiquetaCampo}>{etiqueta}</span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe el valor…"
        spellCheck={false}
        className={`${campo} font-mono`}
      />
      {guia && <span className={ayudaCampo}>{guia}</span>}
    </label>
  );
}

function BloqueScript({ titulo, texto }) {
  return (
    <div>
      {titulo && <p className="mb-1 text-xs font-medium text-texto-2">{titulo}</p>}
      <pre className={codigo}>{texto}</pre>
    </div>
  );
}

/** Botones de marcado: cambian según si el observable está activo, pospuesto o aplicado. */
function AccionesCorrectivo({ obsId, resuelto, pendienteMarcado, marcadoEn, marcadoNota, onMarcar, onDesmarcar, ocupado }) {
  const [nota, setNota] = useState("");

  if (resuelto) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-4">
        <p className="text-xs text-texto-3">
          <span className="font-medium text-texto-2">Aplicado</span> el {new Date(marcadoEn).toLocaleString()}
          {marcadoNota && <> — {marcadoNota}</>}
        </p>
        <button type="button" onClick={() => onDesmarcar(obsId)} disabled={ocupado} className={botonDeshacer}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Deshacer
        </button>
      </div>
    );
  }

  if (pendienteMarcado) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-4">
        <p className="text-xs text-texto-3">
          <span className="font-medium text-acento">Pospuesto</span> el {new Date(marcadoEn).toLocaleString()}
          {marcadoNota && <> — {marcadoNota}</>}. No está en el script.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onDesmarcar(obsId)} disabled={ocupado} className={botonDeshacer}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Reactivar
          </button>
          <button type="button" onClick={() => onMarcar(obsId, "resuelto", marcadoNota ?? "")} disabled={ocupado} className={botonMarcar}>
            <CircleCheck aria-hidden="true" className="size-4" />
            Marcar como aplicada
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-linea pt-4">
      <label className="min-w-48 flex-1 text-sm">
        <span className={etiquetaCampo}>¿Lo dejas pendiente para después, o ya lo resolviste por tu cuenta?</span>
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota opcional (quién, cómo)" className={campo} />
      </label>
      <button type="button" onClick={() => onMarcar(obsId, "pendiente", nota)} disabled={ocupado} className={botonPendiente}>
        <Clock aria-hidden="true" className="size-4" />
        Marcar como pendiente
      </button>
      <button type="button" onClick={() => onMarcar(obsId, "resuelto", nota)} disabled={ocupado} className={botonMarcar}>
        <CircleCheck aria-hidden="true" className="size-4" />
        Marcar como aplicada
      </button>
    </div>
  );
}

function TarjetaObservable({ obs, porHallazgo, actualizarCampoHallazgo, onMarcar, onDesmarcar, ocupado }) {
  const editable = !obs.resuelto && !obs.pendiente_marcado;
  return (
    <Desplegable
      abierto={editable && !obs.completo}
      resumen={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-sm font-semibold">{obs.obs_id}</span>
          <span className="min-w-0 basis-full font-medium sm:basis-auto sm:flex-1">{obs.nombre}</span>
          <span className={`${insignia} ${SEVERIDAD_CLASE[obs.severidad] ?? ""}`}>{obs.severidad}</span>
          {obs.requiere_manual ? (
            <span className={`${insignia} bg-parcial-suave text-parcial`}>
              <PenLine aria-hidden="true" className="size-3.5" /> Requiere intervención manual
            </span>
          ) : (
            <span className={`${insignia} bg-superficie-2 text-texto-3`}>
              <Zap aria-hidden="true" className="size-3.5" /> No requiere intervención manual
            </span>
          )}
          {obs.resuelto ? (
            <span className={`${insignia} bg-superficie-2 text-texto-2`}>
              <Check aria-hidden="true" className="size-3.5" /> Aplicada
            </span>
          ) : obs.pendiente_marcado ? (
            <span className={`${insignia} bg-acento-suave text-acento`}>
              <Clock aria-hidden="true" className="size-3.5" /> Pendiente
            </span>
          ) : (
            <span className={`${insignia} bg-cumple-suave text-cumple`}>
              <Check aria-hidden="true" className="size-3.5" /> Activa
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        {obs.nota && <p className="text-texto-2">{obs.nota}</p>}
        {obs.items.map((item, i) => (
          <div key={item.clave || i} className="space-y-3 border-t border-linea pt-4 first:border-0 first:pt-0">
            {item.contexto && <p className="font-mono text-xs font-medium text-texto-3">{item.contexto}</p>}
            {item.error ? (
              <Aviso tono="aviso" titulo="No se generó el correctivo">
                {item.error}
              </Aviso>
            ) : (
              <>
                {item.pasos.map((paso, j) => (
                  <BloqueScript key={j} titulo={paso.condicion ? `Si ${paso.condicion}:` : "Paso previo:"} texto={paso.script} />
                ))}
                <BloqueScript texto={item.script} />
                {editable &&
                  item.campos
                    .filter((c) => c.alcance === "por_hallazgo")
                    .map((c) => (
                      <CampoManual
                        key={c.token}
                        etiqueta={etiquetaCampoDe(c.token)}
                        guia={c.guia}
                        valor={porHallazgo[obs.obs_id]?.[item.clave]?.[c.token] ?? ""}
                        onChange={(v) => actualizarCampoHallazgo(obs.obs_id, item.clave, c.token, v)}
                      />
                    ))}
              </>
            )}
          </div>
        ))}
        <AccionesCorrectivo
          obsId={obs.obs_id}
          resuelto={obs.resuelto}
          pendienteMarcado={obs.pendiente_marcado}
          marcadoEn={obs.marcado_en}
          marcadoNota={obs.marcado_nota}
          onMarcar={onMarcar}
          onDesmarcar={onDesmarcar}
          ocupado={ocupado}
        />
      </div>
    </Desplegable>
  );
}

export default function Correctivos() {
  const { ejecucionId } = useEmpresa();
  const detalle = useCarga(() => (ejecucionId ? api.correctivosDetalle(ejecucionId) : Promise.resolve(null)), [ejecucionId]);
  const [globales, setGlobales] = useState({});
  const [porHallazgo, setPorHallazgo] = useState({});
  const generar = useAccion(api.generarCorrectivos);
  const marcar = useAccion(api.marcarCorrectivo);
  const desmarcar = useAccion(api.quitarMarcaCorrectivo);

  const resumen = useResumen(detalle.datos?.observables, globales, porHallazgo);

  function actualizarCampoHallazgo(obsId, clave, token, valor) {
    setPorHallazgo((previo) => ({
      ...previo,
      [obsId]: { ...previo[obsId], [clave]: { ...previo[obsId]?.[clave], [token]: valor } },
    }));
  }

  async function marcarCorrectivo(obsId, estado, nota) {
    if (await marcar.ejecutar(ejecucionId, obsId, estado, nota)) detalle.recargar();
  }

  async function quitarMarcaCorrectivo(obsId) {
    if (await desmarcar.ejecutar(ejecucionId, obsId)) detalle.recargar();
  }

  async function generarScript() {
    await generar.ejecutar(ejecucionId, { globales, por_hallazgo: porHallazgo });
  }

  function descargar() {
    const blob = new Blob([generar.resultado], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `correctivos_ejecucion_${ejecucionId}.sql`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const encabezado = (
    <Encabezado
      titulo="Script correctivo"
      ayuda="correctivos"
      descripcion={
        ejecucionId
          ? `Correctivos de la ejecución #${ejecucionId}, uno por observable. El instrumento observa y propone; no ejecuta.`
          : "Correctivos de una ejecución, uno por observable."
      }
    />
  );

  if (!ejecucionId)
    return (
      <div className="space-y-8">
        {encabezado}
        <Vacio icono={FileCode2} titulo="Aún no hay correctivos">
          Los correctivos salen de los hallazgos de una ejecución. Observa la base desde el Dashboard.
        </Vacio>
      </div>
    );

  return (
    <div className="space-y-6">
      {encabezado}

      <section aria-labelledby="titulo-pasos-dba" className="rounded-xl bg-superficie shadow-tarjeta">
        <h2 id="titulo-pasos-dba" className="border-b border-linea px-5 py-3 text-sm font-semibold">
          Qué hace el DBA con este script
        </h2>
        <ol className="grid gap-px bg-linea sm:grid-cols-5">
          {PASOS_DBA.map(([paso, detalle_], i) => (
            <li key={paso} className="bg-superficie px-4 py-3">
              <p className="text-sm font-semibold">
                <span className="mr-1.5 text-texto-3 tabular">{i + 1}.</span>
                {paso}
              </p>
              <p className="mt-1 text-xs text-texto-2">{detalle_}</p>
            </li>
          ))}
        </ol>
      </section>

      {detalle.cargando && !detalle.datos && <Cargando />}
      <Aviso tono="error">{detalle.error}</Aviso>

      {detalle.datos && resumen && (
        <>
          {resumen.total === 0 ? (
            <Vacio icono={FileCode2} titulo="Sin hallazgos que corregir">
              Esta ejecución no tiene observables en «No cumple».
            </Vacio>
          ) : (
            <>
              <p className="text-sm text-texto-3 tabular" aria-live="polite">
                {resumen.activos.length} activas · {resumen.pendientes.length} pendientes · {resumen.aplicados.length} aplicadas
              </p>

              {resumen.globalesGuia.size > 0 && (
                <Seccion
                  titulo="Valores que aplican a todo el script"
                  descripcion="Se llenan una sola vez y se usan en todas las plantillas activas que los necesiten."
                >
                  <div className="grid gap-4 rounded-xl bg-superficie p-5 shadow-tarjeta sm:grid-cols-2">
                    {[...resumen.globalesGuia].map(([token, guia]) => (
                      <CampoManual
                        key={token}
                        etiqueta={etiquetaCampoDe(token)}
                        guia={guia}
                        valor={globales[token] ?? ""}
                        onChange={(v) => setGlobales((previo) => ({ ...previo, [token]: v }))}
                      />
                    ))}
                  </div>
                </Seccion>
              )}

              {resumen.activos.length > 0 && (
                <Seccion titulo={`Activas (${resumen.activos.length})`} descripcion="Esto es lo que se incluye al generar el script.">
                  <div className="space-y-2">
                    {resumen.activos.map((obs) => (
                      <TarjetaObservable
                        key={obs.obs_id}
                        obs={obs}
                        porHallazgo={porHallazgo}
                        actualizarCampoHallazgo={actualizarCampoHallazgo}
                        onMarcar={marcarCorrectivo}
                        onDesmarcar={quitarMarcaCorrectivo}
                        ocupado={marcar.cargando || desmarcar.cargando}
                      />
                    ))}
                  </div>
                </Seccion>
              )}

              {resumen.pendientes.length > 0 && (
                <Seccion
                  titulo={`Pendientes (${resumen.pendientes.length})`}
                  descripcion="Pospuestas para después: no se incluyen en el script hasta que las reactives."
                >
                  <div className="space-y-2">
                    {resumen.pendientes.map((obs) => (
                      <TarjetaObservable
                        key={obs.obs_id}
                        obs={obs}
                        porHallazgo={porHallazgo}
                        actualizarCampoHallazgo={actualizarCampoHallazgo}
                        onMarcar={marcarCorrectivo}
                        onDesmarcar={quitarMarcaCorrectivo}
                        ocupado={marcar.cargando || desmarcar.cargando}
                      />
                    ))}
                  </div>
                </Seccion>
              )}

              {resumen.aplicados.length > 0 && (
                <Seccion
                  titulo={`Aplicadas (${resumen.aplicados.length})`}
                  descripcion="Ya se resolvieron aparte; no se incluyen en el script. Vuelve a observar la base para confirmarlas de verdad."
                >
                  <div className="space-y-2">
                    {resumen.aplicados.map((obs) => (
                      <TarjetaObservable
                        key={obs.obs_id}
                        obs={obs}
                        porHallazgo={porHallazgo}
                        actualizarCampoHallazgo={actualizarCampoHallazgo}
                        onMarcar={marcarCorrectivo}
                        onDesmarcar={quitarMarcaCorrectivo}
                        ocupado={marcar.cargando || desmarcar.cargando}
                      />
                    ))}
                  </div>
                </Seccion>
              )}

              <section className="space-y-3 rounded-xl bg-superficie p-5 shadow-tarjeta">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Generar el script completo</h2>
                    <p className="mt-0.5 text-sm text-texto-3">
                      {resumen.activos.length === 0
                        ? "No hay observables activos: no hay nada que generar."
                        : resumen.totalFaltantes > 0
                          ? `Faltan ${resumen.totalFaltantes} campo${resumen.totalFaltantes === 1 ? "" : "s"} por completar en las activas.`
                          : "Todos los campos de las activas están llenos: el script ya se puede generar."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generarScript}
                    disabled={resumen.activos.length === 0 || resumen.totalFaltantes > 0 || generar.cargando}
                    className={boton}
                  >
                    {generar.cargando ? "Generando…" : "Generar script completo"}
                  </button>
                </div>
                <Aviso tono="error">{generar.error}</Aviso>
                {generar.resultado && (
                  <div className="space-y-2">
                    <div className="flex justify-end gap-2">
                      <BotonCopiar texto={generar.resultado} />
                      <button type="button" onClick={descargar} className={botonSecundario}>
                        <Download aria-hidden="true" className="size-4" />
                        Descargar .sql
                      </button>
                    </div>
                    <pre className={`${codigo} max-h-[70vh]`}>{generar.resultado}</pre>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
