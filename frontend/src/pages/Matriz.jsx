import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Matriz() {
  const [controles, setControles] = useState([]);

  useEffect(() => {
    api.controles().then(setControles).catch(() => setControles([]));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Matriz de evaluación</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Tarea | Riesgo | Control | Criterio 0-4 | Evidencia | Estado. La columna "Estado" se completa tras ejecutar la auditoría (ver Dashboard).
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {["Control", "Tareas", "Riesgos", "Implementación", "Evidencia"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {controles.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 font-mono">{c.id}{c.extra ? " *" : ""}</td>
                <td className="px-3 py-2">{c.tareas.join(", ")}</td>
                <td className="px-3 py-2">{c.riesgos.join(", ")}</td>
                <td className="px-3 py-2">{c.implementacion}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.evidencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">* Control extra, justificado más allá de los 15 obligatorios.</p>
    </div>
  );
}
