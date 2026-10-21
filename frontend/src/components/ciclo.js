import { FileCode2, Gauge, ListTodo, PlaneTakeoff, ScanSearch, Table2 } from "lucide-react";

// Pantallas de una empresa en el orden del ciclo de auditoría (plan v2, sección 1.1).
// El orden es real: cada paso usa lo que deja el anterior, por eso se numeran.
export const FASES = [
  {
    fase: "Planificar",
    pasos: [
      { ruta: "prevuelo", etiqueta: "Pre-vuelo", detalle: "Qué puede ver el auditor", icono: PlaneTakeoff },
      { ruta: "descubrimiento", etiqueta: "Descubrimiento", detalle: "Dónde hay datos sensibles", icono: ScanSearch },
    ],
  },
  {
    fase: "Verificar",
    pasos: [
      { ruta: "", etiqueta: "Dashboard", detalle: "Observar y evaluar", icono: Gauge },
      { ruta: "matriz", etiqueta: "Matriz", detalle: "Antes y después", icono: Table2 },
    ],
  },
  {
    fase: "Hacer y actuar",
    pasos: [
      { ruta: "correctivos", etiqueta: "Correctivos", detalle: "Script para el DBA", icono: FileCode2 },
      { ruta: "plan-mejora", etiqueta: "Plan de mejora", detalle: "Lo que queda pendiente", icono: ListTodo },
    ],
  },
];

export const PASOS = FASES.flatMap(({ fase, pasos }) => pasos.map((paso) => ({ ...paso, fase }))).map((paso, i) => ({
  ...paso,
  numero: i + 1,
}));

/** Paso del ciclo que corresponde a una ruta /empresas/:id/<resto>. Un hallazgo pertenece al Dashboard. */
export function pasoDeRuta(resto) {
  const segmento = (resto ?? "").split("/")[0];
  if (segmento === "hallazgos") return PASOS.find((p) => p.ruta === "");
  return PASOS.find((p) => p.ruta === segmento) ?? null;
}
