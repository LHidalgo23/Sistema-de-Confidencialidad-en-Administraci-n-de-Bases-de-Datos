"""Almacén propio del instrumento (SQLite): empresas, descubrimientos,
ejecuciones y resultados. Nunca guarda contraseñas en texto plano.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import get_config

ESQUEMA_SQL = """
CREATE TABLE IF NOT EXISTS empresas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT NOT NULL UNIQUE,
    sector           TEXT NOT NULL DEFAULT '',
    dsn              TEXT NOT NULL,
    usuario          TEXT NOT NULL,
    password_cifrada TEXT,
    dsn_instancia    TEXT,
    usuario_instancia TEXT,
    password_instancia_cifrada TEXT,
    perfil_json      TEXT NOT NULL DEFAULT '{}',
    creada_en        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS descubrimientos (
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    esquema    TEXT NOT NULL,
    tabla      TEXT NOT NULL,
    columna    TEXT NOT NULL,
    tipo_dato  TEXT NOT NULL,
    categoria  TEXT NOT NULL,
    nivel      TEXT NOT NULL,
    confirmada INTEGER,
    PRIMARY KEY (empresa_id, esquema, tabla, columna)
);

CREATE TABLE IF NOT EXISTS ejecuciones (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id     INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    etiqueta       TEXT NOT NULL DEFAULT '',
    iniciada_en    TEXT NOT NULL,
    finalizada_en  TEXT,
    version_oracle TEXT,
    contenedor     TEXT,
    perfil_json    TEXT NOT NULL,
    revisada_por   TEXT,
    revisada_en    TEXT,
    notas_revision TEXT
);

CREATE TABLE IF NOT EXISTS resultados (
    ejecucion_id  INTEGER NOT NULL REFERENCES ejecuciones(id) ON DELETE CASCADE,
    obs_id        TEXT NOT NULL,
    estado        TEXT NOT NULL,
    motivo        TEXT,
    hallazgos_json TEXT NOT NULL DEFAULT '[]',
    duracion_ms   INTEGER NOT NULL DEFAULT 0,
    truncado      INTEGER NOT NULL DEFAULT 0,
    origen        TEXT NOT NULL DEFAULT 'PDB',
    PRIMARY KEY (ejecucion_id, obs_id)
);

-- Marca manual del DBA sobre un observable de una ejecución: 'resuelto' (se excluye
-- del script final) o 'pendiente' (sigue en el script, pero no bloquea generarlo).
CREATE TABLE IF NOT EXISTS correctivos_resueltos (
    ejecucion_id INTEGER NOT NULL REFERENCES ejecuciones(id) ON DELETE CASCADE,
    obs_id       TEXT NOT NULL,
    estado       TEXT NOT NULL DEFAULT 'resuelto',
    marcado_en   TEXT NOT NULL,
    nota         TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (ejecucion_id, obs_id)
);

CREATE INDEX IF NOT EXISTS ix_ejecuciones_empresa ON ejecuciones (empresa_id, id);
"""


def ahora_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def conexion() -> Iterator[sqlite3.Connection]:
    """Abre una conexión a SQLite con commit/rollback automático."""
    ruta = get_config().db_path
    ruta.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ruta)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


# Columnas agregadas después de la primera versión del esquema: las bases ya creadas se migran al iniciar.
COLUMNAS_NUEVAS = {
    "empresas": {
        "dsn_instancia": "TEXT",
        "usuario_instancia": "TEXT",
        "password_instancia_cifrada": "TEXT",
    },
    "resultados": {"origen": "TEXT NOT NULL DEFAULT 'PDB'"},
    "correctivos_resueltos": {"estado": "TEXT NOT NULL DEFAULT 'resuelto'"},
}


def _migrar(con: sqlite3.Connection) -> None:
    for tabla, columnas in COLUMNAS_NUEVAS.items():
        existentes = {fila["name"] for fila in con.execute(f"PRAGMA table_info({tabla})")}
        for nombre, definicion in columnas.items():
            if nombre not in existentes:
                con.execute(f"ALTER TABLE {tabla} ADD COLUMN {nombre} {definicion}")


def inicializar() -> None:
    with conexion() as con:
        con.executescript(ESQUEMA_SQL)
        _migrar(con)
