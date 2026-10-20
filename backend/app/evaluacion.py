"""Madurez 0-4 y estado por control ISO.

La regla es idéntica a la del informe (docs/informe.md, sección 6.5):

  % de observables OK    0 %  -> 0      < 50 % -> 1      >= 50 % -> 2      100 % -> 3
  100 % + auditoría activa + revisión registrada                            -> 4
  Estado: 0-1 No cumple · 2 Parcial · 3-4 Cumple · "No evaluable" si no se pudo observar.

Criterios de aplicación documentados (decisiones del instrumento):
  * Un observable "No evaluable" no cuenta a favor ni en contra: el porcentaje se
    calcula sobre los observables evaluables del control.
  * El nivel 4 exige además cobertura completa (todos los observables evaluados).
  * "Auditoría activa" = OBS-18 y OBS-19 en Cumple (hay auditoría unificada sobre
    las tablas sensibles y sobre los eventos críticos).
  * "Revisión registrada" = la ejecución fue revisada y firmada en la herramienta.
  * Una aceptación de riesgo documentada eleva a Parcial un control cuyos únicos
    hallazgos están aceptados; nunca lo lleva a Cumple.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

from .catalogo import Catalogo
from .modelos import ControlISO, EntradaCatalogo, Estado

OBSERVABLES_DE_AUDITORIA = ("OBS-18", "OBS-19")


def calcular_madurez(
    ok: int,
    total: int,
    *,
    auditoria_activa: bool = False,
    revision_registrada: bool = False,
) -> int:
    if total <= 0:
        raise ValueError("no hay observables evaluables")
    if not 0 <= ok <= total:
        raise ValueError("observables OK fuera de rango")
    if ok == 0:
        return 0
    if ok * 2 < total:
        return 1
    if ok < total:
        return 2
    return 4 if (auditoria_activa and revision_registrada) else 3


def estado_desde_madurez(madurez: int) -> Estado:
    if madurez <= 1:
        return Estado.NO_CUMPLE
    if madurez == 2:
        return Estado.PARCIAL
    return Estado.CUMPLE


def auditoria_activa(estados: Mapping[str, Estado]) -> bool:
    return all(estados.get(obs) == Estado.CUMPLE for obs in OBSERVABLES_DE_AUDITORIA)


@dataclass(frozen=True)
class ResultadoControl:
    control_id: str
    nombre: str
    nucleo: bool
    madurez: int | None
    estado: Estado
    observables_total: int
    observables_evaluados: int
    observables_ok: int
    no_evaluables: list[str] = field(default_factory=list)
    con_hallazgos: list[str] = field(default_factory=list)
    aceptado: bool = False
    justificacion: str | None = None

    @property
    def cobertura(self) -> float:
        return self.observables_evaluados / self.observables_total if self.observables_total else 0.0


def evaluar_control(
    control: ControlISO,
    entradas: Sequence[EntradaCatalogo],
    estados: Mapping[str, Estado],
    *,
    auditoria_activa: bool = False,
    revision_registrada: bool = False,
    aceptaciones: Mapping[str, str] | None = None,
) -> ResultadoControl:
    aceptaciones = aceptaciones or {}
    evaluables = [e for e in entradas if estados.get(e.id) in (Estado.CUMPLE, Estado.NO_CUMPLE)]
    no_evaluables = [e.id for e in entradas if e.id not in {x.id for x in evaluables}]
    con_hallazgos = [e.id for e in evaluables if estados[e.id] == Estado.NO_CUMPLE]
    base = dict(
        control_id=control.id,
        nombre=control.nombre,
        nucleo=control.nucleo,
        observables_total=len(entradas),
        observables_evaluados=len(evaluables),
        no_evaluables=no_evaluables,
        con_hallazgos=con_hallazgos,
    )
    if not evaluables:
        return ResultadoControl(madurez=None, estado=Estado.NO_EVALUABLE, observables_ok=0, **base)

    ok = len(evaluables) - len(con_hallazgos)
    cobertura_completa = len(evaluables) == len(entradas)
    madurez = calcular_madurez(
        ok,
        len(evaluables),
        auditoria_activa=auditoria_activa,
        revision_registrada=revision_registrada and cobertura_completa,
    )

    aceptado = False
    justificacion = None
    if con_hallazgos and all(obs in aceptaciones for obs in con_hallazgos):
        justificacion = " | ".join(f"{obs}: {aceptaciones[obs]}" for obs in con_hallazgos)
        if madurez < 2:
            madurez = 2
            aceptado = True

    return ResultadoControl(
        madurez=madurez,
        estado=estado_desde_madurez(madurez),
        observables_ok=ok,
        aceptado=aceptado,
        justificacion=justificacion,
        **base,
    )


def evaluar_controles(
    catalogo: Catalogo,
    estados: Mapping[str, Estado],
    *,
    revision_registrada: bool = False,
    aceptaciones: Mapping[str, str] | None = None,
) -> list[ResultadoControl]:
    activa = auditoria_activa(estados)
    resultados = []
    for control in catalogo.controles_iso:
        entradas = catalogo.entradas_de_control(control.id)
        if not entradas:
            continue
        resultados.append(
            evaluar_control(
                control,
                entradas,
                estados,
                auditoria_activa=activa,
                revision_registrada=revision_registrada,
                aceptaciones=aceptaciones,
            )
        )
    return resultados
