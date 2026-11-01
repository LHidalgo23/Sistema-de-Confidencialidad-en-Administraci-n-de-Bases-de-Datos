import { CircleDashed } from "lucide-react";
import { ESTADOS } from "./estados";

/** `etiqueta` reemplaza el texto visible sin cambiar el color/ícono, que siguen saliendo de `estado`. */
export default function EstadoBadge({ estado, etiqueta }) {
  const config = ESTADOS[estado];
  const Icono = config?.icono ?? CircleDashed;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-xs font-semibold whitespace-nowrap ${config?.clase ?? "bg-superficie-2 text-texto-2"}`}
    >
      <Icono aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
      {etiqueta ?? estado ?? "Sin datos"}
    </span>
  );
}
