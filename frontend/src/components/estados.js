import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";

// Cada estado lleva color, ícono y texto: nunca se distingue solo por el color.
// `color` es el mismo token de index.css en formato var(), para usarlo en props de Recharts
// (fill, stroke) donde las clases de Tailwind no aplican.
export const ESTADOS = {
  Cumple: { icono: CircleCheck, clase: "bg-cumple-suave text-cumple", punto: "bg-cumple", color: "var(--cumple)" },
  Parcial: { icono: CircleMinus, clase: "bg-parcial-suave text-parcial", punto: "bg-parcial", color: "var(--parcial)" },
  "No cumple": { icono: CircleX, clase: "bg-nocumple-suave text-nocumple", punto: "bg-nocumple", color: "var(--nocumple)" },
  "No evaluable": { icono: CircleDashed, clase: "bg-noeval-suave text-noeval", punto: "bg-noeval", color: "var(--noeval)" },
};

export const ORDEN_ESTADOS = ["Cumple", "Parcial", "No cumple", "No evaluable"];

/** Clasifica una madurez promedio (0-4) en un estado general, con la misma regla 0-1/2/3-4 del glosario. */
export function estadoDeMadurez(madurezPromedio) {
  if (madurezPromedio === null || madurezPromedio === undefined) return "No evaluable";
  if (madurezPromedio < 2) return "No cumple";
  if (madurezPromedio < 3) return "Parcial";
  return "Cumple";
}

export function etiquetaEjecucion(e) {
  const fecha = new Date(e.iniciada_en).toLocaleString();
  return `#${e.id}${e.etiqueta ? ` (${e.etiqueta})` : ""}, ${fecha}`;
}
