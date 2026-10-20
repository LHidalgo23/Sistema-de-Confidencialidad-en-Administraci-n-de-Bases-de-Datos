import { createContext, useContext } from "react";

export const EmpresaContext = createContext(null);

/** Empresa seleccionada, contraseña en memoria y ejecución activa. */
export function useEmpresa() {
  const contexto = useContext(EmpresaContext);
  if (!contexto) throw new Error("useEmpresa debe usarse dentro de EmpresaLayout");
  return contexto;
}
