import { useEffect, useState } from "react";
import { api } from "../api/client";
import EstadoBadge from "../components/EstadoBadge";

export default function Dashboard() {
  const [controles, setControles] = useState([]);
  const [auditoria, setAuditoria] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.controles().then(setControles).catch((e) => setError(e.message));
  }, []);

  async function ejecutarAuditoria() {
    setCargando(true);
    setError(null);
    try {
      const resultado = await api.ejecutarAuditoria();
      setAuditoria(resultado);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  const estadoPorControl = Object.fromEntries(
    (auditoria?.controles ?? []).map((c) => [c.control, c])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Semáforo de controles</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {auditoria ? `Última ejecución: ${new Date(auditoria.timestamp).toLocaleString()}` : "Sin ejecutar — modo en vivo requiere Oracle disponible"}
          </p>
        </div>
        <button
          type="button"
          onClick={ejecutarAuditoria}
          disabled={cargando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {cargando ? "Ejecutando…" : "Ejecutar auditoría"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          No se pudo conectar con el backend ({error}). Verificar que `uvicorn app.main:app` esté corriendo y Oracle accesible.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {controles.map((control) => {
          const resultado = estadoPorControl[control.id];
          return (
            <div
              key={control.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{control.id}</p>
                  <p className="font-medium">{control.nombre}</p>
                </div>
                <EstadoBadge estado={resultado?.estado} />
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Madurez: {resultado?.madurez ?? "—"}/4
              </p>
            </div>
          );
        })}
        {controles.length === 0 && !error && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando controles…</p>
        )}
      </div>
    </div>
  );
}
