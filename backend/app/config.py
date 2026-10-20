"""Configuración del backend, leída del entorno (.env).

Rutas según el modo de ejecución:
  * Desarrollo: recursos en la raíz del repositorio; datos y .env en backend/.
  * Empaquetado (.exe de PyInstaller): recursos dentro del paquete; datos y .env en
    %LOCALAPPDATA%\\AuditorISO, de modo que sobreviven a una reconstrucción del .exe.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent
EMPAQUETADO = bool(getattr(sys, "frozen", False))
RECURSOS_DIR = Path(getattr(sys, "_MEIPASS", REPO_DIR))
DATOS_DIR = (Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "AuditorISO") if EMPAQUETADO else BACKEND_DIR

load_dotenv(DATOS_DIR / ".env")


@dataclass(frozen=True)
class Config:
    instrumento_dir: Path
    frontend_dir: Path
    db_path: Path
    llave_cifrado: str | None
    cors_origins: tuple[str, ...]
    call_timeout_ms: int
    connect_timeout_s: int
    max_filas_observable: int


@lru_cache(maxsize=1)
def get_config() -> Config:
    origenes = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return Config(
        instrumento_dir=Path(os.getenv("AUDITORIA_INSTRUMENTO_DIR", RECURSOS_DIR / "instrumento")),
        frontend_dir=Path(os.getenv("AUDITORIA_FRONTEND_DIR", RECURSOS_DIR / "frontend" / "dist")),
        db_path=Path(os.getenv("AUDITORIA_DB", DATOS_DIR / "data" / "auditoria.db")),
        llave_cifrado=os.getenv("AUDITORIA_LLAVE_CIFRADO") or None,
        cors_origins=tuple(o.strip() for o in origenes.split(",") if o.strip()),
        call_timeout_ms=int(os.getenv("AUDITORIA_CALL_TIMEOUT_MS", "30000")),
        connect_timeout_s=int(os.getenv("AUDITORIA_CONNECT_TIMEOUT_S", "10")),
        max_filas_observable=int(os.getenv("AUDITORIA_MAX_FILAS", "2000")),
    )
