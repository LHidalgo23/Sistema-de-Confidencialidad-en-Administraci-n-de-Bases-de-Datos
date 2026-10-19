import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Pruebas() {
  const [pruebas, setPruebas] = useState([]);

  useEffect(() => {
    api.pruebas().then(setPruebas).catch(() => setPruebas([]));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Batería de pruebas (P-01 a P-24)</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {["ID", "Control", "Tipo", "Conexión", "Resultado esperado"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pruebas.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 font-mono">{p.id}</td>
                <td className="px-3 py-2 font-mono">{p.control}</td>
                <td className="px-3 py-2 capitalize">{p.tipo}</td>
                <td className="px-3 py-2">{p.conexion}</td>
                <td className="px-3 py-2">{p.esperado?.descripcion ?? JSON.stringify(p.esperado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
