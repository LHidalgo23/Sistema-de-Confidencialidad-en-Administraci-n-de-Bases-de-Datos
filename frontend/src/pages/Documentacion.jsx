import { useEffect, useState } from "react";
import { api } from "../api/client";

const ENLACES = [
  { href: "https://github.com", label: "Repositorio Git (completar enlace en README.md)" },
];

export default function Documentacion() {
  const [caso, setCaso] = useState(null);

  useEffect(() => {
    api.caso().then(setCaso).catch(() => setCaso(null));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Documentación del proyecto</h2>

      {caso && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-medium">Caso auditado: {caso.cliente}</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">{caso.descripcion}</p>
          <p className="mt-2 text-xs text-slate-400">{caso.notaReutilizacion}</p>
        </div>
      )}

      <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
        <li>Informe: <code>docs/informe.md</code></li>
        <li>Marco teórico: <code>docs/marco-teorico.md</code></li>
        <li>Tabla de uso de IA: <code>docs/tabla-uso-ia.md</code></li>
        <li>Referencias APA 7: <code>docs/referencias-apa7.md</code></li>
        <li>Evidencias (capturas antes/después): <code>docs/evidencias/</code></li>
        <li>Scripts SQL: <code>sql/</code></li>
      </ul>
      {ENLACES.length > 0 && (
        <p className="text-xs text-slate-400">Actualizar estos enlaces antes de la entrega.</p>
      )}
    </div>
  );
}
