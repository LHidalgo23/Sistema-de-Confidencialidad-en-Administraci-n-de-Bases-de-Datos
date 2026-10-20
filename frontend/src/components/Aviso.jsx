const TONOS = {
  error: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  aviso: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

export default function Aviso({ tono = "info", children }) {
  if (!children) return null;
  return (
    <div role={tono === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${TONOS[tono]}`}>
      {children}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{texto}</p>;
}
