import { useEffect, useState } from "react";

const CLAVE = "tema";
const consultaOscuro = () => window.matchMedia("(prefers-color-scheme: dark)");

function leerPreferido() {
  try {
    return localStorage.getItem(CLAVE) || "sistema";
  } catch {
    return "sistema";
  }
}

/** Aplica el tema sin que cada color haga su propia transición (el cambio debe ser instantáneo). */
function aplicar(preferido) {
  const oscuro = preferido === "oscuro" || (preferido === "sistema" && consultaOscuro().matches);
  const estilo = document.createElement("style");
  estilo.textContent = "*,*::before,*::after{transition:none !important}";
  document.head.appendChild(estilo);
  document.documentElement.dataset.theme = oscuro ? "dark" : "light";
  void document.body.offsetHeight;
  requestAnimationFrame(() => estilo.remove());
}

/** Tema «claro», «oscuro» o «sistema», recordado por navegador. */
export function useTema() {
  const [tema, setTema] = useState(leerPreferido);

  useEffect(() => {
    aplicar(tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // sin almacenamiento: el tema vale solo para esta visita
    }
    if (tema !== "sistema") return undefined;
    const consulta = consultaOscuro();
    const alCambiar = () => aplicar("sistema");
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, [tema]);

  return [tema, setTema];
}
