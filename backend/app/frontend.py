"""Sirve el frontend compilado (frontend/dist) desde el propio backend, de modo que
un solo proceso y un solo puerto basten para usar el sistema completo.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def montar_frontend(app: FastAPI, dist: Path) -> bool:
    """Registra la ruta comodín del frontend. Debe llamarse DESPUÉS de definir la API,
    porque las rutas se evalúan en orden. Devuelve False si no hay frontend compilado."""
    raiz = dist.resolve()
    indice = raiz / "index.html"
    if not indice.is_file():
        return False

    @app.get("/{ruta:path}", include_in_schema=False)
    def servir_frontend(ruta: str) -> FileResponse:
        if ruta == "api" or ruta.startswith("api/"):
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        candidato = (raiz / ruta).resolve()
        if ruta and candidato.is_file() and candidato.is_relative_to(raiz):
            return FileResponse(candidato)
        return FileResponse(indice)  # rutas del enrutador del cliente (React Router)

    return True
