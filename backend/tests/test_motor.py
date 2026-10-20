import datetime as dt
import decimal

import oracledb
import pytest

from app import motor
from app.descubrimiento import clasificar_columna
from app.modelos import Estado


class _ErrorOracle:
    def __init__(self, codigo, texto):
        self.code = codigo
        self._texto = texto

    def __str__(self):
        return self._texto


def _fallo(codigo, texto):
    return oracledb.DatabaseError(_ErrorOracle(codigo, texto))


@pytest.fixture()
def obs09(catalogo):
    return catalogo.entrada("OBS-09"), catalogo.sql_por_obs["OBS-09"]


PARAMETROS = {"cuentas_dba_autorizadas": ["DBA_X"], "esquemas_negocio": [], "columnas_sensibles": []}


def _ejecutar(monkeypatch, obs09, respuesta, version="21.3.0.0.0"):
    entrada, sql = obs09

    def falso_consultar(conexion, sentencia, binds=None, *, max_filas=None):
        if isinstance(respuesta, Exception):
            raise respuesta
        return respuesta

    monkeypatch.setattr(motor, "consultar", falso_consultar)
    return motor.ejecutar_observable(None, entrada, sql, PARAMETROS, version_servidor=version)


def test_sin_filas_es_cumple(monkeypatch, obs09):
    r = _ejecutar(monkeypatch, obs09, (["grantee", "con_admin_option"], [], False))
    assert r.estado == Estado.CUMPLE and r.hallazgos == []


def test_cada_fila_es_un_hallazgo(monkeypatch, obs09):
    r = _ejecutar(monkeypatch, obs09, (["grantee", "con_admin_option"], [("APP_X", "NO"), ("DEV_X", "YES")], False))
    assert r.estado == Estado.NO_CUMPLE
    assert r.hallazgos == [{"grantee": "APP_X", "con_admin_option": "NO"}, {"grantee": "DEV_X", "con_admin_option": "YES"}]


@pytest.mark.parametrize("codigo", [942, 1031])
def test_falta_de_visibilidad_es_no_evaluable_y_no_no_cumple(monkeypatch, obs09, codigo):
    r = _ejecutar(monkeypatch, obs09, _fallo(codigo, f"ORA-{codigo:05d}: algo"))
    assert r.estado == Estado.NO_EVALUABLE
    assert f"ORA-{codigo:05d}" in r.motivo


def test_otro_error_es_no_evaluable_con_el_error_de_ejecucion(monkeypatch, obs09):
    r = _ejecutar(monkeypatch, obs09, _fallo(904, "ORA-00904: identificador no válido"))
    assert r.estado == Estado.NO_EVALUABLE
    assert r.motivo.startswith("Error de ejecución")


def test_version_menor_a_la_minima_es_no_evaluable(monkeypatch, obs09):
    r = _ejecutar(monkeypatch, obs09, (["grantee", "con_admin_option"], [], False), version="12.2.0.1.0")
    assert r.estado == Estado.NO_EVALUABLE
    assert "19" in r.motivo


def test_columnas_incompletas_incumplen_el_contrato(monkeypatch, obs09):
    r = _ejecutar(monkeypatch, obs09, (["grantee"], [], False))
    assert r.estado == Estado.NO_EVALUABLE
    assert "con_admin_option" in r.motivo


def test_renglon_no_evaluable_no_es_hallazgo():
    hallazgos, motivo = motor.clasificar_filas(["pieza", "no_evaluable"], [(None, "sin respaldos visibles")])
    assert hallazgos == [] and motivo == "sin respaldos visibles"


def test_hallazgos_reales_ganan_al_renglon_no_evaluable(monkeypatch, catalogo):
    entrada, sql = catalogo.entrada("OBS-17"), catalogo.sql_por_obs["OBS-17"]
    parametros = {"dias_backup_reciente": 7}
    monkeypatch.setattr(
        motor,
        "consultar",
        lambda *a, **k: (["pieza", "manejador", "finalizado", "no_evaluable"], [("5", "H", "2026-10-20 10:00", None), (None, None, None, "nota")], False),
    )
    r = motor.ejecutar_observable(None, entrada, sql, parametros, version_servidor="21.3.0.0.0")
    assert r.estado == Estado.NO_CUMPLE and len(r.hallazgos) == 1


def test_falta_un_parametro(monkeypatch, catalogo):
    entrada, sql = catalogo.entrada("OBS-04"), catalogo.sql_por_obs["OBS-04"]
    r = motor.ejecutar_observable(None, entrada, sql, {}, version_servidor="21.3.0.0.0")
    assert r.estado == Estado.NO_EVALUABLE and "dias_inactividad" in r.motivo


def test_serializacion_de_tipos_de_oracle():
    columnas = ["a", "b", "c", "d"]
    fila = (dt.datetime(2026, 10, 20, 8, 30), decimal.Decimal("5"), decimal.Decimal("2.5"), None)
    hallazgos, _ = motor.clasificar_filas(columnas, [fila])
    assert hallazgos == [{"a": "2026-10-20T08:30:00", "b": 5, "c": 2.5, "d": None}]


def test_version_mayor():
    assert motor.version_mayor("21.3.0.0.0") == 21
    assert motor.version_mayor("19.0.0.0.0") == 19


def test_clasificacion_de_columnas_por_nombre(catalogo):
    patrones = catalogo.perfil_default["patrones_sensibles"]
    assert clasificar_columna("NUM_CEDULA", patrones)["categoria"] == "Identificador personal"
    assert clasificar_columna("fecha_nacimiento", patrones)["patron"] == "NACIMIENTO"
    assert clasificar_columna("DIAGNOSTICO", patrones)["nivel"].startswith("Restringido")
    assert clasificar_columna("NOMBRE_PRODUCTO", patrones) is None
