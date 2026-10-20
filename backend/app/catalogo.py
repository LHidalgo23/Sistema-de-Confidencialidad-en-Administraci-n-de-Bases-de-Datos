"""Carga y validación del catálogo del instrumento.

El catálogo es dato, no código: agregar un control es agregar una entrada en
catalogo_controles.json y su archivo .sql, sin tocar este módulo.
"""

from __future__ import annotations

import json
import re
import string
from dataclasses import dataclass, field
from pathlib import Path

from .config import get_config
from .modelos import ControlISO, EntradaCatalogo, Riesgo, Tarea

# Variables bind que el motor sabe resolver además de las del perfil de política.
BINDS_DEL_MOTOR = frozenset({"esquemas_negocio", "columnas_sensibles"})

_RE_IDENTIFICADOR_OBJETO = re.compile(r"^[A-Z][A-Z0-9_$]*$")
_TOKENS_SQL_IGNORABLES = re.compile(r"--[^\n]*|/\*.*?\*/|'(?:[^']|'')*'", re.DOTALL)
_RE_BIND = re.compile(r"(?<![\w:]):([A-Za-z_][A-Za-z0-9_]*)")
COLUMNA_NO_EVALUABLE = "no_evaluable"


class CatalogoInvalido(Exception):
    """El catálogo no cumple su contrato."""


@dataclass
class Catalogo:
    entradas: list[EntradaCatalogo]
    controles_iso: list[ControlISO]
    riesgos: list[Riesgo]
    tareas: list[Tarea]
    perfil_default: dict
    sql_por_obs: dict[str, str] = field(default_factory=dict)

    def entrada(self, obs_id: str) -> EntradaCatalogo:
        for e in self.entradas:
            if e.id == obs_id:
                return e
        raise KeyError(obs_id)

    def entradas_de_control(self, control_id: str) -> list[EntradaCatalogo]:
        return [e for e in self.entradas if control_id in e.controles]


def extraer_binds(sql: str) -> set[str]:
    """Nombres de variables bind de una sentencia, ignorando comentarios y literales."""
    limpio = _TOKENS_SQL_IGNORABLES.sub(" ", sql)
    return {m.lower() for m in _RE_BIND.findall(limpio)}


def campos_de_plantilla(plantilla: str) -> set[str]:
    """Nombres de campo `{campo}` / `{campo!x}` usados por una plantilla."""
    return {campo for _, campo, _, _ in string.Formatter().parse(plantilla) if campo}


def _leer_json(ruta: Path):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CatalogoInvalido(f"No existe {ruta}") from exc
    except json.JSONDecodeError as exc:
        raise CatalogoInvalido(f"JSON inválido en {ruta}: {exc}") from exc


def cargar_catalogo(directorio: Path | None = None) -> Catalogo:
    base = (directorio or get_config().instrumento_dir).resolve()
    entradas = [EntradaCatalogo(**e) for e in _leer_json(base / "catalogo_controles.json")]
    catalogo = Catalogo(
        entradas=entradas,
        controles_iso=[ControlISO(**c) for c in _leer_json(base / "controles_iso.json")],
        riesgos=[Riesgo(**r) for r in _leer_json(base / "riesgos.json")],
        tareas=[Tarea(**t) for t in _leer_json(base / "tareas.json")],
        perfil_default=_leer_json(base / "perfil_politica_default.json"),
    )
    for entrada in entradas:
        ruta = (base / entrada.observable.archivo).resolve()
        if not ruta.is_relative_to(base) or not ruta.is_file():
            raise CatalogoInvalido(f"{entrada.id}: el archivo {entrada.observable.archivo} no existe en el instrumento")
        catalogo.sql_por_obs[entrada.id] = ruta.read_text(encoding="utf-8")
    problemas = validar_catalogo(catalogo)
    if problemas:
        raise CatalogoInvalido("; ".join(problemas))
    return catalogo


def validar_catalogo(catalogo: Catalogo) -> list[str]:
    """Verificaciones estáticas del contrato catálogo <-> SQL <-> plantillas."""
    problemas: list[str] = []
    ids = [e.id for e in catalogo.entradas]
    if len(ids) != len(set(ids)):
        problemas.append("hay identificadores OBS duplicados")

    controles = {c.id for c in catalogo.controles_iso}
    riesgos = {r.id for r in catalogo.riesgos}
    tareas = {t.id for t in catalogo.tareas}
    binds_conocidos = set(catalogo.perfil_default.get("parametros", {})) | BINDS_DEL_MOTOR

    for e in catalogo.entradas:
        for control in e.controles:
            if control not in controles:
                problemas.append(f"{e.id}: control ISO desconocido {control}")
        if e.riesgo not in riesgos:
            problemas.append(f"{e.id}: riesgo desconocido {e.riesgo}")
        if e.tarea not in tareas:
            problemas.append(f"{e.id}: tarea desconocida {e.tarea}")
        for objeto in e.requiere:
            if not _RE_IDENTIFICADOR_OBJETO.match(objeto):
                problemas.append(f"{e.id}: objeto requerido con nombre inválido {objeto!r}")

        sql = catalogo.sql_por_obs.get(e.id, "")
        desconocidos = extraer_binds(sql) - binds_conocidos
        if desconocidos:
            problemas.append(f"{e.id}: variables bind sin parámetro definido: {sorted(desconocidos)}")

        columnas = set(e.observable.columnas)
        plantillas = (
            list(e.correctivo.plantillas.values()) if e.correctivo.plantillas else [e.correctivo.plantilla or ""]
        )
        for plantilla in plantillas:
            try:
                usados = campos_de_plantilla(plantilla)
            except ValueError as exc:
                problemas.append(f"{e.id}: plantilla inválida ({exc})")
                continue
            if usados - columnas:
                problemas.append(f"{e.id}: la plantilla usa columnas que el observable no devuelve: {sorted(usados - columnas)}")
        if not e.observable.identificador or set(e.observable.identificador) - columnas:
            problemas.append(f"{e.id}: el identificador debe ser un subconjunto no vacío de las columnas del observable")
        if e.correctivo.discriminador and e.correctivo.discriminador not in columnas:
            problemas.append(f"{e.id}: el discriminador {e.correctivo.discriminador} no es una columna del observable")

    for control in catalogo.controles_iso:
        if control.nucleo and not catalogo.entradas_de_control(control.id):
            problemas.append(f"el control núcleo {control.id} no tiene ningún observable")
    return problemas
