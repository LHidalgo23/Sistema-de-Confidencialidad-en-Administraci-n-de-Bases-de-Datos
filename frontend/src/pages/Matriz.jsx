import { Download, Gauge, Printer, Table2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label as LineLabel,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import EstadoBadge from "../components/EstadoBadge";
import { ESTADOS, ORDEN_ESTADOS, estadoDeMadurez, etiquetaEjecucion } from "../components/estados";
import { botonSecundario, cabeceraFija, campo, contenedorTablaCorta, cuerpo, enlace, etiquetaCampo, tabla, td, th } from "../components/estilos";
import { Encabezado, Seccion, Segmentado, Vacio } from "../components/ui";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";
import { descargarCsv } from "../lib/exportar";

const VISTAS = [
  { valor: "actual", etiqueta: "Estado actual" },
  { valor: "antesDespues", etiqueta: "Antes y después" },
  { valor: "evolucion", etiqueta: "Evolución" },
  { valor: "detalle", etiqueta: "Detalle por evaluación" },
];

const thMatriz = "px-3 py-2 text-left text-[0.8125rem] font-semibold whitespace-nowrap text-texto-2";
const sombraFlotante = { boxShadow: "var(--sombra-flotante)" };

function masRecienteDe(ejecuciones) {
  if (!ejecuciones.length) return null;
  return ejecuciones.reduce((mejor, e) => (new Date(e.iniciada_en) > new Date(mejor.iniciada_en) ? e : mejor));
}

/**
 * Forma de barra tipo «lollipop»: una línea delgada desde 0 hasta el valor, con un punto al final.
 * A diferencia de una barra sólida, el punto sigue visible incluso cuando el valor es 0.
 * `colorDe` recibe la fila de datos (payload) y devuelve el color de esa línea/punto.
 */
function formaLollipop(colorDe) {
  return function LollipopHorizontal(props) {
    const { x, y, width, height, payload } = props;
    const color = colorDe(payload) ?? "var(--noeval)";
    const cy = y + height / 2;
    const cx = x + width;
    const radio = Math.min(height / 2, 6);
    return (
      <g>
        <line x1={x} y1={cy} x2={cx} y2={cy} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={radio} fill={color} stroke="var(--superficie)" strokeWidth={1.5} />
      </g>
    );
  };
}

/** Punto coloreado reutilizable para el `dot` de `<Line>`. `colorDe` recibe el payload de esa fila. */
function puntoColoreado(colorDe) {
  return function PuntoColoreado(props) {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    return <circle cx={cx} cy={cy} r={5} fill={colorDe(payload) ?? "var(--noeval)"} stroke="var(--superficie)" strokeWidth={2} />;
  };
}

/**
 * Línea suavizada genérica: una serie, interpolación «monotone» (no se pasa de los valores reales,
 * a diferencia de una curva spline libre), con el punto de cada categoría coloreado por su estado.
 * Las 19 categorías van en diagonal en el eje X para que quepan todas sin encimarse.
 */
/**
 * `series`: [{ dataKey, nombre, colorDe, stroke? }]. Una fila por serie; varias series comparten
 * el mismo eje X y quedan distinguidas por el color de su línea (el punto de cada una sigue
 * coloreado por estado, no por serie, para no mezclar los dos canales de color).
 */
function GraficoLineasSuaves({ datos, ejeKey, series, dominio, tooltipContent, etiquetaAria }) {
  return (
    <div className="h-96" role="img" aria-label={etiquetaAria}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ left: -12, right: 16, top: 8, bottom: 44 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--linea)" vertical={false} />
          <XAxis
            dataKey={ejeKey}
            tick={{ fontSize: 10, fill: "var(--texto-3)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--linea)" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={56}
          />
          <YAxis domain={dominio} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={false} />
          <Tooltip content={tooltipContent} />
          <Legend verticalAlign="bottom" align="left" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--texto-2)", paddingTop: 8 }} />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              name={s.nombre}
              dataKey={s.dataKey}
              type="monotone"
              stroke={s.stroke ?? "var(--acento)"}
              strokeWidth={2}
              dot={puntoColoreado(s.colorDe)}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Botones de exportar que se repiten en cada vista de Resultados. «Exportar PDF» es el diálogo de
 * impresión del navegador (window.print), que ya ofrece «Guardar como PDF» sin sumar una librería;
 * los controles interactivos de alrededor se ocultan en esa impresión con la clase evitar-imprimir.
 */
function AccionesExportar({ onCsv, etiquetaCsv = "Exportar CSV" }) {
  return (
    <div className="evitar-imprimir flex flex-wrap gap-2">
      <button type="button" onClick={onCsv} className={botonSecundario}>
        <Download aria-hidden="true" className="size-4" />
        {etiquetaCsv}
      </button>
      <button type="button" onClick={() => window.print()} className={botonSecundario}>
        <Printer aria-hidden="true" className="size-4" />
        Exportar PDF
      </button>
    </div>
  );
}

/** Leyenda con ícono y texto por estado: el color nunca es la única pista. */
function LeyendaEstados({ estados = ORDEN_ESTADOS }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {estados.map((estado) => (
        <EstadoBadge key={estado} estado={estado} />
      ))}
    </div>
  );
}

/** Tarjetas KPI: madurez promedio y el reparto por estado de una ejecución. Mismos datos que el Dashboard. */
function TarjetasEjecucion({ ejecucion }) {
  const total = ejecucion.controles.length;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-linea shadow-tarjeta sm:grid-cols-[1.3fr_repeat(4,1fr)]">
      <div className="col-span-2 bg-superficie px-5 py-4 sm:col-span-1">
        <p className="flex items-center gap-1.5 text-sm text-texto-3">
          <Gauge aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Madurez general
        </p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[2.5rem] leading-none font-bold tracking-tight tabular">{ejecucion.madurez_promedio ?? "—"}</span>
          <span className="text-texto-3">de 4</span>
        </p>
        <p className="mt-2 text-xs text-texto-3">
          Sobre los controles con madurez calculable ({total - ejecucion.conteo_controles["No evaluable"]} de {total})
        </p>
      </div>
      {ORDEN_ESTADOS.map((estado) => {
        const { icono: Icono, clase } = ESTADOS[estado];
        return (
          <div key={estado} className="bg-superficie px-5 py-4">
            <p className="flex items-center gap-1.5 text-sm text-texto-2">
              <span className={`grid size-5 place-items-center rounded-full ${clase}`}>
                <Icono aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
              </span>
              {estado}
            </p>
            <p className="mt-2 text-[1.75rem] leading-none font-bold tabular">{ejecucion.conteo_controles[estado]}</p>
            <p className="mt-1 text-xs text-texto-3">controles</p>
          </div>
        );
      })}
    </div>
  );
}

function datosControles(ejecucion) {
  return ejecucion.controles.map((c) => ({
    control_id: c.control_id,
    nombre: c.nombre,
    madurez: c.madurez ?? 0,
    madurezReal: c.madurez,
    estado: c.estado,
    cobertura: c.cobertura,
  }));
}

function TooltipControl({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={sombraFlotante} className="rounded-lg bg-superficie px-3 py-2 text-xs">
      <p className="font-semibold text-texto">
        {d.control_id} · {d.nombre}
      </p>
      <p className="mt-1 text-texto-2">Madurez: {d.madurezReal === null || d.madurezReal === undefined ? "sin calcular" : `${d.madurezReal} de 4`}</p>
      <p className="text-texto-2">Estado: {d.estado}</p>
      <p className="text-texto-2">Cobertura: {Math.round(d.cobertura * 100)} %</p>
    </div>
  );
}

/** Barras horizontales (o línea suavizada) de madurez por control, coloreadas por estado, con tabla accesible debajo. */
function GraficoControles({ ejecucion, vista = "lineas", onControlClick }) {
  const datos = datosControles(ejecucion);
  const alto = Math.max(320, datos.length * 28);
  return (
    <div className="space-y-4">
      <figure className="rounded-xl bg-superficie px-3 pt-5 pb-3 shadow-tarjeta">
        {vista === "curvas" ? (
          <GraficoLineasSuaves
            datos={datos}
            ejeKey="control_id"
            series={[{ dataKey: "madurez", nombre: "Nivel de cumplimiento", colorDe: (d) => ESTADOS[d.estado]?.color }]}
            dominio={[0, 4]}
            tooltipContent={<TooltipControl />}
            etiquetaAria="Línea suavizada: madurez por control, coloreada por estado"
          />
        ) : (
          <div style={{ height: alto }} role="img" aria-label="Gráfico de líneas: madurez por control, coloreado por estado">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--linea)" horizontal={false} />
                <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={{ stroke: "var(--linea)" }} />
                <YAxis dataKey="control_id" type="category" width={62} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--superficie-2)" }} content={<TooltipControl />} />
                <Bar dataKey="madurez" shape={formaLollipop((d) => ESTADOS[d.estado]?.color)} isAnimationActive={false}>
                  <LabelList dataKey="madurez" position="right" style={{ fontSize: 11, fill: "var(--texto-2)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <figcaption className="px-2 pt-2 text-xs text-texto-3">Escala 0-4. Un control sin madurez calculable se dibuja en el 0.</figcaption>
      </figure>
      <LeyendaEstados />
      <div className={contenedorTablaCorta}>
        <table className={tabla}>
          <thead className={cabeceraFija}>
            <tr>
              {["Control", "Nombre", "Madurez", "Estado"].map((t) => (
                <th key={t} scope="col" className={th}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cuerpo}>
            {datos.map((d) => (
              <tr key={d.control_id}>
                <td className={`${td} font-mono text-xs`}>
                  {onControlClick ? (
                    <button type="button" onClick={() => onControlClick(d.control_id)} className={enlace}>
                      {d.control_id}
                    </button>
                  ) : (
                    d.control_id
                  )}
                </td>
                <td className={td}>{d.nombre}</td>
                <td className={`${td} tabular`}>{d.madurezReal ?? "—"}</td>
                <td className={td}>
                  <EstadoBadge estado={d.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Vista 1: la ejecución más reciente, con sus tarjetas KPI y su gráfico de madurez. */
const OPCIONES_TIPO_GRAFICO = [
  { valor: "lineas", etiqueta: "Barras" },
  { valor: "curvas", etiqueta: "Líneas suavizadas" },
];

function VistaEstadoActual({ ejecuciones, onIrAControl }) {
  const masReciente = useMemo(() => masRecienteDe(ejecuciones), [ejecuciones]);
  const actual = useCarga(() => (masReciente ? api.ejecucion(masReciente.id) : Promise.resolve(null)), [masReciente?.id]);
  const ejecucion = actual.datos;
  const [vistaGrafico, setVistaGrafico] = useState("lineas");

  return (
    <div className="space-y-6">
      {actual.cargando && !ejecucion && <Cargando texto="Cargando la última ejecución…" />}
      <Aviso tono="error">{actual.error}</Aviso>
      {ejecucion && (
        <>
          <p className="text-sm text-texto-2">
            Ejecución <span className="font-semibold text-texto">#{ejecucion.id}</span>
            {ejecucion.etiqueta && <> con etiqueta «{ejecucion.etiqueta}»</>}, del {new Date(ejecucion.iniciada_en).toLocaleString()}
          </p>
          <TarjetasEjecucion ejecucion={ejecucion} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmentado
              etiqueta="Tipo de gráfico"
              nombre="estado-actual-vista-grafico"
              valor={vistaGrafico}
              onChange={setVistaGrafico}
              opciones={OPCIONES_TIPO_GRAFICO}
            />
            <AccionesExportar
              etiquetaCsv="Exportar CSV"
              onCsv={() =>
                descargarCsv(
                  `estado-actual_ejecucion-${ejecucion.id}.csv`,
                  [
                    ["control_id", "Control"],
                    ["nombre", "Nombre"],
                    ["madurezReal", "Madurez"],
                    ["estado", "Estado"],
                  ],
                  datosControles(ejecucion),
                )
              }
            />
          </div>
          <GraficoControles ejecucion={ejecucion} vista={vistaGrafico} onControlClick={(controlId) => onIrAControl(ejecucion.id, controlId)} />
        </>
      )}
    </div>
  );
}

function Criterio({ valor }) {
  if (valor === null || valor === undefined) return <span className="text-texto-3">—</span>;
  return (
    <span className="inline-grid size-7 place-items-center rounded-md bg-superficie-2 font-semibold tabular shadow-[inset_0_0_0_1px_var(--linea)]">
      {valor}
    </span>
  );
}

function datosComparacion(antes, despues) {
  const antesPorControl = Object.fromEntries(antes.controles.map((c) => [c.control_id, c]));
  return despues.controles.map((c) => {
    const a = antesPorControl[c.control_id];
    return {
      control: c.control_id,
      nombre: c.nombre,
      Antes: a?.madurez ?? 0,
      Después: c.madurez ?? 0,
      antesReal: a?.madurez ?? null,
      despuesReal: c.madurez,
      antesEstado: a?.estado ?? "No evaluable",
      despuesEstado: c.estado,
    };
  });
}

function TooltipComparacion({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const diferencia = d.antesReal !== null && d.despuesReal !== null && d.despuesReal !== undefined ? d.despuesReal - d.antesReal : null;
  return (
    <div style={sombraFlotante} className="rounded-lg bg-superficie px-3 py-2 text-xs">
      <p className="font-semibold text-texto">
        {label} · {d.nombre}
      </p>
      <p className="mt-1 text-texto-2">
        Antes: {d.antesReal ?? "sin calcular"} · {d.antesEstado}
      </p>
      <p className="text-texto-2">
        Después: {d.despuesReal ?? "sin calcular"} · {d.despuesEstado}
      </p>
      {diferencia !== null && (
        <p className="text-texto-2">
          Diferencia: {diferencia > 0 ? "+" : ""}
          {diferencia}
        </p>
      )}
    </div>
  );
}

/** Vista 2: compara 2 ejecuciones con un gráfico de barras y la matriz de evaluación detallada. */
function VistaAntesDespues({ empresaId, ejecuciones, onIrAControl }) {
  const [seleccion, setSeleccion] = useState({ antes: null, despues: null });
  const [filtro, setFiltro] = useState("");
  const [vistaGrafico, setVistaGrafico] = useState("lineas");
  const idDespues = seleccion.despues ?? ejecuciones[0]?.id ?? null;
  const idAntes = seleccion.antes ?? ejecuciones[1]?.id ?? ejecuciones[0]?.id ?? null;
  const cambiar = (clave) => (e) => setSeleccion((p) => ({ ...p, [clave]: Number(e.target.value) }));
  const opciones = ejecuciones.map((e) => (
    <option key={e.id} value={e.id}>
      {etiquetaEjecucion(e)}
    </option>
  ));

  const comparada = useCarga(async () => {
    if (!idAntes || !idDespues || idAntes === idDespues) return null;
    const [antes, despues] = await Promise.all([api.ejecucion(idAntes), api.ejecucion(idDespues)]);
    return { antes, despues };
  }, [idAntes, idDespues]);
  const grafico = useMemo(() => (comparada.datos ? datosComparacion(comparada.datos.antes, comparada.datos.despues) : null), [comparada.datos]);

  const matriz = useCarga(() => api.matriz(empresaId, idAntes, idDespues), [empresaId, idAntes, idDespues]);
  const datos = matriz.datos;
  const todas = datos?.filas ?? [];
  const estadoFinal = (f) => f.estado_despues ?? f.estado_antes;
  const filas = todas.filter((f) => !filtro || estadoFinal(f) === filtro);
  const hayDespues = Boolean(datos?.despues);

  return (
    <div className="space-y-6">
      <div className="evitar-imprimir flex flex-wrap items-end justify-between gap-4 rounded-xl bg-superficie px-5 py-4 shadow-tarjeta">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className={etiquetaCampo}>Ejecución «antes»</span>
            <select value={idAntes ?? ""} onChange={cambiar("antes")} className={`${campo} w-auto max-w-72`}>
              {opciones}
            </select>
          </label>
          <label className="text-sm">
            <span className={etiquetaCampo}>Ejecución «después»</span>
            <select value={idDespues ?? ""} onChange={cambiar("despues")} className={`${campo} w-auto max-w-72`}>
              {opciones}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={api.urlMatrizCsv(empresaId, idAntes, idDespues)} className={botonSecundario}>
            <Download aria-hidden="true" className="size-4" />
            Exportar CSV
          </a>
          <button type="button" onClick={() => window.print()} className={botonSecundario}>
            <Printer aria-hidden="true" className="size-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {idAntes && idDespues && (
        <p className="text-sm text-texto-2">
          Comparando la ejecución <span className="font-semibold text-texto">#{idAntes}</span> (antes) con la{" "}
          <span className="font-semibold text-texto">#{idDespues}</span> (después).
        </p>
      )}

      {idAntes === idDespues && <p className="text-sm text-texto-3">Elige dos ejecuciones distintas para ver el gráfico de comparación.</p>}
      {comparada.cargando && idAntes !== idDespues && <Cargando texto="Calculando la comparación…" />}
      <Aviso tono="error">{comparada.error}</Aviso>
      {grafico && (
        <>
          <Segmentado
            etiqueta="Tipo de gráfico"
            nombre="antes-despues-vista-grafico"
            valor={vistaGrafico}
            onChange={setVistaGrafico}
            opciones={OPCIONES_TIPO_GRAFICO}
          />
          <figure className="rounded-xl bg-superficie px-3 pt-5 pb-3 shadow-tarjeta">
            {vistaGrafico === "curvas" ? (
              <GraficoLineasSuaves
                datos={grafico}
                ejeKey="control"
                series={[
                  { dataKey: "Antes", nombre: "Antes", stroke: "var(--linea-fuerte)", colorDe: (d) => ESTADOS[d.antesEstado]?.color },
                  { dataKey: "Después", nombre: "Después", stroke: "var(--acento)", colorDe: (d) => ESTADOS[d.despuesEstado]?.color },
                ]}
                dominio={[0, 4]}
                tooltipContent={<TooltipComparacion />}
                etiquetaAria="Línea suavizada: madurez por control, antes y después, coloreada por estado"
              />
            ) : (
              <div
                style={{ height: Math.max(360, grafico.length * 48) }}
                role="img"
                aria-label="Gráfico de líneas: madurez por control, antes y después, coloreado por estado"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico} layout="vertical" barGap={2} margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--linea)" horizontal={false} />
                    <XAxis type="number" domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={{ stroke: "var(--linea)" }} />
                    <YAxis dataKey="control" type="category" width={62} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "var(--superficie-2)" }} content={<TooltipComparacion />} />
                    {/* Sin animación: el gráfico se usa en capturas de evidencia y debe verse completo al instante. */}
                    <Bar dataKey="Antes" shape={formaLollipop((d) => ESTADOS[d.antesEstado]?.color)} isAnimationActive={false}>
                      <LabelList dataKey="Antes" position="right" style={{ fontSize: 11, fill: "var(--texto-2)" }} />
                    </Bar>
                    <Bar dataKey="Después" shape={formaLollipop((d) => ESTADOS[d.despuesEstado]?.color)} isAnimationActive={false}>
                      <LabelList dataKey="Después" position="right" style={{ fontSize: 11, fill: "var(--texto-2)" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <figcaption className="px-2 pt-2 text-xs text-texto-3">
              Escala 0-4. {vistaGrafico === "curvas" ? "La línea gris es «antes», la azul es «después»" : "Por control, la barra superior es «antes» y la inferior es «después»"}{" "}
              (ver el detalle en el tooltip). Un control sin madurez calculable se dibuja en 0.
            </figcaption>
            <div className="px-2 pt-2">
              <LeyendaEstados />
            </div>
          </figure>
        </>
      )}

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
                    <th scope="row" className={`${td} sticky left-0 min-w-32 bg-superficie text-left font-semibold`}>
                      <button type="button" onClick={() => onIrAControl(idDespues, f.control_id)} className={enlace}>
                        {f.control}
                      </button>
                    </th>
                    <td className={`${td} min-w-24 text-[0.8125rem] text-texto-2`}>{f.tarea}</td>
                    <td className={`${td} font-mono text-xs whitespace-nowrap text-texto-2`}>{f.riesgo}</td>
                    <td className={`${td} min-w-40 max-w-xs text-[0.8125rem]`}>{f.hallazgo}</td>
                    <td className={`${td} border-l border-linea`}>
                      <Criterio valor={f.criterio_antes} />
                    </td>
                    <td className={td}>
                      <EstadoBadge estado={f.estado_antes} />
                    </td>
                    <td className={`${td} min-w-24 border-l border-linea text-[0.8125rem] text-texto-2`}>{f.correctivo_aplicado}</td>
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

function TooltipEvolucion({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={sombraFlotante} className="rounded-lg bg-superficie px-3 py-2 text-xs">
      <p className="font-semibold text-texto">
        #{d.id}
        {d.etiqueta ? ` · ${d.etiqueta}` : ""}
      </p>
      <p className="mt-1 text-texto-2">{new Date(d.iniciada_en).toLocaleString()}</p>
      <p className="text-texto-2">Madurez: {d.madurezPromedio === null ? "sin calcular" : `${d.madurezPromedio} de 4`}</p>
      <p className="text-texto-2">Estado: {d.estadoGeneral}</p>
    </div>
  );
}

const PuntoEvolucion = puntoColoreado((payload) => ESTADOS[payload.estadoGeneral]?.color);

/** Vista 3: línea de tiempo de la madurez general en todas las ejecuciones, con el historial debajo. */
function VistaEvolucion({ ejecuciones }) {
  const idsKey = ejecuciones.map((e) => e.id).join(",");
  const detalle = useCarga(() => Promise.all(ejecuciones.map((e) => api.ejecucion(e.id))), [idsKey]);

  const puntos = useMemo(() => {
    if (!detalle.datos) return null;
    const mapa = Object.fromEntries(detalle.datos.map((e) => [e.id, e.madurez_promedio ?? null]));
    return [...ejecuciones]
      .sort((a, b) => new Date(a.iniciada_en) - new Date(b.iniciada_en))
      .map((e) => ({
        id: e.id,
        etiqueta: e.etiqueta,
        iniciada_en: e.iniciada_en,
        etiquetaEje: `#${e.id}`,
        madurezPromedio: mapa[e.id] ?? null,
        estadoGeneral: estadoDeMadurez(mapa[e.id]),
      }));
  }, [detalle.datos, ejecuciones]);

  return (
    <div className="space-y-6">
      {detalle.cargando && !puntos && <Cargando texto="Calculando la evolución…" />}
      <Aviso tono="error">{detalle.error}</Aviso>
      {puntos && (
        <figure className="rounded-xl bg-superficie px-3 pt-5 pb-3 shadow-tarjeta">
          <div className="h-80" role="img" aria-label="Línea de tiempo: madurez general por ejecución, coloreada por estado">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={puntos} margin={{ left: -12, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--linea)" vertical={false} />
                <XAxis
                  dataKey="etiquetaEje"
                  tick={{ fontSize: 11, fill: "var(--texto-3)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--linea)" }}
                >
                  {puntos.length === 1 && <LineLabel value="Una sola ejecución: no hay tendencia que trazar" position="top" fill="var(--texto-3)" fontSize={11} />}
                </XAxis>
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipEvolucion />} />
                <Line dataKey="madurezPromedio" stroke="var(--acento)" strokeWidth={2} dot={<PuntoEvolucion />} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-3 px-2 pt-2 text-xs text-texto-3">
            <span>Escala 0-4. El color de cada punto sigue el estado general de esa ejecución.</span>
            <LeyendaEstados estados={["Cumple", "Parcial", "No cumple"]} />
          </figcaption>
        </figure>
      )}

      <Seccion
        titulo="Historial de evaluaciones"
        descripcion="Cada observación queda guardada con su fecha y su versión de Oracle."
        acciones={
          puntos && (
            <AccionesExportar
              onCsv={() => {
                const porId = Object.fromEntries(puntos.map((p) => [p.id, p]));
                descargarCsv(
                  "evolucion.csv",
                  [
                    ["id", "Ejecución"],
                    ["etiqueta", "Etiqueta"],
                    ["iniciada_en", "Fecha"],
                    ["version_oracle", "Oracle"],
                    ["con_hallazgos", "Observables con hallazgos"],
                    ["revisada_por", "Revisión"],
                    ["madurezPromedio", "Madurez promedio"],
                    ["estadoGeneral", "Estado general"],
                  ],
                  ejecuciones.map((e) => ({
                    ...e,
                    madurezPromedio: porId[e.id]?.madurezPromedio ?? "",
                    estadoGeneral: porId[e.id]?.estadoGeneral ?? "",
                  })),
                );
              }}
            />
          )
        }
      >
        <div className={contenedorTablaCorta}>
          <table className={tabla}>
            <thead className={cabeceraFija}>
              <tr>
                {["Ejecución", "Etiqueta", "Fecha", "Oracle", "Observables con hallazgos", "Revisión"].map((titulo) => (
                  <th key={titulo} scope="col" className={th}>
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cuerpo}>
              {ejecuciones.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} font-mono font-medium`}>#{e.id}</td>
                  <td className={td}>{e.etiqueta || "—"}</td>
                  <td className={`${td} whitespace-nowrap text-texto-2`}>{new Date(e.iniciada_en).toLocaleString()}</td>
                  <td className={`${td} text-texto-2`}>{e.version_oracle}</td>
                  <td className={`${td} tabular`}>{e.con_hallazgos}</td>
                  <td className={`${td} text-texto-2`}>{e.revisada_por ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
    </div>
  );
}

/**
 * `controlResaltado`: { controlId, ts } | null. Al llegar desde «Estado actual» o «Antes y después»
 * hace scroll hasta los observables de ese control y los resalta; el resalte se apaga solo con una
 * animación CSS (fila-destacada en index.css), sin temporizador de React.
 */
function TablaObservablesDetalle({ ejecucion, empresaId, controlResaltado }) {
  const filaResaltada = useRef(null);
  const indicePrimeraResaltada = controlResaltado
    ? ejecucion.observables.findIndex((o) => o.control_iso === controlResaltado.controlId)
    : -1;

  useEffect(() => {
    if (controlResaltado && filaResaltada.current) {
      filaResaltada.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [controlResaltado]);

  return (
    <div className={contenedorTablaCorta}>
      <table className={tabla}>
        <thead className={cabeceraFija}>
          <tr>
            {["Observable", "Control", "Qué revisa", "Estado", "Hallazgos"].map((t) => (
              <th key={t} scope="col" className={th}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cuerpo}>
          {ejecucion.observables.map((o, i) => {
            const activo = controlResaltado?.controlId === o.control_iso;
            const ref = i === indicePrimeraResaltada ? filaResaltada : null;
            return (
              <tr key={o.obs_id} ref={ref} className={activo ? "fila-destacada" : undefined}>
                <td className={`${td} font-mono text-xs whitespace-nowrap`}>
                  <Link to={`/empresas/${empresaId}/hallazgos/${o.obs_id}?ejecucion=${ejecucion.id}`} className={enlace}>
                    {o.obs_id}
                  </Link>
                </td>
                <td className={`${td} font-mono text-xs`}>{o.control_iso}</td>
                <td className={`${td} min-w-56`}>
                  {o.nombre}
                  {o.motivo && <span className="mt-0.5 block text-xs text-texto-3">{o.motivo}</span>}
                </td>
                <td className={td}>
                  <EstadoBadge estado={o.estado} />
                </td>
                <td className={`${td} text-right tabular`}>{o.hallazgos}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Severidad por cantidad de hallazgos (no el estado real del observable, que para un observable
 * individual nunca es «Parcial»): 0 hallazgos es verde, de 1 a 4 es ámbar, 5 o más es rojo.
 * Un observable «No evaluable» se queda gris: no sabemos su cantidad real de hallazgos.
 */
function severidadPorHallazgos(o) {
  if (o.estado === "No evaluable") return "No evaluable";
  if (o.hallazgos === 0) return "Cumple";
  if (o.hallazgos < 5) return "Parcial";
  return "No cumple";
}

/** Leyenda propia de la severidad por hallazgos: mismos colores del semáforo, otro texto. */
function LeyendaHallazgos() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <EstadoBadge estado="Cumple" etiqueta="0 hallazgos" />
      <EstadoBadge estado="Parcial" etiqueta="1 a 4 hallazgos" />
      <EstadoBadge estado="No cumple" etiqueta="5 o más hallazgos" />
      <EstadoBadge estado="No evaluable" etiqueta="No evaluable" />
    </div>
  );
}

function TooltipObservable({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={sombraFlotante} className="rounded-lg bg-superficie px-3 py-2 text-xs">
      <p className="font-semibold text-texto">
        {d.obs_id} · {d.nombre}
      </p>
      <p className="mt-1 text-texto-2">Hallazgos: {d.hallazgos}</p>
      <p className="text-texto-2">Estado: {d.estado}</p>
    </div>
  );
}

/** Líneas horizontales (o línea suavizada) de hallazgos por observable, coloreadas por rango de hallazgos, con tabla accesible debajo. */
function GraficoObservables({ ejecucion, vista = "lineas", empresaId, controlResaltado }) {
  const datos = ejecucion.observables.map((o) => ({
    obs_id: o.obs_id,
    nombre: o.nombre,
    hallazgos: o.hallazgos,
    estado: o.estado,
    severidad: severidadPorHallazgos(o),
  }));
  const alto = Math.max(320, datos.length * 28);
  const maxHallazgos = Math.max(1, ...datos.map((d) => d.hallazgos));
  const colorDe = (d) => ESTADOS[d.severidad]?.color;
  return (
    <div className="space-y-4">
      <figure className="rounded-xl bg-superficie px-3 pt-5 pb-3 shadow-tarjeta">
        {vista === "curvas" ? (
          <GraficoLineasSuaves
            datos={datos}
            ejeKey="obs_id"
            series={[{ dataKey: "hallazgos", nombre: "Hallazgos por observable", colorDe }]}
            dominio={[0, maxHallazgos]}
            tooltipContent={<TooltipObservable />}
            etiquetaAria="Línea suavizada: hallazgos por observable, coloreada por severidad"
          />
        ) : (
          <div style={{ height: alto }} role="img" aria-label="Gráfico de líneas: hallazgos por observable, coloreado por severidad">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--linea)" horizontal={false} />
                <XAxis type="number" domain={[0, maxHallazgos]} allowDecimals={false} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={{ stroke: "var(--linea)" }} />
                <YAxis dataKey="obs_id" type="category" width={62} tick={{ fontSize: 11, fill: "var(--texto-3)" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--superficie-2)" }} content={<TooltipObservable />} />
                <Bar dataKey="hallazgos" shape={formaLollipop(colorDe)} isAnimationActive={false}>
                  <LabelList dataKey="hallazgos" position="right" style={{ fontSize: 11, fill: "var(--texto-2)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <figcaption className="px-2 pt-2 text-xs text-texto-3">
          Cantidad de hallazgos por observable. 0 es verde, de 1 a 4 es ámbar, 5 o más es rojo.
        </figcaption>
      </figure>
      <LeyendaHallazgos />
      <TablaObservablesDetalle ejecucion={ejecucion} empresaId={empresaId} controlResaltado={controlResaltado} />
    </div>
  );
}

/** Vista 4: controles u observables de una sola ejecución elegida, no necesariamente la más reciente. */
function VistaDetalle({ ejecuciones, ejecucionIdInicial, empresaId, focoControl }) {
  const [seleccionada, setSeleccionada] = useState(ejecucionIdInicial ?? ejecuciones[0]?.id ?? null);
  const [tipo, setTipo] = useState("controles");
  const [vistaGrafico, setVistaGrafico] = useState("lineas");
  const [controlResaltado, setControlResaltado] = useState(null);
  const detalle = useCarga(() => (seleccionada ? api.ejecucion(seleccionada) : Promise.resolve(null)), [seleccionada]);
  const ejecucion = detalle.datos;

  // Llegada desde «Estado actual» o «Antes y después»: cambia a esa ejecución y a Observables.
  // Sincroniza un prop externo (foco de otra vista) con 3 piezas de estado local; no hay forma
  // de derivarlo solo durante el render.
  useEffect(() => {
    if (!focoControl) return;
    // oxlint-disable-next-line react/set-state-in-effect
    setSeleccionada(focoControl.ejecucionId);
    setTipo("observables");
    setControlResaltado({ controlId: focoControl.controlId, ts: focoControl.ts });
  }, [focoControl]);

  function manejarClicControl(controlId) {
    setTipo("observables");
    setControlResaltado({ controlId, ts: Date.now() });
  }

  return (
    <div className="space-y-6">
      <label className="evitar-imprimir text-sm">
        <span className={etiquetaCampo}>Ejecución</span>
        <select value={seleccionada ?? ""} onChange={(e) => setSeleccionada(Number(e.target.value))} className={`${campo} w-auto max-w-80`}>
          {ejecuciones.map((e) => (
            <option key={e.id} value={e.id}>
              {etiquetaEjecucion(e)}
            </option>
          ))}
        </select>
      </label>

      {detalle.cargando && !ejecucion && <Cargando texto="Cargando la ejecución…" />}
      <Aviso tono="error">{detalle.error}</Aviso>

      {ejecucion && (
        <>
          <p className="text-sm text-texto-2">
            Ejecución <span className="font-semibold text-texto">#{ejecucion.id}</span>
            {ejecucion.etiqueta && <> con etiqueta «{ejecucion.etiqueta}»</>}, del {new Date(ejecucion.iniciada_en).toLocaleString()}, Oracle {ejecucion.version_oracle}
          </p>
          <TarjetasEjecucion ejecucion={ejecucion} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmentado
              etiqueta="Qué mostrar"
              nombre="detalle-tipo"
              valor={tipo}
              onChange={setTipo}
              opciones={[
                { valor: "controles", etiqueta: "Controles" },
                { valor: "observables", etiqueta: "Observables" },
              ]}
            />
            <Segmentado
              etiqueta="Tipo de gráfico"
              nombre="detalle-vista-grafico"
              valor={vistaGrafico}
              onChange={setVistaGrafico}
              opciones={[
                { valor: "lineas", etiqueta: "Líneas" },
                { valor: "curvas", etiqueta: "Líneas suavizadas" },
              ]}
            />
            <AccionesExportar
              onCsv={() =>
                tipo === "controles"
                  ? descargarCsv(
                      `detalle-controles_ejecucion-${ejecucion.id}.csv`,
                      [
                        ["control_id", "Control"],
                        ["nombre", "Nombre"],
                        ["madurezReal", "Madurez"],
                        ["estado", "Estado"],
                      ],
                      datosControles(ejecucion),
                    )
                  : descargarCsv(
                      `detalle-observables_ejecucion-${ejecucion.id}.csv`,
                      [
                        ["obs_id", "Observable"],
                        ["control_iso", "Control"],
                        ["nombre", "Qué revisa"],
                        ["estado", "Estado"],
                        ["hallazgos", "Hallazgos"],
                      ],
                      ejecucion.observables,
                    )
              }
            />
          </div>
          {tipo === "controles" ? (
            <GraficoControles ejecucion={ejecucion} vista={vistaGrafico} onControlClick={manejarClicControl} />
          ) : (
            <GraficoObservables ejecucion={ejecucion} vista={vistaGrafico} empresaId={empresaId} controlResaltado={controlResaltado} />
          )}
        </>
      )}
    </div>
  );
}

export default function Resultados() {
  const { empresa, ejecuciones, ejecucionId } = useEmpresa();
  const [vista, setVista] = useState("actual");
  const [focoControl, setFocoControl] = useState(null);
  const hayEjecuciones = ejecuciones.length > 0;

  // Clic en un control (Estado actual o Antes y después): salta a Detalle > Observables de esa
  // misma ejecución y resalta sus observables. No hay página propia de detalle para un control.
  function irAObservablesDelControl(idEjecucion, controlId) {
    setFocoControl({ ejecucionId: idEjecucion, controlId, ts: Date.now() });
    setVista("detalle");
  }

  const encabezado = (
    <Encabezado
      titulo="Resultados de auditoría"
      ayuda="matriz"
      descripcion="Visualiza el estado actual, compara evaluaciones y analiza la evolución de madurez de los controles de confidencialidad."
    >
      {hayEjecuciones && (
        <div className="mt-4">
          <Segmentado etiqueta="Vista de resultados" nombre="vista-resultados" valor={vista} onChange={setVista} opciones={VISTAS} />
        </div>
      )}
    </Encabezado>
  );

  if (!hayEjecuciones)
    return (
      <div className="space-y-8">
        {encabezado}
        <Vacio icono={Table2} titulo="Los resultados se arman a partir de una ejecución">
          Observa la base desde el Dashboard con la etiqueta «antes». Después de corregir, vuelve a observar para llenar las columnas «después» y ver la evolución aquí.
        </Vacio>
      </div>
    );

  return (
    <div className="space-y-6">
      {encabezado}
      {vista === "actual" && <VistaEstadoActual ejecuciones={ejecuciones} onIrAControl={irAObservablesDelControl} />}
      {vista === "antesDespues" && (
        <VistaAntesDespues empresaId={empresa.id} ejecuciones={ejecuciones} onIrAControl={irAObservablesDelControl} />
      )}
      {vista === "evolucion" && <VistaEvolucion ejecuciones={ejecuciones} />}
      {vista === "detalle" && (
        <VistaDetalle ejecuciones={ejecuciones} ejecucionIdInicial={ejecucionId} empresaId={empresa.id} focoControl={focoControl} />
      )}
    </div>
  );
}
