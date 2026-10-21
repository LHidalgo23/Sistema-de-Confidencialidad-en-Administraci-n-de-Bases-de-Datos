"""Acceso a Oracle: credenciales cifradas en reposo, apertura de conexiones
y ejecución de consultas de solo lectura con variables bind.

Las credenciales nunca se guardan en texto plano: o se piden al ejecutar, o se
cifran con Fernet usando una llave que vive en .env (jamás en el repositorio).
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import oracledb
from cryptography.fernet import Fernet, InvalidToken

from .config import get_config


class LlaveNoConfigurada(Exception):
    """Falta AUDITORIA_LLAVE_CIFRADO o no es una llave Fernet válida."""


class CredencialesFaltantes(Exception):
    """No hay contraseña guardada ni se proporcionó una."""


class ConexionFallida(Exception):
    """No se pudo conectar a Oracle (mensaje sin datos sensibles)."""


def generar_llave() -> str:
    """Genera una llave Fernet para AUDITORIA_LLAVE_CIFRADO."""
    return Fernet.generate_key().decode()


def _fernet() -> Fernet:
    llave = get_config().llave_cifrado
    if not llave:
        raise LlaveNoConfigurada(
            "Defina AUDITORIA_LLAVE_CIFRADO en backend/.env para guardar contraseñas cifradas "
            "(o no guarde la contraseña y envíela en cada ejecución)."
        )
    try:
        return Fernet(llave.encode())
    except ValueError as exc:
        raise LlaveNoConfigurada("AUDITORIA_LLAVE_CIFRADO no es una llave Fernet válida.") from exc


def cifrar(texto: str) -> str:
    return _fernet().encrypt(texto.encode()).decode()


def descifrar(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise CredencialesFaltantes(
            "No se pudo descifrar la contraseña guardada: la llave cambió. Vuelva a registrarla."
        ) from exc


def mensaje_oracle(exc: BaseException) -> str:
    """Primera línea del error de Oracle, acotada; no incluye credenciales."""
    error = exc.args[0] if exc.args else exc
    return str(error).splitlines()[0][:300] if str(error) else exc.__class__.__name__


def codigo_ora(exc: oracledb.Error) -> int | None:
    error = exc.args[0] if exc.args else None
    return getattr(error, "code", None)


def abrir_conexion(empresa: Mapping[str, Any], password: str | None = None, *, instancia: bool = False) -> oracledb.Connection:
    """Conecta con el usuario auditor de la empresa (o, con `instancia=True`, con su usuario de
    instancia en CDB$ROOT). La contraseña enviada tiene prioridad sobre la guardada."""
    sufijo = "_instancia" if instancia else ""
    usuario, dsn = empresa.get(f"usuario{sufijo}"), empresa.get(f"dsn{sufijo}")
    cifrada = empresa.get(f"password{sufijo}_cifrada")
    nombre = "de instancia " if instancia else ""
    if not (usuario and dsn):
        raise CredencialesFaltantes("La empresa no tiene una conexión de instancia configurada.")
    clave = password
    if not clave and cifrada:
        clave = descifrar(cifrada)
    if not clave:
        raise CredencialesFaltantes(f"La empresa no tiene contraseña {nombre}guardada: envíela para esta operación.")

    config = get_config()
    try:
        conexion = oracledb.connect(
            user=usuario,
            password=clave,
            dsn=dsn,
            tcp_connect_timeout=config.connect_timeout_s,
        )
    except oracledb.Error as exc:
        raise ConexionFallida(mensaje_oracle(exc)) from None
    conexion.call_timeout = config.call_timeout_ms
    return conexion


def consultar(
    conexion: oracledb.Connection,
    sql: str,
    binds: Mapping[str, Any] | None = None,
    *,
    max_filas: int | None = None,
) -> tuple[list[str], list[tuple], bool]:
    """Ejecuta una consulta de solo lectura.

    Las listas y diccionarios se envían como un único documento JSON (CLOB) que
    los observables consumen con JSON_TABLE. Devuelve (columnas, filas, truncado).
    """
    limite = max_filas or get_config().max_filas_observable
    preparados: dict[str, Any] = {}
    clobs: list[str] = []
    for nombre, valor in (binds or {}).items():
        if isinstance(valor, (list, dict)):
            preparados[nombre] = json.dumps(valor, ensure_ascii=False)
            clobs.append(nombre)
        else:
            preparados[nombre] = valor

    with conexion.cursor() as cursor:
        if clobs:
            cursor.setinputsizes(**{nombre: oracledb.DB_TYPE_CLOB for nombre in clobs})
        cursor.execute(sql, preparados)
        if cursor.description is None:
            return [], [], False
        columnas = [d[0].lower() for d in cursor.description]
        filas = cursor.fetchmany(limite + 1)
    return columnas, filas[:limite], len(filas) > limite
