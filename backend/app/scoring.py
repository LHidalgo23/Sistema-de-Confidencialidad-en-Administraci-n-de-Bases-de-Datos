"""Regla de madurez (0-4) y estado (Cumple/Parcial/No cumple).

Misma regla que debe citarse en el informe (docs/informe.md, sección 6.5):

  0 pruebas pasan                                   -> madurez 0
  < 50% de las pruebas del control pasan             -> madurez 1
  >= 50% (y < 100%)                                  -> madurez 2
  100%                                                -> madurez 3
  100% + auditoría activa sobre el control
        + evidencia de revisión                       -> madurez 4

  Estado: 0-1 No cumple · 2 Parcial · 3-4 Cumple
"""

from .models import Estado, ResultadoPrueba


def calcular_madurez(
    resultados: list[ResultadoPrueba],
    auditoria_activa: bool = False,
    evidencia_revision: bool = False,
) -> int:
    if not resultados:
        return 0

    total = len(resultados)
    aprobadas = sum(1 for r in resultados if r.paso)
    porcentaje = aprobadas / total

    if aprobadas == 0:
        return 0
    if porcentaje < 0.5:
        return 1
    if porcentaje < 1.0:
        return 2
    # porcentaje == 1.0
    if auditoria_activa and evidencia_revision:
        return 4
    return 3


def estado_desde_madurez(madurez: int) -> Estado:
    if madurez <= 1:
        return Estado.NO_CUMPLE
    if madurez == 2:
        return Estado.PARCIAL
    return Estado.CUMPLE
