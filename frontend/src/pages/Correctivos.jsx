import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { botonSecundario, codigo } from "../components/estilos";
import { useCarga } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

export default function Correctivos() {
  const { ejecucionId } = useEmpresa();
  const script = useCarga(() => (ejecucionId ? api.correctivos(ejecucionId) : Promise.resolve(null)), [ejecucionId]);

  if (!ejecucionId) return <Aviso>No hay ejecuciones. Observe la base desde el Dashboard.</Aviso>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Script correctivo consolidado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ejecución #{ejecucionId}, ordenado por severidad. Guárdelo en el repositorio de la empresa tras revisarlo.
          </p>
        </div>
        {script.datos && (
          <div className="flex gap-2">
            <button type="button" onClick={() => navigator.clipboard?.writeText(script.datos)} className={botonSecundario}>
              Copiar
            </button>
            <a href={api.urlCorrectivos(ejecucionId)} className={botonSecundario}>
              Descargar .sql
            </a>
          </div>
        )}
      </div>
      <Aviso tono="aviso">
        Separación de funciones: el instrumento observa y propone, no ejecuta. El DBA de la empresa revisa el script, lo completa donde
        haga falta (TDE, VPD, RMAN, sqlnet.ora), lo prueba en un ambiente no productivo, con respaldo previo, y lo aplica. Después se
        vuelve a observar.
      </Aviso>
      {script.cargando && !script.datos && <Cargando />}
      <Aviso tono="error">{script.error}</Aviso>
      {script.datos && <pre className={`${codigo} max-h-[70vh]`}>{script.datos}</pre>}
    </div>
  );
}
