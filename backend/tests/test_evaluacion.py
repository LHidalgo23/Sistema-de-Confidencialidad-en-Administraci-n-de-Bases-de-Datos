import pytest

from app.evaluacion import (
    auditoria_activa,
    calcular_madurez,
    estado_desde_madurez,
    evaluar_control,
    evaluar_controles,
)
from app.modelos import Estado


@pytest.mark.parametrize(
    "ok,total,esperado",
    [(0, 4, 0), (1, 4, 1), (1, 3, 1), (2, 4, 2), (1, 2, 2), (3, 4, 2), (4, 4, 3), (1, 1, 3), (0, 1, 0)],
)
def test_madurez_segun_el_porcentaje(ok, total, esperado):
    assert calcular_madurez(ok, total) == esperado


def test_nivel_4_exige_auditoria_activa_y_revision():
    assert calcular_madurez(3, 3, auditoria_activa=True, revision_registrada=False) == 3
    assert calcular_madurez(3, 3, auditoria_activa=False, revision_registrada=True) == 3
    assert calcular_madurez(3, 3, auditoria_activa=True, revision_registrada=True) == 4


def test_auditoria_y_revision_no_suben_un_control_con_hallazgos():
    assert calcular_madurez(2, 3, auditoria_activa=True, revision_registrada=True) == 2


def test_entradas_invalidas():
    with pytest.raises(ValueError):
        calcular_madurez(0, 0)
    with pytest.raises(ValueError):
        calcular_madurez(5, 4)


@pytest.mark.parametrize(
    "madurez,estado",
    [(0, Estado.NO_CUMPLE), (1, Estado.NO_CUMPLE), (2, Estado.PARCIAL), (3, Estado.CUMPLE), (4, Estado.CUMPLE)],
)
def test_estado_desde_madurez(madurez, estado):
    assert estado_desde_madurez(madurez) == estado


def _control(catalogo, control_id):
    return next(c for c in catalogo.controles_iso if c.id == control_id), catalogo.entradas_de_control(control_id)


def test_control_con_todo_cumplido(catalogo):
    control, entradas = _control(catalogo, "A8.2")
    estados = {e.id: Estado.CUMPLE for e in entradas}
    resultado = evaluar_control(control, entradas, estados)
    assert (resultado.madurez, resultado.estado) == (3, Estado.CUMPLE)
    assert resultado.cobertura == 1.0


def test_no_evaluable_no_se_marca_como_no_cumple(catalogo):
    control, entradas = _control(catalogo, "A8.2")
    estados = {e.id: Estado.NO_EVALUABLE for e in entradas}
    resultado = evaluar_control(control, entradas, estados)
    assert resultado.estado == Estado.NO_EVALUABLE
    assert resultado.madurez is None


def test_parcialmente_evaluable_calcula_sobre_lo_evaluado(catalogo):
    control, entradas = _control(catalogo, "A8.2")  # OBS-09, OBS-10, OBS-11
    estados = {"OBS-09": Estado.CUMPLE, "OBS-10": Estado.CUMPLE, "OBS-11": Estado.NO_EVALUABLE}
    resultado = evaluar_control(control, entradas, estados, auditoria_activa=True, revision_registrada=True)
    assert resultado.madurez == 3, "sin cobertura completa no se concede el nivel 4"
    assert resultado.no_evaluables == ["OBS-11"]
    assert round(resultado.cobertura, 2) == 0.67


def test_nivel_4_con_cobertura_completa(catalogo):
    control, entradas = _control(catalogo, "A8.2")
    estados = {e.id: Estado.CUMPLE for e in entradas}
    resultado = evaluar_control(control, entradas, estados, auditoria_activa=True, revision_registrada=True)
    assert resultado.madurez == 4


def test_aceptacion_de_riesgo_eleva_a_parcial_pero_no_a_cumple(catalogo):
    control, entradas = _control(catalogo, "A8.8")  # solo OBS-24
    estados = {"OBS-24": Estado.NO_CUMPLE}
    sin_aceptacion = evaluar_control(control, entradas, estados)
    assert sin_aceptacion.estado == Estado.NO_CUMPLE

    con_aceptacion = evaluar_control(control, entradas, estados, aceptaciones={"OBS-24": "Oracle XE no recibe RU trimestrales"})
    assert con_aceptacion.estado == Estado.PARCIAL
    assert con_aceptacion.aceptado is True
    assert "XE" in con_aceptacion.justificacion


def test_aceptacion_parcial_no_cubre_otros_hallazgos(catalogo):
    control, entradas = _control(catalogo, "A8.2")
    estados = {"OBS-09": Estado.NO_CUMPLE, "OBS-10": Estado.NO_CUMPLE, "OBS-11": Estado.NO_CUMPLE}
    resultado = evaluar_control(control, entradas, estados, aceptaciones={"OBS-11": "justificado"})
    assert resultado.estado == Estado.NO_CUMPLE
    assert resultado.aceptado is False


def test_un_observable_cuenta_para_sus_controles_adicionales(catalogo):
    estados = {e.id: Estado.CUMPLE for e in catalogo.entradas}
    por_control = {c.control_id: c for c in evaluar_controles(catalogo, estados)}
    assert "A5.16" in por_control and "A5.17" in por_control, "OBS-05 cuenta para A5.17 y A5.16"
    assert "A8.31" in por_control and "A8.33" in por_control, "OBS-23 cuenta para A8.33 y A8.31"
    assert len(por_control) == 19


def test_auditoria_activa_requiere_obs_18_y_obs_19():
    assert auditoria_activa({"OBS-18": Estado.CUMPLE, "OBS-19": Estado.CUMPLE})
    assert not auditoria_activa({"OBS-18": Estado.CUMPLE, "OBS-19": Estado.NO_CUMPLE})
    assert not auditoria_activa({"OBS-18": Estado.CUMPLE})
