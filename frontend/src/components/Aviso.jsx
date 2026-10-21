import { CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react";

const TONOS = {
  error: { clase: "bg-nocumple-suave text-nocumple shadow-[inset_3px_0_0_var(--nocumple)]", icono: CircleAlert },
  aviso: { clase: "bg-parcial-suave text-parcial shadow-[inset_3px_0_0_var(--parcial)]", icono: TriangleAlert },
  info: { clase: "bg-acento-suave text-acento shadow-[inset_3px_0_0_var(--acento)]", icono: Info },
};

export default function Aviso({ tono = "info", titulo, children }) {
  if (!children) return null;
  const { clase, icono: Icono } = TONOS[tono];
  return (
    <div role={tono === "error" ? "alert" : "status"} className={`flex gap-3 rounded-lg px-4 py-3 text-sm ${clase}`}>
      <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <div className="min-w-0 text-texto">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={titulo ? "mt-0.5 text-texto-2" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return (
    <p role="status" className="flex items-center gap-2 py-2 text-sm text-texto-3">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      {texto}
    </p>
  );
}
