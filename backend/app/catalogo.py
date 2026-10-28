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

    def mapeo(self) -> list[dict]:
        """Mapeo de controles: control, riesgos, tareas, justificación, implementación y evidencia."""
        tareas = {t.id: t.nombre for t in self.tareas}
        filas = []
        for control in self.controles_iso:
            entradas = self.entradas_de_control(control.id)
            if not entradas:
                continue
            filas.append(
                {
                    "control_id": control.id,
                    "nombre": control.nombre,
                    "tema": control.tema,
                    "nucleo": control.nucleo,
                    "riesgos": sorted({e.riesgo for e in entradas}),
                    "tareas": [f"{t} {tareas[t]}" for t in sorted({e.tarea for e in entradas})],
                    "justificacion": control.justificacion,
                    "implementacion": control.implementacion,
                    "evidencia": control.evidencia,
                    "observables": [e.id for e in entradas],
                }
            )
        return filas

    def bateria(self) -> list[dict]:
        """Batería de pruebas: ID, tipo, procedimiento, resultado esperado y herramienta."""
        filas = []
        for e in self.entradas:
            variables = sorted(extraer_binds(self.sql_por_obs[e.id]))
            usa = f"con las variables {', '.join(':' + v for v in variables)}" if variables else "sin variables"
            filas.append(
                {
                    "id": e.id,
                    "control_iso": e.control_iso,
                    "tipo": e.tipo_prueba,
                    "procedimiento": f"Ejecutar instrumento/{e.observable.archivo} {usa}. Cada fila devuelta es un hallazgo.",
                    "resultado_esperado": e.resultado_esperado,
                    "herramienta": "Instrumento (motor de observables); SQL Developer o SQL*Plus con el mismo .sql",
                    "alcance": e.alcance,
                }
            )
        return filas


def extraer_binds(sql: str) -> set[str]:
    """Nombres de variables bind de una sentencia, ignorando comentarios y literales."""
    limpio = _TOKENS_SQL_IGNORABLES.sub(" ", sql)
    return {m.lower() for m in _RE_BIND.findall(limpio)}


def campos_de_plantilla(plantilla: str) -> set[str]:
    """Nombres de campo `{campo}` / `{campo!x}` usados por una plantilla."""
    return {campo for _, campo, _, _ in string.Formatter().parse(plantilla) if campo}


def campos_manuales(plantilla: str) -> set[str]:
    """Nombres de campo usados con `!m` (texto sin escapar): solo deben ser
    placeholders manuales declarados, nunca columnas del observable."""
    return {campo for _, campo, _, conversion in string.Formatter().parse(plantilla) if campo and conversion == "m"}


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
        placeholders = {p.token for p in e.correctivo.placeholders}
        campos_validos = columnas | binds_conocidos | placeholders  # hallazgo, política o placeholder manual
        plantillas = (
            list(e.correctivo.plantillas.values()) if e.correctivo.plantillas else [e.correctivo.plantilla or ""]
        )
        plantillas += [paso.sql for paso in e.correctivo.pasos]
        usados_en_total: set[str] = set()
        manuales_en_total: set[str] = set()
        for plantilla in plantillas:
            try:
                usados = campos_de_plantilla(plantilla)
            except ValueError as exc:
                problemas.append(f"{e.id}: plantilla inválida ({exc})")
                continue
            if usados - campos_validos:
                problemas.append(
                    f"{e.id}: la plantilla usa campos que no son ni columnas del observable, "
                    f"ni parámetros de política, ni placeholders declarados: {sorted(usados - campos_validos)}"
                )
            usados_en_total |= usados
            manuales_en_total |= campos_manuales(plantilla)
        if manuales_en_total - placeholders:
            problemas.append(f"{e.id}: usa !m en campos que no son placeholders manuales declarados: {sorted(manuales_en_total - placeholders)}")
        sin_usar = placeholders - usados_en_total
        if sin_usar:
            problemas.append(f"{e.id}: declara placeholders que ninguna plantilla usa: {sorted(sin_usar)}")
        if not e.observable.identificador or set(e.observable.identificador) - columnas:
            problemas.append(f"{e.id}: el identificador debe ser un subconjunto no vacío de las columnas del observable")
        if e.correctivo.discriminador and e.correctivo.discriminador not in columnas:
            problemas.append(f"{e.id}: el discriminador {e.correctivo.discriminador} no es una columna del observable")

    for control in catalogo.controles_iso:
        if not (control.justificacion.strip() and control.implementacion.strip() and control.evidencia.strip()):
            problemas.append(f"el control {control.id} necesita justificación, implementación y evidencia")
        if control.nucleo and not catalogo.entradas_de_control(control.id):
            problemas.append(f"el control núcleo {control.id} no tiene ningún observable")
    return problemas
