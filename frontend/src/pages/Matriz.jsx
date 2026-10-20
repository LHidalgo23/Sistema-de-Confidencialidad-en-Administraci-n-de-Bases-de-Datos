import { useState } from "react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { botonSecundario, cabecera, campo, contenedorTabla, cuerpo, tabla, td, th } from "../components/estilos";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

const COLUMNAS = [
  "Control",
  "Tarea",
  "Riesgo",
  "Hallazgo (evidencia)",
  "Criterio antes",
  "Estado antes",
  "Correctivo aplicado",
  "Criterio después",
  "Estado después",
];
const ESTADOS = ["Cumple", "Parcial", "No cumple", "No evaluable"];

export default function Matriz() {
  const { empresa, ejecuciones } = useEmpresa();
  const [seleccion, setSeleccion] = useState({ antes: "", despues: "" });
  const [filtro, setFiltro] = useState("");
  const hayEjecuciones = ejecuciones.length > 0;

  const matriz = useCarga(
    () => (hayEjecuciones ? api.matriz(empresa.id, seleccion.antes, seleccion.despues) : Promise.resolve(null)),
    [empresa.id, seleccion.antes, seleccion.despues, hayEjecuciones],
  );

  if (!hayEjecuciones) return <Aviso>La matriz se genera a partir de una ejecución. Observe la base desde el Dashboard.</Aviso>;

  const datos = matriz.datos;
  const filas = (datos?.filas ?? []).filter((f) => !filtro || (f.estado_despues ?? f.estado_antes) === filtro);
  const cambiar = (clave) => (e) => setSeleccion((p) => ({ ...p, [clave]: e.target.value }));
  const opciones = ejecuciones.map((e) => (
    <option key={e.id} value={e.id}>
      #{e.id}
      {e.etiqueta ? ` · ${e.etiqueta}` : ""} · {new Date(e.iniciada_en).toLocaleString()}
    </option>
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Matriz de evaluación</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tarea · Riesgo · Control · Criterio 0-4 · Evidencia · Estado, antes y después del correctivo.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Antes</span>
            <select value={seleccion.antes || datos?.antes || ""} onChange={cambiar("antes")} className={campo}>
              {opciones}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Después</span>
            <select value={seleccion.despues || datos?.despues || ""} onChange={cambiar("despues")} className={campo}>
              <option value="">—</option>
              {opciones}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Estado</span>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={campo}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <a href={api.urlMatrizCsv(empresa.id, seleccion.antes, seleccion.despues)} className={botonSecundario}>
            Exportar CSV
          </a>
        </div>
      </div>

      {matriz.cargando && !datos && <Cargando />}
      <Aviso tono="error">{matriz.error}</Aviso>

      {datos && (
        <div className={contenedorTabla}>
          <table className={tabla}>
            <thead className={cabecera}>
              <tr>
                {COLUMNAS.map((titulo) => (
                  <th key={titulo} scope="col" className={th}>
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cuerpo}>
              {filas.map((f) => (
                <tr key={f.control_id}>
                  <td className={`${td} font-medium`}>{f.control}</td>
                  <td className={`${td} text-xs`}>{f.tarea}</td>
                  <td className={`${td} font-mono text-xs whitespace-nowrap`}>{f.riesgo}</td>
                  <td className={`${td} max-w-xs text-xs`}>{f.hallazgo}</td>
                  <td className={td}>{f.criterio_antes ?? "—"}</td>
                  <td className={td}>
                    <EstadoBadge estado={f.estado_antes} />
                  </td>
                  <td className={`${td} text-xs`}>{f.correctivo_aplicado}</td>
                  <td className={td}>{f.criterio_despues ?? "—"}</td>
                  <td className={td}>{f.estado_despues ? <EstadoBadge estado={f.estado_despues} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
