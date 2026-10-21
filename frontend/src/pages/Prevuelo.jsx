import { CircleCheck, PlaneTakeoff, Server, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../api/client";
import Aviso from "../components/Aviso";
import { boton, botonSecundario, cabecera, campo, codigoEnLinea, contenedorTabla, cuerpo, etiquetaCampo, tabla, td, th } from "../components/estilos";
import { Encabezado, Ficha, Seccion, Vacio } from "../components/ui";
import { useAccion } from "../hooks/useCarga";
import { useEmpresa } from "../hooks/useEmpresa";

function Panel({ icono: Icono, titulo, children, descripcion }) {
  return (
    <section className="flex flex-col rounded-xl bg-superficie shadow-tarjeta">
      <div className="flex gap-3 border-b border-linea px-5 py-4">
        <Icono aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-texto-3" strokeWidth={1.75} />
        <div>
          <h2 className="font-semibold">{titulo}</h2>
          <div className="mt-1 text-sm text-texto-2">{descripcion}</div>
        </div>
      </div>
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

function ConexionInstancia({ empresa, alGuardar }) {
  const [formulario, setFormulario] = useState({
    dsn: empresa.dsn_instancia ?? "",
    usuario: empresa.usuario_instancia ?? "C##AUDITOR_ISO",
    password: "",
  });
  const guardar = useAccion(useCallback((datos) => api.configurarInstancia(empresa.id, datos), [empresa.id]));
  const quitar = useAccion(useCallback(() => api.quitarInstancia(empresa.id), [empresa.id]));
  const cambiar = (nombre) => (evento) => setFormulario((previo) => ({ ...previo, [nombre]: evento.target.value }));

  async function enviar(evento) {
    evento.preventDefault();
    const datos = { dsn: formulario.dsn, usuario: formulario.usuario, password: formulario.password || null };
    if (await guardar.ejecutar(datos)) {
      setFormulario((previo) => ({ ...previo, password: "" }));
      alGuardar();
    }
  }

  async function desactivar() {
    if (await quitar.ejecutar()) alGuardar();
  }

  return (
    <Panel
      icono={Server}
      titulo="Conexión de instancia (opcional)"
      descripcion={
        <>
          Respaldos, parámetros, password file, sesiones y parches no se ven desde una PDB. Con una conexión a{" "}
          <code className={codigoEnLinea}>CDB$ROOT</code> se observan de verdad; sin ella salen «No evaluable». El usuario se crea con{" "}
          <code className={codigoEnLinea}>onboarding_auditor_instancia.sql</code>.
        </>
      }
    >
      {empresa.instancia_configurada && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-cumple-suave px-3 py-2 text-sm text-texto">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cumple" />
          <span>
            Configurada: <span className="font-mono">{empresa.usuario_instancia}</span> en <span className="font-mono">{empresa.dsn_instancia}</span>.{" "}
            {empresa.credenciales_instancia_guardadas ? "Contraseña cifrada en reposo." : "La contraseña se pide al conectar."}
          </span>
        </p>
      )}
      <form onSubmit={enviar} className="space-y-3">
        <label className="block text-sm">
          <span className={etiquetaCampo}>Conexión al contenedor raíz</span>
          <input required value={formulario.dsn} onChange={cambiar("dsn")} placeholder="localhost:1521/XE" spellCheck={false} className={`${campo} font-mono`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className={etiquetaCampo}>Usuario de instancia</span>
            <input required value={formulario.usuario} onChange={cambiar("usuario")} spellCheck={false} className={`${campo} font-mono`} />
          </label>
          <label className="block text-sm">
            <span className={etiquetaCampo}>Contraseña (opcional)</span>
            <input type="password" autoComplete="off" value={formulario.password} onChange={cambiar("password")} className={campo} />
          </label>
        </div>
        <Aviso tono="error">{guardar.error || quitar.error}</Aviso>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={guardar.cargando} className={botonSecundario}>
            {guardar.cargando ? "Guardando…" : "Guardar conexión de instancia"}
          </button>
          {empresa.instancia_configurada && (
            <button type="button" onClick={desactivar} disabled={quitar.cargando} className={`${botonSecundario} text-nocumple`}>
              Quitar
            </button>
          )}
        </div>
      </form>
    </Panel>
  );
}

function PerfilPolitica({ empresa, alGuardar }) {
  const [texto, setTexto] = useState(() => JSON.stringify(empresa.perfil, null, 2));
  const [errorLocal, setErrorLocal] = useState(null);
  const guardar = useAccion(useCallback((perfil) => api.actualizarPerfil(empresa.id, perfil), [empresa.id]));

  async function enviar(evento) {
    evento.preventDefault();
    let perfil;
    try {
      perfil = JSON.parse(texto || "{}");
    } catch {
      setErrorLocal("El perfil debe ser un JSON válido.");
      return;
    }
    setErrorLocal(null);
    if (await guardar.ejecutar(perfil)) alGuardar();
  }

  return (
    <Panel
      icono={SlidersHorizontal}
      titulo="Perfil de política de la empresa"
      descripcion="Solo las claves que difieren del perfil por defecto (Catálogo, pestaña «Perfil por defecto»). Cambiar un umbral cambia el resultado sin tocar la base."
    >
      <form onSubmit={enviar} className="space-y-3">
        <textarea
          rows={9}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Perfil de política en JSON"
          spellCheck={false}
          className={`${campo} font-mono text-[0.8125rem]`}
        />
        <Aviso tono="error">{errorLocal || guardar.error}</Aviso>
        <button type="submit" disabled={guardar.cargando} className={botonSecundario}>
          {guardar.cargando ? "Guardando…" : "Guardar perfil"}
        </button>
      </form>
    </Panel>
  );
}

function ListaPrivilegios({ titulo, elementos }) {
  return (
    <div>
      <p className="text-sm font-medium text-texto">{titulo}</p>
      {elementos.length === 0 ? (
        <p className="mt-1 text-sm text-texto-3">Ninguno</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {elementos.map((nombre) => (
            <li key={nombre} className={codigoEnLinea}>
              {nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Prevuelo() {
  const { empresa, claves, recargarEmpresa } = useEmpresa();
  const prevuelo = useAccion(useCallback(() => api.prevuelo(empresa.id, claves), [empresa.id, claves]));
  const resultado = prevuelo.resultado;

  return (
    <div className="space-y-9">
      <Encabezado
        titulo="Pre-vuelo"
        ayuda="prevuelo"
        descripcion="Antes de auditar, comprueba la versión de Oracle, el contenedor y los privilegios reales del auditor, y anticipa qué controles no se podrán evaluar."
        acciones={
          <button type="button" onClick={() => prevuelo.ejecutar()} disabled={prevuelo.cargando} className={boton}>
            <PlaneTakeoff aria-hidden="true" className="size-4" />
            {prevuelo.cargando ? "Verificando…" : "Ejecutar pre-vuelo"}
          </button>
        }
      />

      <Aviso tono="error" titulo="El pre-vuelo no se pudo completar">
        {prevuelo.error}
      </Aviso>

      {!resultado && !prevuelo.cargando && !prevuelo.error && (
        <Vacio icono={PlaneTakeoff} titulo="Todavía no se ha verificado la conexión">
          Pulsa «Ejecutar pre-vuelo». Solo lee el diccionario de datos; no cambia nada en la base.
        </Vacio>
      )}

      {resultado && (
        <div className="space-y-6">
          <Ficha
            datos={[
              ["Versión de Oracle", resultado.version, true],
              ["Contenedor", `${resultado.contenedor} (${resultado.tipo_contenedor})`, true],
              ["Usuario auditor", resultado.usuario, true],
              ["Observables evaluables", `${resultado.observables_total - resultado.no_evaluables.length} de ${resultado.observables_total}`],
            ]}
          />
          {resultado.instancia?.configurada && (
            <Ficha
              columnas="sm:grid-cols-2"
              datos={[
                ["Contenedor de instancia", `${resultado.instancia.contenedor} (${resultado.instancia.tipo_contenedor})`, true],
                ["Usuario de instancia", resultado.instancia.usuario, true],
              ]}
            />
          )}

          {resultado.advertencias.length > 0 && (
            <div className="space-y-2">
              {resultado.advertencias.map((texto) => (
                <Aviso key={texto} tono="aviso">
                  {texto}
                </Aviso>
              ))}
            </div>
          )}

          <Seccion titulo="Privilegios efectivos del auditor" descripcion="Lo que el usuario auditor tiene de verdad, no lo que debería tener.">
            <div className="grid gap-5 rounded-xl bg-superficie px-5 py-4 shadow-tarjeta md:grid-cols-2">
              <ListaPrivilegios titulo="Roles" elementos={resultado.roles} />
              <ListaPrivilegios titulo="Privilegios de sistema" elementos={resultado.privilegios} />
            </div>
          </Seccion>

          <Seccion titulo="Controles que quedarían «No evaluable»" descripcion="Al auditar aparecerán así, con este motivo. No es un incumplimiento.">
            {resultado.no_evaluables.length === 0 ? (
              <Aviso tono="info">El auditor puede observar todos los controles del catálogo.</Aviso>
            ) : (
              <div className={contenedorTabla}>
                <table className={tabla}>
                  <thead className={cabecera}>
                    <tr>
                      {["Observable", "Control ISO", "Motivo"].map((titulo) => (
                        <th key={titulo} scope="col" className={th}>
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={cuerpo}>
                    {resultado.no_evaluables.map((fila) => (
                      <tr key={fila.obs_id}>
                        <td className={`${td} font-mono font-medium`}>{fila.obs_id}</td>
                        <td className={`${td} font-mono text-[0.8125rem]`}>{fila.control_iso}</td>
                        <td className={`${td} text-texto-2`}>{fila.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <PerfilPolitica key={JSON.stringify(empresa.perfil)} empresa={empresa} alGuardar={recargarEmpresa} />
        <ConexionInstancia key={`${empresa.dsn_instancia}|${empresa.usuario_instancia}`} empresa={empresa} alGuardar={recargarEmpresa} />
      </div>
    </div>
  );
}
