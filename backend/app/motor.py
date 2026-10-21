"""Motor de evaluación: ejecuta los observables del catálogo con variables bind.

Cada observable es una consulta de solo lectura sobre catálogo y metadatos.
Cada fila devuelta es un hallazgo. Una fila con la columna reservada
NO_EVALUABLE significa "no se pudo observar" y no cuenta como hallazgo.
"""

from __future__ import annotations

import datetime as dt
import decimal
from collections.abc import Mapping
from dataclasses import dataclass, field
from time import perf_counter
from typing import Any

import oracledb

from .catalogo import COLUMNA_NO_EVALUABLE, Catalogo, extraer_binds
from .conexiones import codigo_ora, consultar, mensaje_oracle
from .modelos import EntradaCatalogo, Estado

CODIGOS_SIN_VISIBILIDAD = frozenset({942, 1031})  # ORA-00942, ORA-01031


class ParametroFaltante(Exception):
    def __init__(self, nombres: list[str]):
        super().__init__(f"Faltan parámetros para el observable: {', '.join(nombres)}")
        self.nombres = nombres


@dataclass
class ResultadoObservable:
    obs_id: str
    estado: Estado
    hallazgos: list[dict[str, Any]] = field(default_factory=list)
    motivo: str | None = None
    duracion_ms: int = 0
    truncado: bool = False
    origen: str = "PDB"  # conexión con la que se observó: "PDB" o "Instancia"


def version_mayor(version: str) -> int:
    """'21.3.0.0.0' -> 21."""
    return int(version.split(".")[0])


def motivo_por_version(entrada: EntradaCatalogo, version_servidor: str) -> str | None:
    if version_mayor(version_servidor) < entrada.version_min:
        return f"Requiere Oracle {entrada.version_min} o superior (servidor {version_servidor})"
    return None


def _serializable(valor: Any) -> Any:
    if valor is None or isinstance(valor, (str, int, float, bool)):
        return valor
    if isinstance(valor, (dt.datetime, dt.date)):
        return valor.isoformat()
    if isinstance(valor, decimal.Decimal):
        return int(valor) if valor == valor.to_integral_value() else float(valor)
    if hasattr(valor, "read"):  # LOB
        return valor.read()
    return str(valor)


def clasificar_filas(columnas: list[str], filas: list[tuple]) -> tuple[list[dict[str, Any]], str | None]:
    """Separa hallazgos reales de renglones NO_EVALUABLE."""
    hallazgos: list[dict[str, Any]] = []
    motivo_no_evaluable: str | None = None
    for fila in filas:
        registro = {c: _serializable(v) for c, v in zip(columnas, fila)}
        motivo = registro.pop(COLUMNA_NO_EVALUABLE, None)
        if motivo:
            motivo_no_evaluable = motivo_no_evaluable or str(motivo)
            continue
        hallazgos.append(registro)
    return hallazgos, motivo_no_evaluable


def construir_binds(sql: str, parametros: Mapping[str, Any]) -> dict[str, Any]:
    nombres = extraer_binds(sql)
    faltantes = sorted(nombres - parametros.keys())
    if faltantes:
        raise ParametroFaltante(faltantes)
    return {nombre: parametros[nombre] for nombre in nombres}


def ejecutar_observable(
    conexion: oracledb.Connection,
    entrada: EntradaCatalogo,
    sql: str,
    parametros: Mapping[str, Any],
    *,
    version_servidor: str,
    max_filas: int | None = None,
    origen: str = "PDB",
) -> ResultadoObservable:
    inicio = perf_counter()

    def resultado(estado: Estado, **kwargs) -> ResultadoObservable:
        return ResultadoObservable(
            obs_id=entrada.id,
            estado=estado,
            origen=origen,
            duracion_ms=int((perf_counter() - inicio) * 1000),
            **kwargs,
        )

    motivo = motivo_por_version(entrada, version_servidor)
    if motivo:
        return resultado(Estado.NO_EVALUABLE, motivo=motivo)

    try:
        binds = construir_binds(sql, parametros)
    except ParametroFaltante as exc:
        return resultado(Estado.NO_EVALUABLE, motivo=str(exc))

    try:
        columnas, filas, truncado = consultar(conexion, sql, binds, max_filas=max_filas)
    except oracledb.Error as exc:
        codigo = codigo_ora(exc)
        if codigo in CODIGOS_SIN_VISIBILIDAD:
            return resultado(
                Estado.NO_EVALUABLE,
                motivo=f"El usuario auditor no tiene visibilidad suficiente para observar este control (ORA-{codigo:05d})",
            )
        return resultado(Estado.NO_EVALUABLE, motivo=f"Error de ejecución: {mensaje_oracle(exc)}")

    faltan = set(entrada.observable.columnas) - set(columnas)
    if faltan:
        return resultado(
            Estado.NO_EVALUABLE,
            motivo=f"El observable no devuelve las columnas declaradas en el catálogo: {sorted(faltan)}",
        )

    hallazgos, motivo_no_evaluable = clasificar_filas(columnas, filas)
    if hallazgos:
        return resultado(Estado.NO_CUMPLE, hallazgos=hallazgos, truncado=truncado)
    if motivo_no_evaluable:
        return resultado(Estado.NO_EVALUABLE, motivo=motivo_no_evaluable)
    return resultado(Estado.CUMPLE)


def auditar(
    conexion: oracledb.Connection,
    catalogo: Catalogo,
    parametros: Mapping[str, Any],
    *,
    version_servidor: str,
    conexion_instancia: oracledb.Connection | None = None,
    max_filas: int | None = None,
) -> list[ResultadoObservable]:
    """Ejecuta todos los observables del catálogo.

    Los de alcance "Instancia" (respaldos, parámetros, sesiones, parches) solo son visibles desde
    CDB$ROOT: si la empresa tiene conexión de instancia se observan con ella; si no, se observan
    desde la PDB y pueden salir "No evaluable".
    """
    resultados = []
    for entrada in catalogo.entradas:
        de_instancia = entrada.alcance == "Instancia" and conexion_instancia is not None
        resultados.append(
            ejecutar_observable(
                conexion_instancia if de_instancia else conexion,
                entrada,
                catalogo.sql_por_obs[entrada.id],
                parametros,
                version_servidor=version_servidor,
                max_filas=max_filas,
                origen="Instancia" if de_instancia else "PDB",
            )
        )
    return resultados
