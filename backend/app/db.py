"""Conexión a Oracle (XEPDB1) usando python-oracledb en modo thin.

Por diseño, el backend se conecta con AUDITOR_APP (solo lectura de catálogo
y auditoría). Las pruebas "negativas" que requieren otro usuario (MEDICO_01,
RECEPCION_01, DEV_USER, ...) reciben sus credenciales por separado; nunca se
usa un usuario con privilegios de escritura sobre CLINICA desde el backend.
"""

import os

import oracledb
from dotenv import load_dotenv

load_dotenv()

ORACLE_DSN = os.getenv("ORACLE_DSN", "localhost:1521/XEPDB1")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"


def get_connection(user: str | None = None, password: str | None = None) -> oracledb.Connection:
    """Abre una conexión puntual contra XEPDB1.

    Sin argumentos, usa AUDITOR_APP (ORACLE_USER/ORACLE_PASSWORD del .env).
    """
    user = user or os.getenv("ORACLE_USER", "AUDITOR_APP")
    password = password or os.getenv("ORACLE_PASSWORD")
    if not password:
        raise RuntimeError(
            f"Falta la contraseña para {user}. Definir ORACLE_PASSWORD en backend/.env"
        )
    return oracledb.connect(user=user, password=password, dsn=ORACLE_DSN)
