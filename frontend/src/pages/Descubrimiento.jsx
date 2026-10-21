import { ScanSearch } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { boton, botonSecundario, cabecera, contenedorTabla, cuerpo, tabla, td, th } from "../components/estilos";
import { Encabezado, Segmentado, Vacio } from "../components/ui";
import { useAccion, useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

const clave = (c) => `${c.esquema}.${c.tabla}.${c.columna}`;
const aValor = (confirmada) => (confirmada === 1 ? "1" : confirmada === 0 ? "0" : "");

const DECISIONES = [
  { valor: "", etiqueta: "Pendiente", activa: "bg-superficie text-texto shadow-tarjeta" },
  { valor: "1", etiqueta: "Confirmada", activa: "bg-nocumple-suave text-nocumple shadow-[inset_0_0_0_1px_var(--nocumple)]" },
  { valor: "0", etiqueta: "Descartada", activa: "bg-noeval-suave text-noeval shadow-[inset_0_0_0_1px_var(--noeval)]" },
];

function Decision({ columna, valor, onChange }) {
  const nombre = `decision-${clave(columna)}`;
  const yaDecidida = aValor(columna.confirmada) !== "";
  return (
    <fieldset>
      <legend className="sr-only">Decisión para {clave(columna)}</legend>
      <div className="inline-flex gap-0.5 rounded-lg bg-superficie-2 p-0.5 shadow-[inset_0_0_0_1px_var(--linea)]">
        {DECISIONES.map((d) => {
          const desactivada = d.valor === "" && yaDecidida;
          const activa = valor === d.valor;
          return (
            <label
              key={d.valor}
              className={`inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento ${
                activa ? d.activa : "text-texto-3"
              } ${desactivada ? "cursor-not-allowed opacity-40" : activa ? "cursor-default" : "cursor-pointer hover:text-texto"}`}
            >
              <input
                type="radio"
                name={nombre}
                value={d.valor}
                checked={activa}
                disabled={desactivada}
                onChange={() => onChange(d.valor)}
                className="sr-only"
              />
              {d.etiqueta}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Descubrimiento() {
  const { empresa, claves } = useEmpresa();
  const guardadas = useCarga(() => api.descubrimiento(empresa.id), [empresa.id]);
  const descubrir = useAccion(useCallback(() => api.descubrir(empresa.id, claves), [empresa.id, claves]));
  const guardar = useAccion(useCallback((cuerpoPeticion) => api.confirmarDescubrimiento(empresa.id, cuerpoPeticion), [empresa.id]));
  const [decisiones, setDecisiones] = useState({});
  const [filtro, setFiltro] = useState("todas");

  const columnas = guardadas.datos ?? [];
  const valorDe = (c) => decisiones[clave(c)] ?? aValor(c.confirmada);
  const cambios = columnas.filter((c) => decisiones[clave(c)] !== undefined && decisiones[clave(c)] !== aValor(c.confirmada));

  async function ejecutarDescubrimiento() {
    const resultado = await descubrir.ejecutar();
    if (resultado) {
      setDecisiones({});
      guardadas.recargar();
    }
  }

  async function guardarDecisiones() {
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

  const cuenta = (v) => columnas.filter((c) => valorDe(c) === v).length;
  const visibles = columnas.filter((c) => filtro === "todas" || valorDe(c) === filtro);

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Descubrimiento de datos sensibles"
        ayuda="descubrimiento"
        descripcion="Encuentra columnas sensibles solo por su nombre y tipo; no lee ningún dato. Lo que confirmas o descartas alimenta la clasificación (A5.12) y los observables de enmascarado, cifrado, VPD y auditoría."
        acciones={
          <button type="button" onClick={ejecutarDescubrimiento} disabled={descubrir.cargando} className={boton}>
            <ScanSearch aria-hidden="true" className="size-4" />
            {descubrir.cargando ? "Descubriendo…" : "Descubrir ahora"}
          </button>
        }
      />

      <Aviso tono="error">{descubrir.error || guardar.error || guardadas.error}</Aviso>
      {descubrir.resultado && (
        <Aviso tono="info" titulo="Descubrimiento terminado">
          Esquemas de negocio encontrados:{" "}
          {descubrir.resultado.esquemas.map((e) => `${e.esquema} (${e.tablas} tablas)`).join(", ") || "ninguno"}.
        </Aviso>
      )}
      {guardadas.cargando && !guardadas.datos && <Cargando />}

      {columnas.length === 0 && !guardadas.cargando && (
        <Vacio icono={ScanSearch} titulo="Todavía no hay columnas descubiertas">
          Pulsa «Descubrir ahora». El instrumento busca nombres como CEDULA, SALARIO o DIAGNOSTICO en el diccionario de datos.
        </Vacio>
      )}

      {columnas.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-texto-2">
              <span className="font-semibold text-texto tabular">{columnas.length}</span> columnas encontradas. Lo pendiente se audita como sensible hasta que se descarte.
            </p>
            <Segmentado
              etiqueta="Filtrar columnas por decisión"
              nombre="filtro-decision"
              valor={filtro}
              onChange={setFiltro}
              opciones={[
                { valor: "todas", etiqueta: "Todas", cuenta: columnas.length },
                { valor: "", etiqueta: "Pendientes", cuenta: cuenta("") },
                { valor: "1", etiqueta: "Confirmadas", cuenta: cuenta("1") },
                { valor: "0", etiqueta: "Descartadas", cuenta: cuenta("0") },
              ]}
            />
          </div>
          <div className={contenedorTabla}>
            <table className={tabla}>
              <thead className={cabecera}>
                <tr>
                  {["Columna", "Tipo", "Categoría", "Nivel", "Decisión"].map((titulo) => (
                    <th key={titulo} scope="col" className={th}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cuerpo}>
                {visibles.map((c) => {
                  const cambiada = decisiones[clave(c)] !== undefined && decisiones[clave(c)] !== aValor(c.confirmada);
                  return (
                    <tr key={clave(c)} className={cambiada ? "bg-acento-suave/40" : ""}>
                      <td className={`${td} font-mono text-[0.8125rem]`}>
                        <span className="text-texto-3">
                          {c.esquema}.{c.tabla}.
                        </span>
                        <span className="font-semibold text-texto">{c.columna}</span>
                      </td>
                      <td className={`${td} font-mono text-xs text-texto-2`}>{c.tipo_dato}</td>
                      <td className={td}>{c.categoria}</td>
                      <td className={`${td} text-texto-2`}>{c.nivel}</td>
                      <td className={`${td} py-2`}>
                        <Decision columna={c} valor={valorDe(c)} onChange={(v) => setDecisiones((previo) => ({ ...previo, [clave(c)]: v }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cambios.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-superficie px-5 py-3 shadow-flotante">
          <p className="text-sm">
            <span className="font-semibold tabular">{cambios.length}</span> {cambios.length === 1 ? "decisión sin guardar" : "decisiones sin guardar"}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDecisiones({})} className={botonSecundario}>
              Deshacer
            </button>
            <button type="button" onClick={guardarDecisiones} disabled={guardar.cargando} className={boton}>
              {guardar.cargando ? "Guardando…" : "Guardar decisiones"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
