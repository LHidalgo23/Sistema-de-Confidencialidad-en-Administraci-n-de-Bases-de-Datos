"""Registro de empresas y perfil de política por empresa (SQLite)."""

from __future__ import annotations

import copy
import json
import re
import sqlite3
from collections.abc import Mapping
from typing import Any

from . import almacen
from .conexiones import cifrar
from .modelos import EmpresaCrear, EmpresaPublica

# host[:puerto]/servicio (Easy Connect). Rechaza cualquier otra forma de DSN.
RE_DSN = re.compile(r"^[A-Za-z0-9_.\-]+(:\d{1,5})?/[A-Za-z0-9_.$#\-]+$")
_RE_PATRON = re.compile(r"^[A-Z0-9_]{2,40}$")
_RE_TIPO_DATO = re.compile(r"^[A-Z0-9 ]{2,30}$")
_RE_OBS = re.compile(r"^OBS-\d{2}$")
_CLAVES_ESTRUCTURALES = ("patrones_sensibles", "tipos_dato_candidatos", "aceptaciones_riesgo")


class EmpresaNoEncontrada(Exception):
    pass


class EmpresaInvalida(ValueError):
    """Datos de empresa o de perfil que no cumplen las validaciones."""


class EmpresaDuplicada(ValueError):
    pass


def validar_dsn(dsn: str) -> str:
    if not RE_DSN.match(dsn):
        raise EmpresaInvalida("El DSN debe tener la forma host[:puerto]/servicio_de_la_PDB (por ejemplo localhost:1521/PDB_CLINICA)")
    return dsn


def validar_perfil(override: dict, default: dict) -> dict:
    """Valida un perfil por empresa contra el perfil por defecto.

    Se admiten las claves de `parametros` del perfil por defecto (con el mismo
    tipo de dato), más patrones_sensibles, tipos_dato_candidatos y
    aceptaciones_riesgo. Las claves desconocidas se rechazan para detectar
    errores de digitación en lugar de ignorarlos en silencio.
    """
    parametros = default["parametros"]
    limpio: dict = {}
    for clave, valor in override.items():
        if clave in parametros:
            esperado = parametros[clave]
            if isinstance(esperado, bool) or isinstance(valor, bool) or type(valor) is not type(esperado):
                raise EmpresaInvalida(f"El parámetro {clave} debe ser de tipo {type(esperado).__name__}")
            if isinstance(esperado, list) and not all(isinstance(x, str) for x in valor):
                raise EmpresaInvalida(f"El parámetro {clave} debe ser una lista de textos")
            if isinstance(esperado, int) and valor < 0:
                raise EmpresaInvalida(f"El parámetro {clave} no puede ser negativo")
            limpio[clave] = valor
        elif clave == "patrones_sensibles":
            for p in valor:
                if not isinstance(p, dict) or not {"patron", "categoria", "nivel"} <= p.keys() or not _RE_PATRON.match(str(p["patron"])):
                    raise EmpresaInvalida("Cada patrón sensible requiere patron (A-Z, 0-9, _), categoria y nivel")
            limpio[clave] = valor
        elif clave == "tipos_dato_candidatos":
            if not all(isinstance(t, str) and _RE_TIPO_DATO.match(t) for t in valor):
                raise EmpresaInvalida("tipos_dato_candidatos solo admite nombres de tipo en mayúsculas")
            limpio[clave] = valor
        elif clave == "aceptaciones_riesgo":
            if not all(_RE_OBS.match(k) and isinstance(v, str) and v.strip() for k, v in valor.items()):
                raise EmpresaInvalida("aceptaciones_riesgo requiere pares OBS-NN -> justificación no vacía")
            limpio[clave] = valor
        else:
            raise EmpresaInvalida(f"Parámetro de perfil desconocido: {clave}")
    return limpio


def perfil_efectivo(default: dict, override: dict) -> dict:
    """Perfil por defecto con las sobrescrituras de la empresa aplicadas."""
    efectivo = copy.deepcopy({k: default[k] for k in ("parametros", *_CLAVES_ESTRUCTURALES)})
    for clave, valor in override.items():
        if clave in efectivo["parametros"]:
            efectivo["parametros"][clave] = valor
        else:
            efectivo[clave] = valor
    return efectivo


def a_publica(fila: Mapping[str, Any]) -> EmpresaPublica:
    return EmpresaPublica(
        id=fila["id"],
        nombre=fila["nombre"],
        sector=fila["sector"],
        dsn=fila["dsn"],
        usuario=fila["usuario"],
        credenciales_guardadas=bool(fila["password_cifrada"]),
        perfil=json.loads(fila["perfil_json"]),
        creada_en=fila["creada_en"],
    )


def crear_empresa(datos: EmpresaCrear, perfil_default: dict) -> EmpresaPublica:
    validar_dsn(datos.dsn)
    perfil = validar_perfil(datos.perfil, perfil_default)
    password_cifrada = cifrar(datos.password) if datos.password else None
    try:
        with almacen.conexion() as con:
            cursor = con.execute(
                "INSERT INTO empresas (nombre, sector, dsn, usuario, password_cifrada, perfil_json, creada_en) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    datos.nombre.strip(),
                    datos.sector.strip(),
                    datos.dsn,
                    datos.usuario.strip(),
                    password_cifrada,
                    json.dumps(perfil, ensure_ascii=False),
                    almacen.ahora_iso(),
                ),
            )
            fila = con.execute("SELECT * FROM empresas WHERE id = ?", (cursor.lastrowid,)).fetchone()
    except sqlite3.IntegrityError as exc:
        raise EmpresaDuplicada(f"Ya existe una empresa llamada {datos.nombre.strip()!r}") from exc
    return a_publica(fila)


def listar_empresas() -> list[EmpresaPublica]:
    with almacen.conexion() as con:
        filas = con.execute("SELECT * FROM empresas ORDER BY nombre").fetchall()
    return [a_publica(f) for f in filas]


def obtener_empresa(empresa_id: int) -> dict[str, Any]:
    """Registro completo (incluye la contraseña cifrada: no exponer fuera del backend)."""
    with almacen.conexion() as con:
        fila = con.execute("SELECT * FROM empresas WHERE id = ?", (empresa_id,)).fetchone()
    if fila is None:
        raise EmpresaNoEncontrada(f"No existe la empresa {empresa_id}")
    return dict(fila)


def actualizar_perfil(empresa_id: int, override: dict, perfil_default: dict) -> EmpresaPublica:
    perfil = validar_perfil(override, perfil_default)
    obtener_empresa(empresa_id)
    with almacen.conexion() as con:
        con.execute(
            "UPDATE empresas SET perfil_json = ? WHERE id = ?",
            (json.dumps(perfil, ensure_ascii=False), empresa_id),
        )
        fila = con.execute("SELECT * FROM empresas WHERE id = ?", (empresa_id,)).fetchone()
    return a_publica(fila)


def perfil_de_empresa(fila: Mapping[str, Any], perfil_default: dict) -> dict:
    return perfil_efectivo(perfil_default, json.loads(fila["perfil_json"]))
