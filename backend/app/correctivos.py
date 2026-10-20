"""Generación de scripts correctivos a partir de los hallazgos.

El instrumento observa y propone; nunca ejecuta. El script resultante lo revisa
y lo aplica el DBA de la empresa bajo su gestión de cambios.

Los valores que vienen de Oracle se incorporan a la plantilla según su contexto,
para que un nombre de objeto inusual no rompa ni altere el SQL generado:

  {campo}     identificador SQL (se entrecomilla si no es un nombre simple)
  {campo!k}   token seguro en mayúsculas: palabra clave, número o nombre de función
  {campo!n}   número
  {campo!l}   contenido de un literal de texto SQL (se duplican las comillas simples)
  {campo!b}   fragmento de nombre para componer un identificador (ej. POL_{campo!b})

Si un valor no es válido en su contexto, el hallazgo se deja como comentario
"REVISAR MANUALMENTE" en lugar de generar SQL dudoso.
"""

from __future__ import annotations

import json
import re
import string
from collections.abc import Mapping, Sequence
from typing import Any

from .catalogo import Catalogo
from .modelos import EntradaCatalogo, Estado, Severidad

_RE_SIMPLE = re.compile(r"^[A-Z][A-Z0-9_$#]{0,127}$")
_RE_TOKEN = re.compile(r"^[A-Z0-9_$#][A-Z0-9_$# ]{0,127}$")
_RE_NUMERO = re.compile(r"^\d+(\.\d+)?$")
_ORDEN_SEVERIDAD = {Severidad.ALTA: 0, Severidad.MEDIA: 1, Severidad.BAJA: 2}


class ErrorRender(ValueError):
    """Un valor no es seguro en el contexto de la plantilla."""


def _identificador(texto: str) -> str:
    if _RE_SIMPLE.match(texto):
        return texto
    if texto and len(texto) <= 128 and '"' not in texto and texto.isprintable():
        return f'"{texto}"'
    raise ErrorRender(f"identificador no válido: {texto!r}")


def _token(texto: str) -> str:
    if _RE_TOKEN.match(texto):
        return texto
    raise ErrorRender(f"token no válido: {texto!r}")


def _numero(texto: str) -> str:
    if _RE_NUMERO.match(texto):
        return texto
    raise ErrorRender(f"número no válido: {texto!r}")


def _literal(texto: str) -> str:
    return texto.replace("\r", " ").replace("\n", " ").replace("'", "''")


def _base(texto: str) -> str:
    if _RE_SIMPLE.match(texto):
        return texto
    raise ErrorRender(f"no se puede usar como parte de un nombre: {texto!r}")


_CONVERSORES = {None: _identificador, "k": _token, "n": _numero, "l": _literal, "b": _base}


class _Formateador(string.Formatter):
    def convert_field(self, value: Any, conversion: str | None) -> str:
        if conversion not in _CONVERSORES:
            raise ErrorRender(f"modificador desconocido: !{conversion}")
        texto = "" if value is None else str(value)
        return _CONVERSORES[conversion](texto)


def plantilla_de(entrada: EntradaCatalogo, hallazgo: Mapping[str, Any]) -> str:
    correctivo = entrada.correctivo
    if correctivo.plantilla is not None:
        return correctivo.plantilla
    tipo = hallazgo.get(correctivo.discriminador)
    try:
        return correctivo.plantillas[tipo]  # type: ignore[index]
    except KeyError as exc:
        raise ErrorRender(f"no hay plantilla para el tipo {tipo!r}") from exc


def renderizar(entrada: EntradaCatalogo, hallazgo: Mapping[str, Any]) -> str:
    return _Formateador().vformat(plantilla_de(entrada, hallazgo), (), dict(hallazgo))


def _comentario(texto: str) -> str:
    return "\n".join(f"-- {linea}" for linea in texto.splitlines() or [""])


def generar_script(
    *,
    empresa: str,
    ejecucion_id: int,
    etiqueta: str,
    fecha: str,
    resultados: Sequence[Mapping[str, Any]],
    catalogo: Catalogo,
) -> str:
    """Script consolidado, ordenado por severidad. `resultados` son los de una
    ejecución: [{obs_id, estado, hallazgos}]."""
    pendientes = [r for r in resultados if r["estado"] == Estado.NO_CUMPLE.value]
    pendientes.sort(key=lambda r: (_ORDEN_SEVERIDAD[catalogo.entrada(r["obs_id"]).severidad], r["obs_id"]))

    lineas = [
        "-- " + "=" * 70,
        "-- Script correctivo generado por el instrumento de auditoría ISO/IEC 27001",
        f"-- Empresa: {empresa} | Ejecución #{ejecucion_id}" + (f" ({etiqueta})" if etiqueta else ""),
        f"-- Generado: {fecha}",
        "--",
        "-- IMPORTANTE: el instrumento NO ejecuta este script. Debe revisarlo y aplicarlo",
        "-- el DBA de la empresa bajo su gestión de cambios: primero en un ambiente de",
        "-- prueba y con respaldo previo. Después, volver a observar para verificar.",
        "-- " + "=" * 70,
        "SET DEFINE OFF",
        "SET SQLBLANKLINES ON",
        "",
    ]
    if not pendientes:
        lineas.append("-- Sin hallazgos que corregir en esta ejecución.")
        return "\n".join(lineas) + "\n"

    ya_emitidas: set[str] = set()
    for resultado in pendientes:
        entrada = catalogo.entrada(resultado["obs_id"])
        hallazgos = resultado["hallazgos"]
        lineas += [
            "-- " + "-" * 70,
            f"-- {entrada.id} | {entrada.control_iso} | {entrada.nombre}",
            f"-- Severidad: {entrada.severidad.value} | Hallazgos: {len(hallazgos)}",
        ]
        if entrada.correctivo.nota:
            lineas.append(_comentario("Nota: " + entrada.correctivo.nota))
        lineas.append("")
        for hallazgo in hallazgos:
            try:
                sentencia = renderizar(entrada, hallazgo)
            except (ErrorRender, KeyError) as exc:
                detalle = json.dumps(hallazgo, ensure_ascii=False).replace("\n", " ")
                lineas.append(f"-- REVISAR MANUALMENTE: no se generó el correctivo ({exc}). Hallazgo: {detalle}")
                lineas.append("")
                continue
            if sentencia in ya_emitidas:
                continue
            ya_emitidas.add(sentencia)
            lineas += [sentencia, ""]
        lineas += [_comentario("Preventivo: " + entrada.preventivo), ""]
    return "\n".join(lineas)
