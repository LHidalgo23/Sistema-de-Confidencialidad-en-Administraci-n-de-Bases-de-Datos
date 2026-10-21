import { Building2, LockKeyhole, Plus, Unlock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { ayudaCampo, boton, botonSecundario, cabecera, campo, codigoEnLinea, contenedorTabla, cuerpo, etiquetaCampo, tabla, td, th } from "../components/estilos";
import { Encabezado, Seccion, Vacio } from "../components/ui";
import { useAccion, useCarga } from "../hooks/useCarga";

const FORMULARIO_VACIO = { nombre: "", sector: "", dsn: "", usuario: "AUDITOR_ISO", password: "", perfil: "" };

// El ciclo por empresa del plan v2 (sección 1.1), con su fase PHVA y su tipo de control.
const CICLO = [
  { paso: "Registrar", que: "Conexión y perfil de política", fase: "Planificar" },
  { paso: "Pre-vuelo", que: "Qué puede ver el auditor", fase: "Planificar" },
  { paso: "Descubrir", que: "Columnas sensibles por metadatos", fase: "Planificar" },
  { paso: "Observar", que: "24 consultas de solo lectura", fase: "Verificar", control: "Detectivo" },
  { paso: "Evaluar", que: "Madurez 0-4 por control", fase: "Verificar" },
  { paso: "Corregir", que: "Script que aplica el DBA", fase: "Hacer", control: "Correctivo" },
  { paso: "Re-observar", que: "Mismas consultas, antes y después", fase: "Verificar", control: "Detectivo" },
  { paso: "Prevenir", que: "Plan de mejora y reporte", fase: "Actuar", control: "Preventivo" },
];

function Ciclo() {
  return (
    <section aria-labelledby="titulo-ciclo" className="rounded-xl bg-superficie shadow-tarjeta">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linea px-5 py-3.5">
        <h2 id="titulo-ciclo" className="font-semibold">
          El ciclo que sigue cada auditoría
        </h2>
        <p className="text-sm text-texto-3">Observar, corregir y volver a observar, con ISO/IEC 27001:2022 y PHVA</p>
      </div>
      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-linea sm:grid-cols-4 xl:grid-cols-8">
        {CICLO.map(({ paso, que, fase, control }, i) => (
          <li key={paso} className="bg-superficie px-4 py-4">
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-acento-suave text-xs font-bold text-acento tabular">
              {i + 1}
            </span>
            <p className="mt-2 font-semibold whitespace-nowrap text-texto">{paso}</p>
            <p className="mt-2 text-[0.8125rem] leading-snug text-texto-2">{que}</p>
            <p className="mt-2 text-xs text-texto-3">
              {fase}
              {control && <span className="text-texto-2">, control {control.toLowerCase()}</span>}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Campo({ etiqueta, ayuda, children }) {
  return (
    <label className="block text-sm">
      <span className={etiquetaCampo}>{etiqueta}</span>
      {children}
      {ayuda && <span className={ayudaCampo}>{ayuda}</span>}
    </label>
  );
}

function Registro({ alCrear, abierto, setAbierto }) {
  const crear = useAccion(api.crearEmpresa);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [errorPerfil, setErrorPerfil] = useState(null);

  const cambiar = (nombre) => (evento) => setFormulario((previo) => ({ ...previo, [nombre]: evento.target.value }));

  async function enviar(evento) {
    evento.preventDefault();
    let perfil = {};
    if (formulario.perfil.trim()) {
      try {
        perfil = JSON.parse(formulario.perfil);
      } catch {
        setErrorPerfil("El perfil debe ser un JSON válido, por ejemplo {\"dias_inactividad\": 60}.");
        return;
      }
    }
    setErrorPerfil(null);
    const creada = await crear.ejecutar({
      nombre: formulario.nombre,
      sector: formulario.sector,
      dsn: formulario.dsn,
      usuario: formulario.usuario,
      password: formulario.password || null,
      perfil,
    });
    if (creada) {
      setFormulario(FORMULARIO_VACIO);
      alCrear();
    }
  }

  if (!abierto) return null;

  return (
    <section aria-labelledby="titulo-registro" className="rounded-xl bg-superficie shadow-tarjeta">
      <div className="border-b border-linea px-5 py-4">
        <h2 id="titulo-registro" className="text-lg font-semibold">
          Registrar una empresa
        </h2>
        <p className="mt-1 max-w-[72ch] text-sm text-texto-2">
          Antes, el DBA de la empresa ejecuta <code className={codigoEnLinea}>instrumento/onboarding_auditor.sql</code> en la base que se va a
          auditar. El instrumento solo necesita ese usuario de lectura.
        </p>
      </div>
      <form onSubmit={enviar} className="grid gap-x-5 gap-y-4 px-5 py-5 md:grid-cols-2">
        <Campo etiqueta="Nombre de la empresa">
          <input required minLength={2} value={formulario.nombre} onChange={cambiar("nombre")} className={campo} />
        </Campo>
        <Campo etiqueta="Sector" ayuda="Opcional. Por ejemplo: salud, banca, educación.">
          <input value={formulario.sector} onChange={cambiar("sector")} className={campo} />
        </Campo>
        <Campo etiqueta="Conexión a la PDB" ayuda="host:puerto/servicio, por ejemplo localhost:1521/pdb_clinica">
          <input required value={formulario.dsn} onChange={cambiar("dsn")} spellCheck={false} className={`${campo} font-mono`} />
        </Campo>
        <Campo etiqueta="Usuario auditor" ayuda="El que creó el script de incorporación.">
          <input required value={formulario.usuario} onChange={cambiar("usuario")} spellCheck={false} className={`${campo} font-mono`} />
        </Campo>
        <Campo
          etiqueta="Contraseña (opcional)"
          ayuda="Si la escribes, se guarda cifrada con la llave del backend. Si la dejas vacía, se pedirá en cada sesión."
        >
          <input type="password" autoComplete="off" value={formulario.password} onChange={cambiar("password")} className={campo} />
        </Campo>
        <Campo etiqueta="Perfil de política (JSON, opcional)" ayuda="Solo los umbrales que cambian respecto del perfil por defecto del Catálogo.">
          <textarea
            rows={3}
            value={formulario.perfil}
            onChange={cambiar("perfil")}
            placeholder='{"dias_inactividad": 60}'
            spellCheck={false}
            className={`${campo} font-mono`}
          />
        </Campo>
        <div className="space-y-3 md:col-span-2">
          <Aviso tono="error">{errorPerfil || crear.error}</Aviso>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={crear.cargando} className={boton}>
              {crear.cargando ? "Registrando…" : "Registrar empresa"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className={botonSecundario}>
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default function Empresas() {
  const lista = useCarga(api.empresas, []);
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const vacia = lista.datos?.length === 0;

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Empresas auditadas"
        ayuda="empresas"
        descripcion="Cada empresa es una base Oracle con su propia conexión y su política. El instrumento y su catálogo son los mismos para todas."
        acciones={
          !registroAbierto &&
          !vacia && (
            <button type="button" onClick={() => setRegistroAbierto(true)} className={boton}>
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
              Registrar empresa
            </button>
          )
        }
      />

      <Ciclo />

      <Registro
        alCrear={() => {
          setRegistroAbierto(false);
          lista.recargar();
        }}
        abierto={registroAbierto || vacia} setAbierto={setRegistroAbierto} />

      <Seccion titulo="Empresas registradas">
        {lista.cargando && !lista.datos && <Cargando />}
        <Aviso tono="error" titulo="No se pudo contactar con el backend">
          {lista.error && `${lista.error}. Comprueba que el backend esté corriendo en el puerto 8000.`}
        </Aviso>
        {vacia && (
          <Vacio icono={Building2} titulo="Aún no hay empresas">
            Registra la primera con el formulario de arriba para auditar su base Oracle.
          </Vacio>
        )}
        {lista.datos?.length > 0 && (
          <div className={contenedorTabla}>
            <table className={tabla}>
              <thead className={cabecera}>
                <tr>
                  {["Empresa", "Conexión", "Usuario auditor", "Credenciales", ""].map((titulo) => (
                    <th key={titulo || "accion"} scope="col" className={th}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cuerpo}>
                {lista.datos.map((empresa) => (
                  <tr key={empresa.id}>
                    <td className={td}>
                      <Link to={`/empresas/${empresa.id}`} className="font-semibold text-texto hover:text-acento">
                        {empresa.nombre}
                      </Link>
                      <span className="block text-xs text-texto-3">{empresa.sector || "Sin sector"}</span>
                    </td>
                    <td className={`${td} font-mono text-[0.8125rem]`}>{empresa.dsn}</td>
                    <td className={`${td} font-mono text-[0.8125rem]`}>{empresa.usuario}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5 text-texto-2">
                        {empresa.credenciales_guardadas ? (
                          <LockKeyhole aria-hidden="true" className="size-3.5 text-cumple" />
                        ) : (
                          <Unlock aria-hidden="true" className="size-3.5 text-texto-3" />
                        )}
                        {empresa.credenciales_guardadas ? "Cifradas en reposo" : "Se piden al conectar"}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      <Link to={`/empresas/${empresa.id}`} className={botonSecundario}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
    </div>
  );
}
