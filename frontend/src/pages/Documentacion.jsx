const ENLACES = [
  { href: "https://github.com", label: "Repositorio Git (completar enlace en README.md)" },
];

export default function Documentacion() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Documentación del proyecto</h2>
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
