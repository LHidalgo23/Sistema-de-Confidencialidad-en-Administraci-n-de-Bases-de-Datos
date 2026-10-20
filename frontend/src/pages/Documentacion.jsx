const DOCUMENTOS = [
  ["docs/informe.md", "Informe del proyecto (estructura y secciones)"],
  ["docs/marco-teorico.md", "Marco teórico: ISO 27001:2022, mínimo privilegio, defensa en profundidad, TDE, Redaction, VPD, DLP, SIEM, Ley 8968"],
  ["docs/tabla-uso-ia.md", "Tabla de uso de inteligencia artificial y declaración jurada"],
  ["docs/referencias-apa7.md", "Referencias en formato APA 7"],
  ["docs/evidencias/", "Capturas antes y después"],
  ["instrumento/", "El instrumento genérico: catálogo, observables SQL, perfil de política y script de incorporación del auditor"],
  ["laboratorio/clinica/", "Empresa ficticia de demostración: línea base insegura, datos y pruebas de laboratorio"],
];

const PASOS = [
  "Pedir al DBA de la empresa que ejecute instrumento/onboarding_auditor.sql en la base que se va a auditar.",
  "Registrar la empresa (conexión, usuario auditor y, si hace falta, un perfil de política).",
  "Pre-vuelo: versión, contenedor, privilegios del auditor y controles que no podrán evaluarse.",
  "Descubrimiento: confirmar o descartar las columnas sensibles detectadas por metadatos.",
  "Observar: ejecutar los observables y obtener la madurez 0-4 y el estado de cada control.",
  "Corregir: revisar y aplicar el script correctivo generado (lo aplica el DBA, nunca el instrumento).",
  "Re-observar: volver a ejecutar los mismos observables y comparar en la matriz.",
];

export default function Documentacion() {
  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Cómo auditar una empresa nueva</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-300">
          {PASOS.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Documentación del proyecto</h2>
        <ul className="space-y-1 text-sm">
          {DOCUMENTOS.map(([ruta, descripcion]) => (
            <li key={ruta}>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{ruta}</code>{" "}
              <span className="text-slate-600 dark:text-slate-300">{descripcion}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
