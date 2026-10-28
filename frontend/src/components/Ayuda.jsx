import { BookOpen, CircleHelp, ListChecks, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { GLOSARIO, GUIAS } from "../guias";

const PESTANAS = [
  { id: "uso", etiqueta: "Cómo usarla", icono: ListChecks },
  { id: "glosario", etiqueta: "Glosario", icono: BookOpen },
];

const SECCIONES_USO = [
  { clave: "queMuestra", titulo: "Qué muestra", ordenada: false },
  { clave: "comoProbar", titulo: "Cómo probarla", ordenada: true },
  { clave: "esperado", titulo: "Resultado esperado", ordenada: false },
  { clave: "siguiente", titulo: "Qué probar después", ordenada: false },
];

function Lista({ elementos, ordenada }) {
  const Etiqueta = ordenada ? "ol" : "ul";
  return (
    <Etiqueta className={`mt-2 space-y-1.5 pl-5 text-sm text-texto-2 ${ordenada ? "list-decimal" : "list-disc"} marker:text-texto-3`}>
      {elementos.map((texto) => (
        <li key={texto} className="pl-1">
          {texto}
        </li>
      ))}
    </Etiqueta>
  );
}

function Uso({ guia }) {
  return (
    <div className="space-y-6">
      <p className="text-texto">{guia.queEs}</p>
      {SECCIONES_USO.filter(({ clave }) => guia[clave]?.length).map(({ clave, titulo, ordenada }) => (
        <section key={clave}>
          <h3 className="text-sm font-semibold text-texto">{titulo}</h3>
          <Lista elementos={guia[clave]} ordenada={ordenada} />
        </section>
      ))}
    </div>
  );
}

function Glosario({ claves }) {
  const propias = claves?.length ? claves : [];
  const resto = Object.keys(GLOSARIO).filter((clave) => !propias.includes(clave));
  const Termino = ({ clave }) => (
    <div className="py-3">
      <dt className="text-sm font-semibold text-texto">{GLOSARIO[clave][0]}</dt>
      <dd className="mt-0.5 text-sm text-texto-2">{GLOSARIO[clave][1]}</dd>
    </div>
  );
  return (
    <div className="space-y-5">
      {propias.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-texto-3">En esta pantalla</h3>
          <dl className="divide-y divide-linea">
            {propias.map((clave) => (
              <Termino key={clave} clave={clave} />
            ))}
          </dl>
        </section>
      )}
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-acento">Ver los {resto.length} términos restantes</summary>
        <dl className="mt-1 divide-y divide-linea">
          {resto.map((clave) => (
            <Termino key={clave} clave={clave} />
          ))}
        </dl>
      </details>
    </div>
  );
}

function escribiendo(objetivo) {
  return objetivo instanceof HTMLElement && (objetivo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(objetivo.tagName));
}

/**
 * Botón «Ayuda» y su panel lateral. El panel es un <dialog> modal: atrapa el foco,
 * se cierra con Esc o con un clic fuera, y devuelve el foco al botón.
 * La tecla «?» lo abre desde cualquier parte de la pantalla.
 */
export default function BotonAyuda({ id }) {
  const guia = GUIAS[id];
  const dialogo = useRef(null);
  const [pestana, setPestana] = useState("uso");
  const idTitulo = useId();

  useEffect(() => {
    function alPulsar(evento) {
      if (evento.key !== "?" || evento.ctrlKey || evento.metaKey || evento.altKey || escribiendo(evento.target)) return;
      if (dialogo.current && !dialogo.current.open) {
        evento.preventDefault();
        dialogo.current.showModal();
      }
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  if (!guia) return null;

  const cerrar = () => dialogo.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        aria-haspopup="dialog"
        aria-keyshortcuts="?"
        title="Ayuda de esta pantalla (tecla ?)"
        className="mt-0.5 inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-acento-suave py-1 pr-3 pl-2 text-[0.8125rem] font-semibold text-acento transition-[scale,background-color] duration-150 hover:bg-acento/15 active:scale-[0.96]"
      >
        <CircleHelp aria-hidden="true" className="size-4" strokeWidth={2.25} />
        Ayuda
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        className="panel-ayuda"
        onClick={(evento) => evento.target === dialogo.current && cerrar()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-linea px-6 pt-5 pb-4">
            <div>
              <p className="text-sm text-texto-3">Ayuda de la pantalla</p>
              <h2 id={idTitulo} className="text-xl font-bold text-texto">
                {guia.titulo}
              </h2>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar la ayuda"
              className="grid size-10 cursor-pointer place-items-center rounded-lg text-texto-2 transition-[scale,background-color] duration-150 hover:bg-superficie-2 hover:text-texto active:scale-[0.96]"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div role="tablist" aria-label="Secciones de la ayuda" className="flex gap-1 border-b border-linea px-4">
            {PESTANAS.map(({ id: clave, etiqueta, icono: Icono }) => {
              const activa = pestana === clave;
              return (
                <button
                  key={clave}
                  type="button"
                  role="tab"
                  id={`${idTitulo}-${clave}`}
                  aria-selected={activa}
                  aria-controls={`${idTitulo}-panel`}
                  onClick={() => setPestana(clave)}
                  className={`-mb-px inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium transition-colors duration-150 ${
                    activa ? "border-acento text-texto" : "border-transparent text-texto-3 hover:text-texto"
                  }`}
                >
                  <Icono aria-hidden="true" className="size-4" />
                  {etiqueta}
                </button>
              );
            })}
          </div>

          <div id={`${idTitulo}-panel`} role="tabpanel" aria-labelledby={`${idTitulo}-${pestana}`} className="flex-1 overflow-y-auto px-6 py-5">
            {pestana === "uso" && <Uso guia={guia} />}
            {pestana === "glosario" && <Glosario claves={guia.terminos} />}
          </div>

          <p className="border-t border-linea px-6 py-3 text-xs text-texto-3">
            Abre esta ayuda en cualquier pantalla con la tecla <kbd className="rounded bg-superficie-2 px-1.5 py-0.5 font-mono shadow-[inset_0_0_0_1px_var(--linea)]">?</kbd>
          </p>
        </div>
      </dialog>
    </>
  );
}
