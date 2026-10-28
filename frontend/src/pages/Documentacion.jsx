import { FileText, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { codigoEnLinea, enlace } from "../components/estilos";
import { Encabezado, Seccion } from "../components/ui";
import { useCarga } from "../hooks/useCarga";

// Sección 6 del enunciado: lo que debe contener el artefacto, y dónde está en el sistema.
// `ruta` es una pantalla del instrumento; `empresa` indica que necesita una empresa abierta.
const PRODUCTO = [
  { punto: "Tabla de riesgos R-CONF con impacto y probabilidad", donde: "Catálogo, Riesgos R-CONF", ruta: "/catalogo?vista=riesgos", archivo: "instrumento/riesgos.json" },
  { punto: "Tabla de tareas del DBA", donde: "Catálogo, Tareas del DBA", ruta: "/catalogo?vista=tareas", archivo: "instrumento/tareas.json" },
  {
    punto: "Mapeo de controles ISO con implementación sugerida y evidencia observable",
    donde: "Catálogo, Mapeo de controles",
    ruta: "/catalogo?vista=mapeo",
    archivo: "instrumento/controles_iso.json",
  },
  {
    punto: "Lista de 15 controles observables por un auditor externo",
    donde: "Catálogo, Matriz-instrumento (24 observables, 15 controles y 4 extras)",
    ruta: "/catalogo?vista=matriz",
    archivo: "instrumento/catalogo_controles.json",
  },
  {
    punto: "Matriz de evaluación (Tarea, Riesgo, Control, Criterio 0-4, Evidencia, Estado)",
    donde: "Empresa, Matriz (exportable a CSV)",
    ruta: "matriz",
    empresa: true,
    archivo: "docs/evidencias/fase1/05_matriz_antes.csv",
  },
  {
    punto: "Batería de pruebas (ID, Tipo, Procedimiento, Resultado esperado, Herramienta)",
    donde: "Catálogo, Batería de pruebas",
    ruta: "/catalogo?vista=bateria",
    archivo: "instrumento/sql/observables/",
  },
  { punto: "Scripts de verificación (obligatorio)", donde: "Un archivo .sql por observable, y el script correctivo de cada ejecución", ruta: "correctivos", empresa: true, archivo: "instrumento/sql/observables/OBS-01.sql … OBS-24.sql" },
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

const DOCUMENTOS = [
  ["docs/Tabla IA.pdf", "Tabla de uso de inteligencia artificial y declaración jurada"],
  ["docs/Documentacion Confidencialidad.docx.pdf", "Informe, marco teórico y referencias APA 7"],
  ["docs/evidencias/", "Capturas antes y después"],
  ["instrumento/", "El instrumento genérico: catálogo, observables SQL, perfil de política y script de incorporación del auditor"],
  ["laboratorio/clinica/", "Empresa ficticia de demostración: línea base insegura, datos y pruebas de laboratorio"],
];

export default function Documentacion() {
  const empresas = useCarga(api.empresas, []);
  const primera = empresas.datos?.[0];

  function destino(fila) {
    if (!fila.empresa) return fila.ruta;
    return primera ? `/empresas/${primera.id}/${fila.ruta}` : "/";
  }

  return (
    <div className="space-y-10">
      <Encabezado
        titulo="Defensa y documentos"
        ayuda="documentacion"
        descripcion="Dónde está, dentro del sistema, cada pieza que pide el enunciado; cómo auditar una empresa nueva y los documentos del repositorio."
      />

      <Seccion
        titulo="Mapa del enunciado"
        descripcion={`Sección 6, producto esperado. Cada fila abre la pantalla que lo cumple${primera ? `; las de empresa usan ${primera.nombre}` : ""}.`}
      >
        <ol className="overflow-hidden rounded-xl bg-superficie shadow-tarjeta">
          {PRODUCTO.map((fila, i) => (
            <li key={fila.punto} className="grid gap-x-6 gap-y-1 border-b border-linea px-5 py-3.5 last:border-0 md:grid-cols-[2rem_1.2fr_1fr]">
              <span className="text-sm font-semibold text-texto-3 tabular">{i < 6 ? `${i + 1}.` : "+"}</span>
              <p className="font-medium">{fila.punto}</p>
              <div className="text-sm">
                <Link to={destino(fila)} className={enlace}>
                  {fila.donde}
                </Link>
                <p className="mt-0.5 font-mono text-xs break-all text-texto-3">{fila.archivo}</p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Cómo auditar una empresa nueva" descripcion="Con otra empresa solo cambian la conexión y el perfil.">
        <ol className="rounded-xl bg-superficie px-5 py-2 shadow-tarjeta">
          {PASOS.map((paso, i) => (
            <li key={paso} className="grid grid-cols-[1.75rem_1fr] gap-2 border-b border-linea py-2.5 text-sm last:border-0">
              <span className="font-semibold text-texto-3 tabular">{i + 1}.</span>
              <span className="text-texto-2">{paso}</span>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Documentos del proyecto" descripcion="Rutas dentro del repositorio.">
        <ul className="grid gap-px overflow-hidden rounded-xl bg-linea shadow-tarjeta md:grid-cols-2">
          {DOCUMENTOS.map(([ruta, descripcion]) => {
            const Icono = ruta.endsWith("/") ? FolderOpen : FileText;
            return (
              <li key={ruta} className="flex gap-3 bg-superficie px-5 py-3.5">
                <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-texto-3" />
                <div>
                  <code className={codigoEnLinea}>{ruta}</code>
                  <p className="mt-1 text-sm text-texto-2">{descripcion}</p>
                </div>
              </li>
            );
          })}
          {DOCUMENTOS.length % 2 === 1 && <li className="hidden bg-superficie md:block" />}
        </ul>
      </Seccion>
    </div>
  );
}
