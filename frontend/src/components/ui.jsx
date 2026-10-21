import { Check, ChevronRight, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BotonAyuda from "./Ayuda";
import { ESTADOS } from "./estados";
import { botonSecundario } from "./estilos";

/** Encabezado de pantalla: título, qué es en una frase, acciones y el botón de ayuda. */
export function Encabezado({ titulo, descripcion, ayuda, acciones, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-3xl flex-1 basis-80">
        <div className="flex items-start gap-3">
          <h1 className="text-[1.625rem] leading-tight font-bold text-texto">{titulo}</h1>
          {ayuda && <BotonAyuda id={ayuda} />}
        </div>
        {descripcion && <p className="mt-1.5 max-w-[68ch] text-texto-2">{descripcion}</p>}
        {children}
      </div>
      {acciones && <div className="flex flex-wrap items-end gap-2">{acciones}</div>}
    </header>
  );
}

/** Bloque con título de nivel 2 y, opcionalmente, una explicación corta y acciones. */
export function Seccion({ titulo, descripcion, acciones, children, className = "" }) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-texto">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-sm text-texto-3">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

/**
 * Medidor de madurez 0-4: cuatro segmentos, uno por nivel alcanzado.
 * El color sigue al estado del control; sin madurez calculable se muestra vacío y lo dice.
 */
export function MedidorMadurez({ valor, estado, compacto = false }) {
  const relleno = ESTADOS[estado]?.punto ?? "bg-texto-3";
  const sinValor = valor === null || valor === undefined;
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={sinValor ? undefined : valor}
        aria-label={sinValor ? "Madurez no calculable" : `Madurez ${valor} de 4`}
        className={`grid grid-cols-4 gap-1 ${compacto ? "w-16" : "w-24"}`}
      >
        {[1, 2, 3, 4].map((nivel) => (
          <span
            key={nivel}
            className={`h-1.5 rounded-full ${!sinValor && nivel <= valor ? relleno : "bg-linea"}`}
          />
        ))}
      </div>
      <span className="text-xs font-medium whitespace-nowrap text-texto-2 tabular">
        {sinValor ? "Sin madurez" : `${valor} de 4`}
      </span>
    </div>
  );
}

/** Botón de copiar que confirma con «Copiado» durante un momento. */
export function BotonCopiar({ texto, etiqueta = "Copiar" }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef(null);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button type="button" onClick={copiar} className={botonSecundario}>
      <span className="relative inline-flex size-4">
        <Copy
          aria-hidden="true"
          className={`absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${copiado ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none"}`}
        />
        <Check
          aria-hidden="true"
          className={`absolute inset-0 size-4 text-cumple transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${copiado ? "scale-100 opacity-100 blur-none" : "scale-25 opacity-0 blur-[4px]"}`}
        />
      </span>
      <span aria-live="polite">{copiado ? "Copiado" : etiqueta}</span>
    </button>
  );
}

/** Estado vacío: dice qué falta y cuál es el siguiente paso. */
export function Vacio({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-linea-fuerte bg-superficie/60 px-6 py-8">
      {Icono && (
        <span className="grid size-10 place-items-center rounded-lg bg-acento-suave text-acento">
          <Icono aria-hidden="true" className="size-5" />
        </span>
      )}
      <div>
        <p className="font-semibold text-texto">{titulo}</p>
        {children && <p className="mt-1 max-w-[60ch] text-sm text-texto-2">{children}</p>}
      </div>
      {accion}
    </div>
  );
}

/** Acordeón con chevrón propio; el contenido aparece debajo del resumen. */
export function Desplegable({ resumen, children, abierto = false, className = "" }) {
  return (
    <details open={abierto} className={`group rounded-xl bg-superficie shadow-tarjeta ${className}`}>
      <summary className="flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3.5 select-none hover:bg-superficie-2/70">
        <ChevronRight
          aria-hidden="true"
          className="chevron mt-0.5 size-4 shrink-0 text-texto-3 transition-[rotate] duration-200"
        />
        <div className="min-w-0 flex-1">{resumen}</div>
      </summary>
      <div className="border-t border-linea px-4 pt-4 pb-5 sm:pl-11">{children}</div>
    </details>
  );
}

/** Control segmentado (radios) para filtros cortos. */
export function Segmentado({ etiqueta, opciones, valor, onChange, nombre }) {
  return (
    <fieldset>
      <legend className="sr-only">{etiqueta}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-lg bg-superficie-2 p-1 shadow-[inset_0_0_0_1px_var(--linea)]">
        {opciones.map((opcion) => {
          const activa = valor === opcion.valor;
          return (
            <label
              key={opcion.valor}
              className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento ${
                activa ? "bg-superficie text-texto shadow-tarjeta" : "text-texto-2 hover:text-texto"
              }`}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.valor}
                checked={activa}
                onChange={() => onChange(opcion.valor)}
                className="sr-only"
              />
              {opcion.punto && <span aria-hidden="true" className={`size-2 rounded-full ${opcion.punto}`} />}
              {opcion.etiqueta}
              {opcion.cuenta !== undefined && <span className="text-texto-3 tabular">{opcion.cuenta}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Lista de datos «término: valor» en rejilla, para fichas técnicas. */
export function Ficha({ datos, columnas = "sm:grid-cols-2 lg:grid-cols-4" }) {
  return (
    <dl className={`grid gap-px overflow-hidden rounded-xl bg-linea shadow-tarjeta ${columnas}`}>
      {datos.map(([termino, valor, mono]) => (
        <div key={termino} className="bg-superficie px-4 py-3">
          <dt className="text-xs font-medium text-texto-3">{termino}</dt>
          <dd className={`mt-0.5 text-sm font-medium break-words text-texto ${mono ? "font-mono" : ""}`}>{valor ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
