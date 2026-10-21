import sqlite3

from app import almacen
from app.config import get_config

ESQUEMA_ANTERIOR = """
CREATE TABLE empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, sector TEXT NOT NULL DEFAULT '',
    dsn TEXT NOT NULL, usuario TEXT NOT NULL, password_cifrada TEXT,
    perfil_json TEXT NOT NULL DEFAULT '{}', creada_en TEXT NOT NULL
);
CREATE TABLE ejecuciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER NOT NULL, etiqueta TEXT NOT NULL DEFAULT '',
    iniciada_en TEXT NOT NULL, finalizada_en TEXT, version_oracle TEXT, contenedor TEXT,
    perfil_json TEXT NOT NULL, revisada_por TEXT, revisada_en TEXT, notas_revision TEXT
);
CREATE TABLE resultados (
    ejecucion_id INTEGER NOT NULL, obs_id TEXT NOT NULL, estado TEXT NOT NULL, motivo TEXT,
    hallazgos_json TEXT NOT NULL DEFAULT '[]', duracion_ms INTEGER NOT NULL DEFAULT 0,
    truncado INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ejecucion_id, obs_id)
);
"""


def test_una_base_creada_con_el_esquema_anterior_se_migra_sin_perder_datos(entorno):
    ruta = get_config().db_path
    ruta.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ruta)
    con.executescript(ESQUEMA_ANTERIOR)
    con.execute("INSERT INTO empresas (nombre, dsn, usuario, creada_en) VALUES ('Vieja', 'h/s', 'u', '2026-10-20')")
    con.execute("INSERT INTO ejecuciones (empresa_id, iniciada_en, perfil_json) VALUES (1, '2026-10-20', '{}')")
    con.execute("INSERT INTO resultados (ejecucion_id, obs_id, estado) VALUES (1, 'OBS-01', 'Cumple')")
    con.commit()
    con.close()

    almacen.inicializar()
    almacen.inicializar()  # idempotente

    with almacen.conexion() as con:
        columnas_empresas = {f["name"] for f in con.execute("PRAGMA table_info(empresas)")}
        assert {"dsn_instancia", "usuario_instancia", "password_instancia_cifrada"} <= columnas_empresas
        assert con.execute("SELECT nombre FROM empresas").fetchone()["nombre"] == "Vieja"
        assert con.execute("SELECT origen FROM resultados").fetchone()["origen"] == "PDB"
