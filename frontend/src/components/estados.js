import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";

// Cada estado lleva color, ícono y texto: nunca se distingue solo por el color.
export const ESTADOS = {
  Cumple: { icono: CircleCheck, clase: "bg-cumple-suave text-cumple", punto: "bg-cumple" },
  Parcial: { icono: CircleMinus, clase: "bg-parcial-suave text-parcial", punto: "bg-parcial" },
  "No cumple": { icono: CircleX, clase: "bg-nocumple-suave text-nocumple", punto: "bg-nocumple" },
  "No evaluable": { icono: CircleDashed, clase: "bg-noeval-suave text-noeval", punto: "bg-noeval" },
};

export const ORDEN_ESTADOS = ["Cumple", "Parcial", "No cumple", "No evaluable"];

export function etiquetaEjecucion(e) {
  const fecha = new Date(e.iniciada_en).toLocaleString();
  return `#${e.id}${e.etiqueta ? ` (${e.etiqueta})` : ""}, ${fecha}`;
}
