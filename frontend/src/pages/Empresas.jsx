import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Aviso, { Cargando } from "../components/Aviso";
import { boton, campo, cabecera, contenedorTabla, cuerpo, tabla, td, tarjeta, th } from "../components/estilos";
import { useAccion, useCarga } from "../hooks/useCarga";

const FORMULARIO_VACIO = { nombre: "", sector: "", dsn: "", usuario: "AUDITOR_ISO", password: "", perfil: "" };

function Campo({ etiqueta, ayuda, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{ayuda}</span>}
    </label>
  );
}

export default function Empresas() {
  const lista = useCarga(api.empresas, []);
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
        setErrorPerfil("El perfil debe ser un JSON válido.");
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
      lista.recargar();
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Empresas registradas</h2>
        {lista.cargando && !lista.datos && <Cargando />}
        <Aviso tono="error">{lista.error && `No se pudo contactar con el backend: ${lista.error}`}</Aviso>
        {lista.datos?.length === 0 && (
          <Aviso>Aún no hay empresas. Registre una abajo para auditar su base Oracle con el instrumento.</Aviso>
        )}
        {lista.datos?.length > 0 && (
          <div className={contenedorTabla}>
            <table className={tabla}>
              <thead className={cabecera}>
                <tr>
                  {["Empresa", "Sector", "Conexión", "Usuario auditor", "Credenciales", ""].map((titulo) => (
                    <th key={titulo} scope="col" className={th}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cuerpo}>
                {lista.datos.map((empresa) => (
                  <tr key={empresa.id}>
                    <td className={`${td} font-medium`}>{empresa.nombre}</td>
                    <td className={td}>{empresa.sector || "—"}</td>
                    <td className={`${td} font-mono text-xs`}>{empresa.dsn}</td>
                    <td className={`${td} font-mono text-xs`}>{empresa.usuario}</td>
                    <td className={td}>{empresa.credenciales_guardadas ? "Cifradas en reposo" : "Se piden al ejecutar"}</td>
                    <td className={td}>
                      <Link to={`/empresas/${empresa.id}`} className="font-medium underline underline-offset-2">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={tarjeta}>
        <h2 className="mb-1 text-lg font-semibold">Registrar una empresa</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Antes de registrarla, el DBA de la empresa ejecuta <code>instrumento/onboarding_auditor.sql</code> en la base que se va a
          auditar. El instrumento solo necesita ese usuario de lectura.
        </p>
        <form onSubmit={enviar} className="grid gap-4 md:grid-cols-2">
          <Campo etiqueta="Nombre de la empresa">
            <input required minLength={2} value={formulario.nombre} onChange={cambiar("nombre")} className={campo} />
          </Campo>
          <Campo etiqueta="Sector">
            <input value={formulario.sector} onChange={cambiar("sector")} className={campo} />
          </Campo>
          <Campo etiqueta="Conexión (host:puerto/servicio de la PDB)" ayuda="Ejemplo: localhost:1521/pdb_clinica">
            <input required value={formulario.dsn} onChange={cambiar("dsn")} className={`${campo} font-mono`} />
          </Campo>
          <Campo etiqueta="Usuario auditor">
            <input required value={formulario.usuario} onChange={cambiar("usuario")} className={`${campo} font-mono`} />
          </Campo>
          <Campo
            etiqueta="Contraseña (opcional)"
            ayuda="Si se guarda, se cifra en reposo con la llave del backend. Si se deja vacía, se pedirá al ejecutar."
          >
            <input type="password" autoComplete="off" value={formulario.password} onChange={cambiar("password")} className={campo} />
          </Campo>
          <Campo etiqueta="Perfil de política (JSON, opcional)" ayuda="Solo las claves que difieran de los umbrales por defecto.">
            <textarea
              rows={3}
              value={formulario.perfil}
              onChange={cambiar("perfil")}
              placeholder='{"dias_inactividad": 60}'
              className={`${campo} font-mono`}
            />
          </Campo>
          <div className="space-y-3 md:col-span-2">
            <Aviso tono="error">{errorPerfil || crear.error}</Aviso>
            <button type="submit" disabled={crear.cargando} className={boton}>
              {crear.cargando ? "Registrando…" : "Registrar empresa"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
