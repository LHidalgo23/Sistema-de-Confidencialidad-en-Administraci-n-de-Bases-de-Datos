const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  riesgos: () => request("/api/riesgos"),
  tareas: () => request("/api/tareas"),
  controles: () => request("/api/controles"),
  pruebas: () => request("/api/pruebas"),
  ejecutarAuditoria: () =>
    fetch(`${API_BASE}/api/auditoria`, { method: "POST" }).then((r) => r.json()),
  snapshot: (tipo) => request(`/api/snapshots/${tipo}`),
};
