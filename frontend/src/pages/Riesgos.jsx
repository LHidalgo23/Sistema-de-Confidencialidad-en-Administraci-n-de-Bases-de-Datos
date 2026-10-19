import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Riesgos() {
  const [riesgos, setRiesgos] = useState([]);

  useEffect(() => {
    api.riesgos().then(setRiesgos).catch(() => setRiesgos([]));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Riesgos de confidencialidad (R-CONF)</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Escala: Probabilidad 1-5 × Impacto 1-5. Nivel: 1-6 Bajo · 8-12 Medio · 15-25 Alto.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {riesgos.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{r.id}</p>
            <p className="font-medium">{r.resumen}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.baseLegal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
