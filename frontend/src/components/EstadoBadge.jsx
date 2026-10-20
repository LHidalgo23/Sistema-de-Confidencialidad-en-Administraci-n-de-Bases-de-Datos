const ESTILOS = {
  Cumple: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Parcial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "No cumple": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "No evaluable": "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
};

export default function EstadoBadge({ estado }) {
  const clase = ESTILOS[estado] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${clase}`}>
      {estado ?? "Sin datos"}
    </span>
  );
}
