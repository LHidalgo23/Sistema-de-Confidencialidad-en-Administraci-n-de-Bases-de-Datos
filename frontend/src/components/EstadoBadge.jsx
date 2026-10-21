import { CircleDashed } from "lucide-react";
import { ESTADOS } from "./estados";

export default function EstadoBadge({ estado }) {
  const config = ESTADOS[estado];
  const Icono = config?.icono ?? CircleDashed;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-xs font-semibold whitespace-nowrap ${config?.clase ?? "bg-superficie-2 text-texto-2"}`}
    >
      <Icono aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
      {estado ?? "Sin datos"}
    </span>
  );
}
