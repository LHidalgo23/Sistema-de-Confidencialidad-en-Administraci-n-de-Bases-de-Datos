// Clases compartidas. Los colores salen de los tokens de index.css (bg-superficie, text-texto-2...),
// así que funcionan igual en tema claro y oscuro sin variantes dark:.

const presion = "transition-[scale,background-color,color,box-shadow] duration-150 active:scale-[0.96] disabled:active:scale-100";

export const contenedorTabla = "overflow-x-auto rounded-xl bg-superficie shadow-tarjeta";
export const tabla = "min-w-full text-sm";
export const cabecera = "bg-superficie-2 text-left";
export const th = "px-3 py-2.5 font-semibold whitespace-nowrap text-texto-2 text-[0.8125rem] border-b border-linea";
export const cuerpo = "[&>tr]:border-b [&>tr]:border-linea [&>tr:last-child]:border-0 [&>tr:hover]:bg-superficie-2/60";
export const td = "px-3 py-2.5 align-top";
export const tarjeta = "rounded-xl bg-superficie p-5 shadow-tarjeta";

export const boton = `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-acento-texto hover:bg-acento-hover disabled:cursor-not-allowed disabled:opacity-55 ${presion}`;
export const botonSecundario = `inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-superficie px-3 py-1.5 text-sm font-medium text-texto shadow-[inset_0_0_0_1px_var(--linea-fuerte)] hover:bg-superficie-2 disabled:cursor-not-allowed disabled:opacity-55 ${presion}`;
export const botonFantasma = `inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-texto-2 hover:bg-superficie-2 hover:text-texto ${presion}`;

export const campo =
  "w-full min-h-10 rounded-lg border border-linea-fuerte bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-3 transition-[border-color,box-shadow] duration-150 focus:border-acento focus:shadow-[0_0_0_3px_var(--acento-suave)] focus:outline-none";
export const etiquetaCampo = "mb-1.5 block text-sm font-medium text-texto";
export const ayudaCampo = "mt-1.5 block text-xs text-texto-3";

export const codigo =
  "overflow-x-auto rounded-lg bg-superficie-2 p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-texto shadow-[inset_0_0_0_1px_var(--linea)]";
export const codigoEnLinea = "rounded bg-superficie-2 px-1.5 py-0.5 font-mono text-[0.8125em] text-texto shadow-[inset_0_0_0_1px_var(--linea)]";
export const enlace = "font-medium text-acento underline decoration-acento/35 underline-offset-[3px] hover:decoration-acento";
export const identificador = "font-mono text-[0.8125rem] font-medium";

export const claseEnlace = ({ isActive }) =>
  [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
    isActive ? "bg-acento-suave text-acento" : "text-texto-2 hover:bg-superficie-2 hover:text-texto",
  ].join(" ");
