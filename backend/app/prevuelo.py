"""Pre-vuelo: verifica versión, contenedor y privilegios del usuario auditor
y predice qué controles quedarán "No evaluable" y por qué.

Los controles de alcance "Instancia" se comprueban con la conexión de instancia (CDB$ROOT)
si la empresa la configuró; si no, con la conexión de la PDB.
"""

from __future__ import annotations

import re
from typing import Any

import oracledb

from .catalogo import Catalogo
from .conexiones import codigo_ora, consultar
from .descubrimiento import VISTAS_REQUERIDAS as VISTAS_DESCUBRIMIENTO
from .motor import CODIGOS_SIN_VISIBILIDAD, motivo_por_version

ROLES_PERMITIDOS_AUDITOR = frozenset({"SELECT_CATALOG_ROLE", "HS_ADMIN_SELECT_ROLE", "AUDIT_VIEWER"})
ROLES_PERMITIDOS_INSTANCIA = frozenset({"SELECT_CATALOG_ROLE", "HS_ADMIN_SELECT_ROLE"})
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


def _privilegios_del_usuario(conexion: oracledb.Connection, roles_permitidos: frozenset[str]) -> tuple[list[str], list[str], list[str]]:
    _, roles, _ = consultar(conexion, "SELECT role FROM session_roles ORDER BY 1")
    _, privilegios, _ = consultar(conexion, "SELECT privilege FROM session_privs ORDER BY 1")
    roles = [r[0] for r in roles]
    privilegios = [p[0] for p in privilegios]
    excedentes = sorted(set(roles) - roles_permitidos) + sorted(set(privilegios) - PRIVILEGIOS_PERMITIDOS_AUDITOR)
    return roles, privilegios, excedentes


def _aviso_privilegios(excedentes: list[str], minimo: str, quien: str) -> str:
    return (
        f"{quien} tiene privilegios que exceden el mínimo ({minimo}): {', '.join(excedentes)}. "
        "El instrumento debe aplicar el privilegio mínimo que audita."
    )


def ejecutar_prevuelo(
    conexion: oracledb.Connection,
    catalogo: Catalogo,
    conexion_instancia: oracledb.Connection | None = None,
) -> dict[str, Any]:
    contexto = leer_contexto(conexion)
    version = conexion.version
    roles, privilegios, excedentes = _privilegios_del_usuario(conexion, ROLES_PERMITIDOS_AUDITOR)

    entradas_instancia = [e for e in catalogo.entradas if e.alcance == "Instancia"]
    requeridos_pdb = {obj for e in catalogo.entradas if e.alcance != "Instancia" for obj in e.requiere} | VISTAS_DESCUBRIMIENTO
    requeridos_instancia = {obj for e in entradas_instancia for obj in e.requiere}

    visibles_pdb = objetos_visibles(conexion, requeridos_pdb)
    desde_instancia = conexion_instancia if conexion_instancia is not None else conexion
    visibles_instancia = objetos_visibles(desde_instancia, requeridos_instancia)

    advertencias: list[str] = []
    if contexto["tipo_contenedor"] == "CDB$ROOT":
        advertencias.append(
            "La conexión apunta a CDB$ROOT: los controles de alcance PDB solo observarían el contenedor raíz. "
            "Use el servicio de la PDB que se va a auditar."
        )
    sin_descubrimiento = sorted(v for v in VISTAS_DESCUBRIMIENTO if not visibles_pdb.get(v, False))
    if sin_descubrimiento:
        advertencias.append(
            "El descubrimiento de datos sensibles no podrá ejecutarse: el auditor no puede consultar "
            + ", ".join(sin_descubrimiento) + "."
        )
    if excedentes:
        advertencias.append(
            _aviso_privilegios(excedentes, "CREATE SESSION, SELECT_CATALOG_ROLE, AUDIT_VIEWER", "El usuario auditor")
        )

    instancia: dict[str, Any] = {"configurada": conexion_instancia is not None}
    if conexion_instancia is not None:
        contexto_instancia = leer_contexto(conexion_instancia)
        roles_i, privilegios_i, excedentes_i = _privilegios_del_usuario(conexion_instancia, ROLES_PERMITIDOS_INSTANCIA)
        instancia.update(contexto_instancia, roles=roles_i, privilegios=privilegios_i)
        if contexto_instancia["tipo_contenedor"] != "CDB$ROOT":
            advertencias.append(
                "La conexión de instancia no apunta a CDB$ROOT: los controles de instancia no verían los respaldos, "
                "los parámetros ni las sesiones de toda la instancia."
            )
        if excedentes_i:
            advertencias.append(
                _aviso_privilegios(excedentes_i, "CREATE SESSION y SELECT_CATALOG_ROLE", "El usuario de instancia")
            )
    elif entradas_instancia:
        ids = ", ".join(e.id for e in entradas_instancia)
        advertencias.append(
            f"Sin conexión de instancia, los controles de instancia ({ids}) se observan desde la PDB y pueden "
            "salir «No evaluable». Configure una conexión a CDB$ROOT para evaluarlos."
        )

    no_evaluables = []
    for entrada in catalogo.entradas:
        visibles = visibles_instancia if entrada.alcance == "Instancia" else visibles_pdb
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
        "instancia": instancia,
        "objetos_visibles": {**visibles_instancia, **visibles_pdb},
        "advertencias": advertencias,
        "no_evaluables": no_evaluables,
        "observables_total": len(catalogo.entradas),
    }
