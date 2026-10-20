"""Pre-vuelo: verifica versión, contenedor y privilegios del usuario auditor
y predice qué controles quedarán "No evaluable" y por qué.
"""

from __future__ import annotations

import re
from typing import Any

import oracledb

from .catalogo import Catalogo
from .conexiones import codigo_ora, consultar
from .motor import CODIGOS_SIN_VISIBILIDAD, motivo_por_version

ROLES_PERMITIDOS_AUDITOR = frozenset({"SELECT_CATALOG_ROLE", "HS_ADMIN_SELECT_ROLE", "AUDIT_VIEWER"})
PRIVILEGIOS_PERMITIDOS_AUDITOR = frozenset({"CREATE SESSION"})
_RE_OBJETO = re.compile(r"^[A-Z][A-Z0-9_$]*$")


def tipo_contenedor(con_id: int) -> str:
    if con_id == 0:
        return "Base no multitenant"
    if con_id == 1:
        return "CDB$ROOT"
    return "PDB"


def leer_contexto(conexion: oracledb.Connection) -> dict[str, Any]:
    _, filas, _ = consultar(
        conexion,
        "SELECT SYS_CONTEXT('USERENV', 'CON_NAME'), SYS_CONTEXT('USERENV', 'CON_ID'), "
        "SYS_CONTEXT('USERENV', 'SESSION_USER') FROM dual",
    )
    nombre, con_id, usuario = filas[0]
    return {
        "contenedor": nombre,
        "con_id": int(con_id),
        "tipo_contenedor": tipo_contenedor(int(con_id)),
        "usuario": usuario,
    }


def objetos_visibles(conexion: oracledb.Connection, objetos: set[str]) -> dict[str, bool]:
    """Comprueba, objeto por objeto, si el auditor puede consultarlo."""
    resultado: dict[str, bool] = {}
    for objeto in sorted(objetos):
        if not _RE_OBJETO.match(objeto):  # el nombre no es enlazable: se valida antes de interpolar
            resultado[objeto] = False
            continue
        try:
            consultar(conexion, f"SELECT 1 FROM {objeto} WHERE 1 = 0")
            resultado[objeto] = True
        except oracledb.Error as exc:
            if codigo_ora(exc) not in CODIGOS_SIN_VISIBILIDAD:
                raise
            resultado[objeto] = False
    return resultado


def ejecutar_prevuelo(conexion: oracledb.Connection, catalogo: Catalogo) -> dict[str, Any]:
    contexto = leer_contexto(conexion)
    version = conexion.version
    _, roles, _ = consultar(conexion, "SELECT role FROM session_roles ORDER BY 1")
    _, privilegios, _ = consultar(conexion, "SELECT privilege FROM session_privs ORDER BY 1")
    roles = [r[0] for r in roles]
    privilegios = [p[0] for p in privilegios]

    requeridos = {obj for entrada in catalogo.entradas for obj in entrada.requiere}
    visibles = objetos_visibles(conexion, requeridos)

    advertencias: list[str] = []
    if contexto["tipo_contenedor"] == "CDB$ROOT":
        advertencias.append(
            "La conexión apunta a CDB$ROOT: los controles de alcance PDB solo observarían el contenedor raíz. "
            "Use el servicio de la PDB que se va a auditar."
        )
    excedentes = sorted(set(roles) - ROLES_PERMITIDOS_AUDITOR) + sorted(set(privilegios) - PRIVILEGIOS_PERMITIDOS_AUDITOR)
    if excedentes:
        advertencias.append(
            "El usuario auditor tiene privilegios que exceden el mínimo (CREATE SESSION, SELECT_CATALOG_ROLE, "
            f"AUDIT_VIEWER): {', '.join(excedentes)}. El instrumento debe aplicar el privilegio mínimo que audita."
        )

    no_evaluables = []
    for entrada in catalogo.entradas:
        motivos = []
        por_version = motivo_por_version(entrada, version)
        if por_version:
            motivos.append(por_version)
        ocultos = [obj for obj in entrada.requiere if not visibles.get(obj, False)]
        if ocultos:
            motivos.append(f"El auditor no puede consultar: {', '.join(ocultos)}")
        if motivos:
            no_evaluables.append({"obs_id": entrada.id, "control_iso": entrada.control_iso, "motivo": "; ".join(motivos)})

    return {
        "version": version,
        **contexto,
        "roles": roles,
        "privilegios": privilegios,
        "objetos_visibles": visibles,
        "advertencias": advertencias,
        "no_evaluables": no_evaluables,
        "observables_total": len(catalogo.entradas),
    }
