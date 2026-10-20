"""Descubrimiento de esquemas de negocio y columnas sensibles.

Trabaja solo con metadatos (DBA_TABLES, DBA_TAB_COLUMNS): nunca lee datos
reales. Auditar confidencialidad leyendo los datos sensibles sería contradictorio.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping, Sequence
from typing import Any

import oracledb

from . import almacen
from .conexiones import consultar

SQL_ESQUEMAS = """
SELECT t.owner AS esquema, COUNT(*) AS tablas
FROM   dba_tables t
JOIN   dba_users u ON u.username = t.owner
WHERE  u.oracle_maintained = 'N'
AND    t.table_name NOT LIKE 'BIN$%'
GROUP  BY t.owner
ORDER  BY t.owner
"""

SQL_COLUMNAS = """
SELECT c.owner       AS esquema,
       c.table_name  AS tabla,
       c.column_name AS columna,
       c.data_type   AS tipo_dato
FROM   dba_tab_columns c
JOIN   dba_tables t ON t.owner = c.owner AND t.table_name = c.table_name
WHERE  EXISTS (SELECT 1
               FROM   JSON_TABLE(TO_CLOB(:esquemas), '$[*]'
                        COLUMNS (esquema VARCHAR2(128) PATH '$')) e
               WHERE  e.esquema = c.owner)
AND    REGEXP_LIKE(c.column_name, :patron, 'i')
AND    REGEXP_LIKE(c.data_type, :tipos, 'i')
AND    c.hidden_column = 'NO'
AND    t.table_name NOT LIKE 'BIN$%'
ORDER  BY c.owner, c.table_name, c.column_id
"""

_RE_PATRON = re.compile(r"^[A-Z0-9_]{2,40}$")
_RE_TIPO = re.compile(r"^[A-Z0-9 ]{2,30}$")


def esquemas_de_negocio(conexion: oracledb.Connection) -> list[dict[str, Any]]:
    columnas, filas, _ = consultar(conexion, SQL_ESQUEMAS)
    return [dict(zip(columnas, f)) for f in filas]


def clasificar_columna(nombre: str, patrones: Sequence[Mapping[str, str]]) -> Mapping[str, str] | None:
    """Primer patrón (en orden) contenido en el nombre de la columna, sin distinguir mayúsculas."""
    mayusculas = nombre.upper()
    for patron in patrones:
        if patron["patron"].upper() in mayusculas:
            return patron
    return None


def columnas_sensibles(
    conexion: oracledb.Connection,
    esquemas: Iterable[str],
    perfil: Mapping[str, Any],
) -> list[dict[str, str]]:
    patrones = perfil["patrones_sensibles"]
    tipos = perfil["tipos_dato_candidatos"]
    esquemas = list(esquemas)
    if not esquemas or not patrones:
        return []
    if not all(_RE_PATRON.match(p["patron"]) for p in patrones) or not all(_RE_TIPO.match(t) for t in tipos):
        raise ValueError("El perfil contiene patrones o tipos de dato con caracteres no permitidos")

    regex_patron = "(" + "|".join(p["patron"] for p in patrones) + ")"
    regex_tipos = "^(" + "|".join(tipos) + ")(\\(.*\\))?$"
    columnas, filas, _ = consultar(
        conexion,
        SQL_COLUMNAS,
        {"esquemas": esquemas, "patron": regex_patron, "tipos": regex_tipos},
    )
    encontradas = []
    for fila in filas:
        registro = dict(zip(columnas, fila))
        patron = clasificar_columna(registro["columna"], patrones)
        if patron is None:
            continue
        registro["categoria"] = patron["categoria"]
        registro["nivel"] = patron["nivel"]
        encontradas.append(registro)
    return encontradas


def guardar_descubrimiento(empresa_id: int, encontradas: Sequence[Mapping[str, str]]) -> None:
    """Sincroniza lo descubierto conservando las decisiones previas del auditor
    (confirmada / descartada) y retirando las columnas que ya no existen."""
    with almacen.conexion() as con:
        existentes = {
            (f["esquema"], f["tabla"], f["columna"])
            for f in con.execute("SELECT esquema, tabla, columna FROM descubrimientos WHERE empresa_id = ?", (empresa_id,))
        }
        vigentes = set()
        for c in encontradas:
            clave = (c["esquema"], c["tabla"], c["columna"])
            vigentes.add(clave)
            if clave in existentes:
                con.execute(
                    "UPDATE descubrimientos SET tipo_dato = ?, categoria = ?, nivel = ? "
                    "WHERE empresa_id = ? AND esquema = ? AND tabla = ? AND columna = ?",
                    (c["tipo_dato"], c["categoria"], c["nivel"], empresa_id, *clave),
                )
            else:
                con.execute(
                    "INSERT INTO descubrimientos (empresa_id, esquema, tabla, columna, tipo_dato, categoria, nivel, confirmada) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
                    (empresa_id, *clave, c["tipo_dato"], c["categoria"], c["nivel"]),
                )
        for clave in existentes - vigentes:
            con.execute(
                "DELETE FROM descubrimientos WHERE empresa_id = ? AND esquema = ? AND tabla = ? AND columna = ?",
                (empresa_id, *clave),
            )


def listar_descubrimiento(empresa_id: int) -> list[dict[str, Any]]:
    with almacen.conexion() as con:
        filas = con.execute(
            "SELECT esquema, tabla, columna, tipo_dato, categoria, nivel, confirmada "
            "FROM descubrimientos WHERE empresa_id = ? ORDER BY esquema, tabla, columna",
            (empresa_id,),
        ).fetchall()
    return [dict(f) for f in filas]


def confirmar(empresa_id: int, confirmadas: Iterable[Mapping[str, str]], descartadas: Iterable[Mapping[str, str]]) -> None:
    with almacen.conexion() as con:
        for valor, lista in ((1, confirmadas), (0, descartadas)):
            for c in lista:
                con.execute(
                    "UPDATE descubrimientos SET confirmada = ? "
                    "WHERE empresa_id = ? AND esquema = ? AND tabla = ? AND columna = ?",
                    (valor, empresa_id, c["esquema"], c["tabla"], c["columna"]),
                )


def columnas_para_auditar(empresa_id: int) -> list[dict[str, str]]:
    """Columnas que se auditan: las confirmadas y las aún pendientes de revisar.
    Lo pendiente cuenta como sensible hasta que el auditor lo descarte."""
    with almacen.conexion() as con:
        filas = con.execute(
            "SELECT esquema, tabla, columna, nivel FROM descubrimientos "
            "WHERE empresa_id = ? AND (confirmada IS NULL OR confirmada = 1) ORDER BY esquema, tabla, columna",
            (empresa_id,),
        ).fetchall()
    return [dict(f) for f in filas]
