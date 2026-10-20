import { useCallback, useState } from "react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { boton, botonSecundario, cabecera, contenedorTabla, cuerpo, tabla, td, th } from "../components/estilos";
import { useAccion, useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

const clave = (c) => `${c.esquema}.${c.tabla}.${c.columna}`;
const aValor = (confirmada) => (confirmada === 1 ? "1" : confirmada === 0 ? "0" : "");

export default function Descubrimiento() {
  const { empresa, password } = useEmpresa();
  const guardadas = useCarga(() => api.descubrimiento(empresa.id), [empresa.id]);
  const descubrir = useAccion(useCallback(() => api.descubrir(empresa.id, password), [empresa.id, password]));
  const guardar = useAccion(useCallback((cuerpoPeticion) => api.confirmarDescubrimiento(empresa.id, cuerpoPeticion), [empresa.id]));
  const [decisiones, setDecisiones] = useState({});

  const columnas = guardadas.datos ?? [];
  const valorDe = (c) => decisiones[clave(c)] ?? aValor(c.confirmada);

  async function ejecutarDescubrimiento() {
    const resultado = await descubrir.ejecutar();
    if (resultado) {
      setDecisiones({});
      guardadas.recargar();
    }
  }

  async function guardarDecisiones() {
    const cambios = columnas.filter((c) => decisiones[clave(c)] !== undefined && decisiones[clave(c)] !== aValor(c.confirmada));
    const referencia = ({ esquema, tabla: nombre, columna }) => ({ esquema, tabla: nombre, columna });
    const actualizadas = await guardar.ejecutar({
      confirmadas: cambios.filter((c) => decisiones[clave(c)] === "1").map(referencia),
      descartadas: cambios.filter((c) => decisiones[clave(c)] === "0").map(referencia),
    });
    if (actualizadas) {
      setDecisiones({});
      guardadas.recargar();
    }
  }

  const pendientes = columnas.filter((c) => valorDe(c) === "").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Descubrimiento de datos sensibles</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Encuentra esquemas de negocio y columnas sensibles solo por metadatos (nombre y tipo): no lee los datos. Lo que usted
            confirma o descarta alimenta la clasificación (A5.12) y los observables de enmascarado, cifrado, VPD y auditoría. Lo
            pendiente se audita como sensible hasta que se descarte.
          </p>
        </div>
        <button type="button" onClick={ejecutarDescubrimiento} disabled={descubrir.cargando} className={boton}>
          {descubrir.cargando ? "Descubriendo…" : "Descubrir ahora"}
        </button>
      </div>

      <Aviso tono="error">{descubrir.error || guardar.error || guardadas.error}</Aviso>
      {descubrir.resultado && (
        <Aviso tono="info">
          Esquemas de negocio encontrados:{" "}
          {descubrir.resultado.esquemas.map((e) => `${e.esquema} (${e.tablas} tablas)`).join(", ") || "ninguno"}.
        </Aviso>
      )}
      {guardadas.cargando && !guardadas.datos && <Cargando />}

      {columnas.length === 0 && !guardadas.cargando && (
        <Aviso>Todavía no hay columnas descubiertas. Ejecute el descubrimiento.</Aviso>
      )}

      {columnas.length > 0 && (
        <>
          <div className={contenedorTabla}>
            <table className={tabla}>
              <thead className={cabecera}>
                <tr>
                  {["Esquema", "Tabla", "Columna", "Tipo", "Categoría", "Nivel", "Decisión"].map((titulo) => (
                    <th key={titulo} scope="col" className={th}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cuerpo}>
                {columnas.map((c) => (
                  <tr key={clave(c)}>
                    <td className={`${td} font-mono text-xs`}>{c.esquema}</td>
                    <td className={`${td} font-mono text-xs`}>{c.tabla}</td>
                    <td className={`${td} font-mono text-xs`}>{c.columna}</td>
                    <td className={`${td} text-xs`}>{c.tipo_dato}</td>
                    <td className={td}>{c.categoria}</td>
                    <td className={td}>{c.nivel}</td>
                    <td className={td}>
                      <select
                        aria-label={`Decisión para ${clave(c)}`}
                        value={valorDe(c)}
                        onChange={(e) => setDecisiones((previo) => ({ ...previo, [clave(c)]: e.target.value }))}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="" disabled={aValor(c.confirmada) !== ""}>
                          Pendiente
                        </option>
                        <option value="1">Confirmada</option>
                        <option value="0">Descartada</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={guardarDecisiones}
              disabled={guardar.cargando || Object.keys(decisiones).length === 0}
              className={botonSecundario}
            >
              {guardar.cargando ? "Guardando…" : "Guardar decisiones"}
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {columnas.length} columnas · {pendientes} pendientes de revisar
            </span>
          </div>
        </>
      )}
    </div>
  );
}
