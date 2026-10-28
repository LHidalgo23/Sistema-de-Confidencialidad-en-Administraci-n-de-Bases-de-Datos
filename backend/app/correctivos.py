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
  {campo!m}   texto de un placeholder manual (correctivo.placeholders), sin escapar: lo
              escribió la persona que revisa el script, no el catálogo de Oracle, así
              que puede ser una expresión SQL completa (ver EXPRESION_DE_ENMASCARADO)

Si un valor no es válido en su contexto, el hallazgo se deja como comentario
"REVISAR MANUALMENTE" en lugar de generar SQL dudoso. Un placeholder manual
(correctivo.placeholders) que nadie llenó todavía se sustituye por <SU_NOMBRE> en
mayúsculas, para que la plantilla siga siendo SQL válido y quede marcado con una
advertencia en vez de fallar.
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


def _manual(texto: str) -> str:
    return texto


_CONVERSORES = {None: _identificador, "k": _token, "n": _numero, "l": _literal, "b": _base, "m": _manual}


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


_RE_PENDIENTE = re.compile(r"<[A-Z0-9_]+>")


def advertencias_pendientes(texto: str) -> list[str]:
    """Placeholders <ASI> que quedaron sin resolver: el instrumento no tiene de
    dónde sacar ese valor (es un secreto o una decisión propia del negocio)."""
    return sorted(set(_RE_PENDIENTE.findall(texto)))


def valores_por_defecto(entrada: EntradaCatalogo) -> dict[str, str]:
    """<TOKEN> de respaldo para cada placeholder manual declarado: si nadie llenó
    todavía un valor real, la plantilla muestra el hueco en vez de fallar."""
    return {p.token: f"<{p.token.upper()}>" for p in entrada.correctivo.placeholders}


def clave_hallazgo(entrada: EntradaCatalogo, hallazgo: Mapping[str, Any]) -> str:
    """Identifica una fila dentro de un observable (columnas `identificador` del
    catálogo), para asociarle valores manuales propios de esa fila."""
    return "|".join(str(hallazgo.get(c, "")) for c in entrada.observable.identificador)


def contexto_hallazgo(entrada: EntradaCatalogo, hallazgo: Mapping[str, Any]) -> str:
    """Versión legible de clave_hallazgo, para mostrar junto a cada campo manual."""
    return ", ".join(f"{c}: {hallazgo.get(c)}" for c in entrada.observable.identificador)


def renderizar_sql(
    plantilla: str,
    hallazgo: Mapping[str, Any],
    parametros: Mapping[str, Any] = {},
    valores_por_defecto: Mapping[str, Any] = {},
) -> str:
    """Sustituye {campo}: primero con el hallazgo o el perfil de política, y si ninguno
    lo tiene, con el <TOKEN> de respaldo de un placeholder manual sin llenar."""
    contexto = {**valores_por_defecto, **parametros, **hallazgo}
    return _Formateador().vformat(plantilla, (), contexto)


def renderizar(entrada: EntradaCatalogo, hallazgo: Mapping[str, Any], parametros: Mapping[str, Any] = {}) -> str:
    return renderizar_sql(plantilla_de(entrada, hallazgo), hallazgo, parametros, valores_por_defecto(entrada))


def _comentario(texto: str) -> str:
    return "\n".join(f"-- {linea}" for linea in texto.splitlines() or [""])


def _con_advertencia(sql: str) -> list[str]:
    pendientes = advertencias_pendientes(sql)
    if not pendientes:
        return [sql]
    aviso = _comentario(
        f"⚠ COMPLETAR A MANO antes de ejecutar ({', '.join(pendientes)}): "
        "el instrumento no puede generar este valor (es un secreto o depende del negocio)."
    )
    return [aviso, sql]


def generar_script(
    *,
    empresa: str,
    ejecucion_id: int,
    etiqueta: str,
    fecha: str,
    resultados: Sequence[Mapping[str, Any]],
    catalogo: Catalogo,
    parametros: Mapping[str, Any] = {},
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
        defaults = valores_por_defecto(entrada)
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
                sentencia = renderizar_sql(plantilla_de(entrada, hallazgo), hallazgo, parametros, defaults)
            except (ErrorRender, KeyError) as exc:
                detalle = json.dumps(hallazgo, ensure_ascii=False).replace("\n", " ")
                lineas.append(f"-- REVISAR MANUALMENTE: no se generó el correctivo ({exc}). Hallazgo: {detalle}")
                lineas.append("")
                continue
            if sentencia in ya_emitidas:
                continue
            ya_emitidas.add(sentencia)
            for paso in entrada.correctivo.pasos:
                try:
                    sql_paso = renderizar_sql(paso.sql, hallazgo, parametros, defaults)
                except (ErrorRender, KeyError):
                    continue
                etiqueta_paso = f"Si {paso.condicion}:" if paso.condicion else "Paso previo:"
                lineas += [_comentario(etiqueta_paso), *_con_advertencia(sql_paso), ""]
            lineas += [*_con_advertencia(sentencia), ""]
        lineas += [_comentario("Preventivo: " + entrada.preventivo), ""]
    return "\n".join(lineas)


def _pendientes_de(texto: str, placeholders: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Placeholders <TOKEN> que quedaron en `texto`, con su metadato del catálogo
    (alcance y guía) para que la pantalla sepa qué campo pedir y cómo explicarlo."""
    salida = []
    for marcador in advertencias_pendientes(texto):
        token = marcador.strip("<>").lower()
        meta = placeholders.get(token)
        salida.append(
            {"token": token, "alcance": meta.alcance, "guia": meta.guia} if meta else {"token": token, "alcance": "por_hallazgo", "guia": ""}
        )
    return salida


def detalle_correctivos(
    resultados: Sequence[Mapping[str, Any]],
    catalogo: Catalogo,
    parametros: Mapping[str, Any] = {},
) -> list[dict[str, Any]]:
    """Lo mismo que generar_script, pero como lista estructurada por observable y por
    hallazgo (sin ensamblar en un solo texto), para la pantalla de revisión de
    correctivos: qué está listo, qué necesita un dato manual, y de dónde sacarlo."""
    pendientes = [r for r in resultados if r["estado"] == Estado.NO_CUMPLE.value]
    pendientes.sort(key=lambda r: (_ORDEN_SEVERIDAD[catalogo.entrada(r["obs_id"]).severidad], r["obs_id"]))

    salida = []
    for resultado in pendientes:
        entrada = catalogo.entrada(resultado["obs_id"])
        defaults = valores_por_defecto(entrada)
        placeholders = {p.token: p for p in entrada.correctivo.placeholders}
        items: list[dict[str, Any]] = []
        emitidas: set[str] = set()
        for hallazgo in resultado["hallazgos"]:
            try:
                sentencia = renderizar_sql(plantilla_de(entrada, hallazgo), hallazgo, parametros, defaults)
            except (ErrorRender, KeyError) as exc:
                items.append({"clave": clave_hallazgo(entrada, hallazgo), "contexto": contexto_hallazgo(entrada, hallazgo), "script": None, "error": str(exc), "pasos": [], "pendientes": []})
                continue
            if sentencia in emitidas:
                continue
            emitidas.add(sentencia)
            pasos = []
            for paso in entrada.correctivo.pasos:
                try:
                    sql_paso = renderizar_sql(paso.sql, hallazgo, parametros, defaults)
                except (ErrorRender, KeyError):
                    continue
                pasos.append({"condicion": paso.condicion, "script": sql_paso, "pendientes": _pendientes_de(sql_paso, placeholders)})
            items.append(
                {
                    "clave": clave_hallazgo(entrada, hallazgo),
                    "contexto": contexto_hallazgo(entrada, hallazgo),
                    "script": sentencia,
                    "error": None,
                    "pasos": pasos,
                    "pendientes": _pendientes_de(sentencia, placeholders),
                }
            )
        salida.append(
            {
                "obs_id": entrada.id,
                "nombre": entrada.nombre,
                "severidad": entrada.severidad.value,
                "nota": entrada.correctivo.nota,
                "preventivo": entrada.preventivo,
                "requiere_manual": bool(entrada.correctivo.placeholders),
                "items": items,
            }
        )
    return salida


def aplicar_valores_manuales(
    resultados: Sequence[Mapping[str, Any]],
    catalogo: Catalogo,
    valores_por_hallazgo: Mapping[str, Mapping[str, Mapping[str, Any]]],
) -> list[dict[str, Any]]:
    """Copia `resultados` mezclando en cada hallazgo los valores manuales que la
    persona escribió para esa fila (identificada por clave_hallazgo), sin tocar los
    resultados originales de la ejecución guardados en el almacén."""
    salida = []
    for resultado in resultados:
        nuevo = dict(resultado)
        valores_obs = valores_por_hallazgo.get(resultado["obs_id"])
        if valores_obs and resultado.get("hallazgos"):
            entrada = catalogo.entrada(resultado["obs_id"])
            nuevo["hallazgos"] = [{**h, **valores_obs.get(clave_hallazgo(entrada, h), {})} for h in resultado["hallazgos"]]
        salida.append(nuevo)
    return salida
