import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Tareas() {
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    api.tareas().then(setTareas).catch(() => setTareas([]));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tareas críticas del DBA</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {["ID", "Tarea", "Riesgos asociados"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tareas.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2 font-mono">{t.id}</td>
                <td className="px-3 py-2">{t.nombre}</td>
                <td className="px-3 py-2">{t.riesgosAsociados.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
