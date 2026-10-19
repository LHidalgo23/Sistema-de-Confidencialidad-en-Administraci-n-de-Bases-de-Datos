"""Ejecuta los scripts .sql de sql/03_verificacion/ y compara el resultado
con lo esperado en backend/data/pruebas.json.
"""

from pathlib import Path

from .db import get_connection
from .models import Prueba, ResultadoPrueba

REPO_ROOT = Path(__file__).resolve().parents[2]


def _leer_sentencias(script_path: Path) -> list[str]:
    """Quita comentarios de línea (--) y separa en sentencias por ';'."""
    texto = script_path.read_text(encoding="utf-8")
    lineas_sin_comentarios = [
        linea for linea in texto.splitlines() if not linea.strip().startswith("--")
    ]
    cuerpo = "\n".join(lineas_sin_comentarios)
    sentencias = [s.strip() for s in cuerpo.split(";") if s.strip()]
    return sentencias


def ejecutar_prueba(prueba: Prueba, password: str | None = None) -> ResultadoPrueba:
    script_path = REPO_ROOT / prueba.script
    sentencias = _leer_sentencias(script_path)

    if not sentencias:
        # Script aún no implementado (solo contiene TODO / comentarios).
        return ResultadoPrueba(
            id=prueba.id, paso=False, error="Script sin sentencias ejecutables (TODO)"
        )

    try:
        conexion = get_connection(user=prueba.conexion, password=password)
        with conexion:
            with conexion.cursor() as cursor:
                for sentencia in sentencias:
                    cursor.execute(sentencia)
                filas = cursor.fetchall() if cursor.description else None
        # TODO: comparar `filas` contra prueba.esperado (ver scoring.py)
        return ResultadoPrueba(id=prueba.id, paso=False, obtenido=str(filas))
    except Exception as exc:  # noqa: BLE001 — se captura cualquier error ORA
        return ResultadoPrueba(id=prueba.id, paso=False, error=str(exc))
