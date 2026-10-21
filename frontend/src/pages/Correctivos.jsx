import { Download, FileCode2 } from "lucide-react";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { botonSecundario, codigo } from "../components/estilos";
import { BotonCopiar, Encabezado, Vacio } from "../components/ui";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

// Separación de funciones: lo que hace el DBA con el script, en orden.
const PASOS_DBA = [
  ["Revisar", "Leerlo completo y completar lo marcado (TDE, VPD, RMAN, sqlnet.ora)."],
  ["Probar", "Ejecutarlo primero en un ambiente que no sea producción."],
  ["Respaldar", "Tomar un respaldo antes de aplicarlo."],
  ["Aplicar", "Ejecutarlo bajo la gestión de cambios de la empresa."],
  ["Re-observar", "Volver a observar y comparar en la Matriz."],
];

export default function Correctivos() {
  const { ejecucionId } = useEmpresa();
  const script = useCarga(() => (ejecucionId ? api.correctivos(ejecucionId) : Promise.resolve(null)), [ejecucionId]);

  const encabezado = (
    <Encabezado
      titulo="Script correctivo"
      ayuda="correctivos"
      descripcion={
        ejecucionId
          ? `Todos los correctivos de la ejecución #${ejecucionId} en un solo archivo, ordenados por severidad. El instrumento observa y propone; no ejecuta.`
          : "Todos los correctivos de una ejecución en un solo archivo, ordenados por severidad."
      }
      acciones={
        script.datos && (
          <>
            <BotonCopiar texto={script.datos} />
            <a href={api.urlCorrectivos(ejecucionId)} className={botonSecundario}>
              <Download aria-hidden="true" className="size-4" />
              Descargar .sql
            </a>
          </>
        )
      }
    />
  );

  if (!ejecucionId)
    return (
      <div className="space-y-8">
        {encabezado}
        <Vacio icono={FileCode2} titulo="Aún no hay correctivos">
          Los correctivos salen de los hallazgos de una ejecución. Observa la base desde el Dashboard.
        </Vacio>
      </div>
    );

  return (
    <div className="space-y-6">
      {encabezado}

      <section aria-labelledby="titulo-pasos-dba" className="rounded-xl bg-superficie shadow-tarjeta">
        <h2 id="titulo-pasos-dba" className="border-b border-linea px-5 py-3 text-sm font-semibold">
          Qué hace el DBA con este script
        </h2>
        <ol className="grid gap-px bg-linea sm:grid-cols-5">
          {PASOS_DBA.map(([paso, detalle], i) => (
            <li key={paso} className="bg-superficie px-4 py-3">
              <p className="text-sm font-semibold">
                <span className="mr-1.5 text-texto-3 tabular">{i + 1}.</span>
                {paso}
              </p>
              <p className="mt-1 text-xs text-texto-2">{detalle}</p>
            </li>
          ))}
        </ol>
      </section>

      {script.cargando && !script.datos && <Cargando />}
      <Aviso tono="error">{script.error}</Aviso>
      {script.datos && <pre className={`${codigo} max-h-[70vh]`}>{script.datos}</pre>}
    </div>
  );
}
