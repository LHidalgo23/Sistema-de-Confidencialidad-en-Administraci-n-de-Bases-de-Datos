export const contenedorTabla = "overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800";
export const tabla = "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800";
export const cabecera = "bg-slate-50 dark:bg-slate-900";
export const th = "px-3 py-2 text-left font-medium whitespace-nowrap text-slate-600 dark:text-slate-300";
export const cuerpo = "divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950";
export const td = "px-3 py-2 align-top";
export const tarjeta = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";
export const boton =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300";
export const botonSecundario =
  "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";
export const campo = "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";
export const codigo =
  "overflow-x-auto rounded-md bg-slate-100 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap dark:bg-slate-900";
export const claseEnlace = ({ isActive }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ].join(" ");
