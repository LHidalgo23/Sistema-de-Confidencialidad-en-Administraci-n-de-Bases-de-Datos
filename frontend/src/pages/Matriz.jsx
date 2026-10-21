import { Download, Table2 } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { ESTADOS, ORDEN_ESTADOS, etiquetaEjecucion } from "../components/estados";
import { botonSecundario, campo, etiquetaCampo, td } from "../components/estilos";
import { Encabezado, Segmentado, Vacio } from "../components/ui";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

const thMatriz = "px-3 py-2 text-left text-[0.8125rem] font-semibold whitespace-nowrap text-texto-2";

function Criterio({ valor }) {
  if (valor === null || valor === undefined) return <span className="text-texto-3">—</span>;
  return (
    <span className="inline-grid size-7 place-items-center rounded-md bg-superficie-2 font-semibold tabular shadow-[inset_0_0_0_1px_var(--linea)]">
      {valor}
    </span>
  );
}

export default function Matriz() {
  const { empresa, ejecuciones } = useEmpresa();
  const [seleccion, setSeleccion] = useState({ antes: "", despues: "" });
  const [filtro, setFiltro] = useState("");
  const hayEjecuciones = ejecuciones.length > 0;

  const matriz = useCarga(
    () => (hayEjecuciones ? api.matriz(empresa.id, seleccion.antes, seleccion.despues) : Promise.resolve(null)),
    [empresa.id, seleccion.antes, seleccion.despues, hayEjecuciones],
  );

  const encabezado = (
    <Encabezado
      titulo="Matriz de evaluación"
      ayuda="matriz"
      descripcion="Tarea, riesgo, control, criterio 0-4, evidencia y estado, antes y después del correctivo. Son las columnas que pide el enunciado."
    />
  );

  if (!hayEjecuciones)
    return (
      <div className="space-y-8">
        {encabezado}
        <Vacio icono={Table2} titulo="La matriz se arma a partir de una ejecución">
          Observa la base desde el Dashboard con la etiqueta «antes». Después de corregir, vuelve a observar para llenar las columnas «después».
        </Vacio>
      </div>
    );

  const datos = matriz.datos;
  const todas = datos?.filas ?? [];
  const estadoFinal = (f) => f.estado_despues ?? f.estado_antes;
  const filas = todas.filter((f) => !filtro || estadoFinal(f) === filtro);
  const hayDespues = Boolean(datos?.despues);
  const cambiar = (clave) => (e) => setSeleccion((p) => ({ ...p, [clave]: e.target.value }));
  const opciones = ejecuciones.map((e) => (
    <option key={e.id} value={e.id}>
      {etiquetaEjecucion(e)}
    </option>
  ));

  return (
    <div className="space-y-6">
      {encabezado}

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-superficie px-5 py-4 shadow-tarjeta">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className={etiquetaCampo}>Ejecución «antes»</span>
            <select value={seleccion.antes || datos?.antes || ""} onChange={cambiar("antes")} className={`${campo} w-auto max-w-72`}>
              {opciones}
            </select>
          </label>
          <label className="text-sm">
            <span className={etiquetaCampo}>Ejecución «después»</span>
            <select value={seleccion.despues || datos?.despues || ""} onChange={cambiar("despues")} className={`${campo} w-auto max-w-72`}>
              <option value="">Ninguna todavía</option>
              {opciones}
            </select>
          </label>
        </div>
        <a href={api.urlMatrizCsv(empresa.id, seleccion.antes, seleccion.despues)} className={botonSecundario}>
          <Download aria-hidden="true" className="size-4" />
          Exportar CSV
        </a>
      </div>

      {todas.length > 0 && (
        <Segmentado
          etiqueta="Filtrar por estado final"
          nombre="filtro-matriz"
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { valor: "", etiqueta: "Todos", cuenta: todas.length },
            ...ORDEN_ESTADOS.map((estado) => ({
              valor: estado,
              etiqueta: estado,
              punto: ESTADOS[estado].punto,
              cuenta: todas.filter((f) => estadoFinal(f) === estado).length,
            })),
          ]}
        />
      )}

      {matriz.cargando && !datos && <Cargando />}
      <Aviso tono="error">{matriz.error}</Aviso>
      {datos && !hayDespues && (
        <Aviso tono="info">Solo hay columnas «antes». Corrige, vuelve a observar y elige esa ejecución como «después».</Aviso>
      )}

      {datos && (
        <div className="overflow-x-auto rounded-xl bg-superficie shadow-tarjeta">
          <table className="min-w-full text-sm">
            <thead className="bg-superficie-2">
              <tr className="border-b border-linea">
                <th scope="colgroup" colSpan={4} className={`${thMatriz} pt-3 pb-1 text-xs text-texto-3`}>
                  Qué se evalúa
                </th>
                <th scope="colgroup" colSpan={2} className={`${thMatriz} border-l border-linea pt-3 pb-1 text-xs text-texto-3`}>
                  Antes
                </th>
                <th scope="colgroup" colSpan={3} className={`${thMatriz} border-l border-linea pt-3 pb-1 text-xs text-texto-3`}>
                  Después del correctivo
                </th>
              </tr>
              <tr className="border-b border-linea">
                <th scope="col" className={`${thMatriz} sticky left-0 z-10 bg-superficie-2`}>
                  Control
                </th>
                <th scope="col" className={thMatriz}>
                  Tarea
                </th>
                <th scope="col" className={thMatriz}>
                  Riesgo
                </th>
                <th scope="col" className={thMatriz}>
                  Evidencia
                </th>
                <th scope="col" className={`${thMatriz} border-l border-linea`}>
                  Criterio
                </th>
                <th scope="col" className={thMatriz}>
                  Estado
                </th>
                <th scope="col" className={`${thMatriz} border-l border-linea`}>
                  Correctivo aplicado
                </th>
                <th scope="col" className={thMatriz}>
                  Criterio
                </th>
                <th scope="col" className={thMatriz}>
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-linea [&>tr:last-child]:border-0">
              {filas.map((f) => {
                const mejoro = f.criterio_despues !== null && f.criterio_despues !== undefined && f.criterio_despues > (f.criterio_antes ?? -1);
                return (
                  <tr key={f.control_id} className="hover:bg-superficie-2/60">
                    <th scope="row" className={`${td} sticky left-0 min-w-48 bg-superficie text-left font-semibold`}>
                      {f.control}
                    </th>
                    <td className={`${td} min-w-40 text-[0.8125rem] text-texto-2`}>{f.tarea}</td>
                    <td className={`${td} font-mono text-xs whitespace-nowrap text-texto-2`}>{f.riesgo}</td>
                    <td className={`${td} min-w-64 max-w-sm text-[0.8125rem]`}>{f.hallazgo}</td>
                    <td className={`${td} border-l border-linea`}>
                      <Criterio valor={f.criterio_antes} />
                    </td>
                    <td className={td}>
                      <EstadoBadge estado={f.estado_antes} />
                    </td>
                    <td className={`${td} min-w-36 border-l border-linea text-[0.8125rem] text-texto-2`}>{f.correctivo_aplicado}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5">
                        <Criterio valor={f.criterio_despues} />
                        {mejoro && <span className="text-xs font-semibold text-cumple">+{f.criterio_despues - (f.criterio_antes ?? 0)}</span>}
                      </span>
                    </td>
                    <td className={td}>{f.estado_despues ? <EstadoBadge estado={f.estado_despues} /> : <span className="text-texto-3">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
