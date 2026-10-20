const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export class ErrorApi extends Error {
  constructor(estado, detalle) {
    super(detalle);
    this.estado = estado;
  }
}

async function solicitar(ruta, { metodo = "GET", cuerpo } = {}) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) {
    let detalle = `Error HTTP ${respuesta.status}`;
    try {
      const json = await respuesta.json();
      detalle = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
    } catch {
      // la respuesta de error no era JSON: se conserva el mensaje genérico
    }
    throw new ErrorApi(respuesta.status, detalle);
  }
  const tipo = respuesta.headers.get("content-type") ?? "";
  return tipo.includes("application/json") ? respuesta.json() : respuesta.text();
}

const credencial = (password) => ({ password: password || null });

function consulta(parametros) {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") busqueda.set(clave, valor);
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

export const api = {
  // catálogo genérico
  catalogo: () => solicitar("/api/catalogo"),
  controlesIso: () => solicitar("/api/controles-iso"),
  riesgos: () => solicitar("/api/riesgos"),
  tareas: () => solicitar("/api/tareas"),
  perfilDefault: () => solicitar("/api/perfil-default"),

  // empresas
  empresas: () => solicitar("/api/empresas"),
  crearEmpresa: (datos) => solicitar("/api/empresas", { metodo: "POST", cuerpo: datos }),
  empresa: (id) => solicitar(`/api/empresas/${id}`),
  probar: (id, password) => solicitar(`/api/empresas/${id}/probar`, { metodo: "POST", cuerpo: credencial(password) }),
  prevuelo: (id, password) => solicitar(`/api/empresas/${id}/prevuelo`, { metodo: "POST", cuerpo: credencial(password) }),

  // descubrimiento
  descubrir: (id, password) => solicitar(`/api/empresas/${id}/descubrir`, { metodo: "POST", cuerpo: credencial(password) }),
  descubrimiento: (id) => solicitar(`/api/empresas/${id}/descubrimiento`),
  confirmarDescubrimiento: (id, cuerpo) => solicitar(`/api/empresas/${id}/descubrimiento`, { metodo: "PUT", cuerpo }),

  // auditoría
  auditar: (id, password, etiqueta) =>
    solicitar(`/api/empresas/${id}/auditar`, { metodo: "POST", cuerpo: { ...credencial(password), etiqueta } }),
  ejecuciones: (id) => solicitar(`/api/empresas/${id}/ejecuciones`),
  ejecucion: (id) => solicitar(`/api/ejecuciones/${id}`),
  revisar: (id, cuerpo) => solicitar(`/api/ejecuciones/${id}/revision`, { metodo: "POST", cuerpo }),
  hallazgo: (ejecucionId, obsId) => solicitar(`/api/ejecuciones/${ejecucionId}/hallazgos/${obsId}`),
  correctivos: (ejecucionId) => solicitar(`/api/ejecuciones/${ejecucionId}/correctivos`),
  urlCorrectivos: (ejecucionId) => `${API_BASE}/api/ejecuciones/${ejecucionId}/correctivos?descargar=true`,
  planMejora: (ejecucionId) => solicitar(`/api/ejecuciones/${ejecucionId}/plan-mejora`),

  // matriz de evaluación
  matriz: (id, antes, despues) => solicitar(`/api/empresas/${id}/matriz${consulta({ antes, despues })}`),
  urlMatrizCsv: (id, antes, despues) => `${API_BASE}/api/empresas/${id}/matriz.csv${consulta({ antes, despues })}`,
};
