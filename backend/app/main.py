"""API del sistema de auditoría en vivo.

Endpoints mínimos (ampliar en FASE 3 / FASE 5 del plan de acción):
  GET  /api/riesgos
  GET  /api/tareas
  GET  /api/controles
  GET  /api/pruebas
  POST /api/auditoria      -> ejecuta la batería de pruebas contra Oracle
  GET  /api/snapshots/{tipo}  -> "antes" | "despues" (modo demo)
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import Control, Prueba, Riesgo, ResultadoAuditoria, ResultadoControl, Tarea
from .runner import ejecutar_prueba
from .scoring import calcular_madurez, estado_desde_madurez

load_dotenv()

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SNAPSHOTS_DIR = Path(__file__).resolve().parents[1] / "snapshots"

app = FastAPI(title="Auditoría de Confidencialidad — Clínica Los Robles S.A.")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cargar_json(nombre: str) -> list[dict]:
    ruta = DATA_DIR / nombre
    if not ruta.exists():
        raise HTTPException(status_code=500, detail=f"No se encontró {nombre}")
    return json.loads(ruta.read_text(encoding="utf-8"))


@app.get("/api/riesgos", response_model=list[Riesgo])
def listar_riesgos():
    return _cargar_json("riesgos.json")


@app.get("/api/tareas", response_model=list[Tarea])
def listar_tareas():
    return _cargar_json("tareas.json")


@app.get("/api/controles", response_model=list[Control])
def listar_controles():
    return _cargar_json("controles.json")


@app.get("/api/pruebas", response_model=list[Prueba])
def listar_pruebas():
    return _cargar_json("pruebas.json")


@app.post("/api/auditoria", response_model=ResultadoAuditoria)
def ejecutar_auditoria():
    pruebas = [Prueba(**p) for p in _cargar_json("pruebas.json")]
    controles = _cargar_json("controles.json")

    resultados_por_control: list[ResultadoControl] = []
    for control in controles:
        pruebas_control = [p for p in pruebas if p.control == control["id"]]
        resultados = [ejecutar_prueba(p) for p in pruebas_control]
        madurez = calcular_madurez(resultados)
        resultados_por_control.append(
            ResultadoControl(
                control=control["id"],
                madurez=madurez,
                estado=estado_desde_madurez(madurez),
                pruebas=resultados,
            )
        )

    return ResultadoAuditoria(
        timestamp=datetime.now(timezone.utc).isoformat(),
        modo="en_vivo",
        controles=resultados_por_control,
    )


@app.get("/api/snapshots/{tipo}")
def obtener_snapshot(tipo: str):
    if tipo not in ("antes", "despues"):
        raise HTTPException(status_code=404, detail="tipo debe ser 'antes' o 'despues'")
    ruta = SNAPSHOTS_DIR / f"{tipo}.json"
    if not ruta.exists():
        raise HTTPException(status_code=404, detail=f"Snapshot '{tipo}' aún no generado")
    return json.loads(ruta.read_text(encoding="utf-8"))


@app.get("/api/health")
def health():
    return {"status": "ok"}
