"""Pruebas de la API sin Oracle: la conexión y el motor se sustituyen por dobles,
de modo que se verifican registro, persistencia, evaluación, matriz y correctivos.
"""

import pytest

from app import descubrimiento, motor, prevuelo, reportes
from app.config import get_config
from app.modelos import Estado
from app.motor import ResultadoObservable


class _ConexionFalsa:
    version = "21.3.0.0.0"

    def __init__(self, instancia=False):
        self.instancia = instancia

    def close(self):
        pass


@pytest.fixture()
def oracle_falso(monkeypatch, catalogo):
    import app.main as principal

    monkeypatch.setattr(principal, "abrir_conexion", lambda fila, password=None, *, instancia=False: _ConexionFalsa(instancia))
    monkeypatch.setattr(prevuelo, "leer_contexto", lambda con: {"contenedor": "PDB_DEMO", "con_id": 3, "tipo_contenedor": "PDB", "usuario": "AUDITOR_ISO"})
    monkeypatch.setattr(descubrimiento, "esquemas_de_negocio", lambda con: [{"esquema": "APP", "tablas": 2}])
    monkeypatch.setattr(
        descubrimiento,
        "columnas_sensibles",
        lambda con, esquemas, perfil: [
            {"esquema": "APP", "tabla": "CLIENTES", "columna": "CEDULA", "tipo_dato": "VARCHAR2", "categoria": "Identificador personal", "nivel": "Confidencial - dato personal"}
        ],
    )

    estado = {"instancia_usada": None, "fallan": {"OBS-09": [{"grantee": "APP_X", "con_admin_option": "NO"}], "OBS-24": [{"version": "XE", "ultimo_parche": "SIN REGISTRO", "dias": "N/D"}]}, "no_evaluables": {"OBS-21"}}

    def auditar_falso(conexion, cat, parametros, *, version_servidor, conexion_instancia=None, max_filas=None):
        estado["instancia_usada"] = conexion_instancia is not None
        resultados = []
        for entrada in cat.entradas:
            if entrada.id in estado["fallan"]:
                resultados.append(ResultadoObservable(entrada.id, Estado.NO_CUMPLE, hallazgos=estado["fallan"][entrada.id]))
            elif entrada.id in estado["no_evaluables"]:
                resultados.append(ResultadoObservable(entrada.id, Estado.NO_EVALUABLE, motivo="sin visibilidad"))
            else:
                resultados.append(ResultadoObservable(entrada.id, Estado.CUMPLE))
        return resultados

    monkeypatch.setattr(motor, "auditar", auditar_falso)
    return estado


def _registrar(cliente, **extra):
    datos = {"nombre": "Empresa Demo", "sector": "Salud", "dsn": "localhost:1521/PDB_DEMO", "usuario": "AUDITOR_ISO", "password": "secreto-123"}
    datos.update(extra)
    return cliente.post("/api/empresas", json=datos)


# ---------------------------------------------------------------- catálogo
def test_endpoints_del_catalogo(cliente):
    catalogo = cliente.get("/api/catalogo").json()
    assert len(catalogo) == 24 and all("sql" in e and e["sql"].lstrip().startswith("--") for e in catalogo)
    assert len(cliente.get("/api/controles-iso").json()) == 19
    assert len(cliente.get("/api/riesgos").json()) == 6
    assert len(cliente.get("/api/tareas").json()) == 12
    assert "parametros" in cliente.get("/api/perfil-default").json()


# ---------------------------------------------------------------- empresas
def test_registrar_empresa_no_expone_ni_guarda_la_contrasena_en_claro(cliente, entorno):
    respuesta = _registrar(cliente)
    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["credenciales_guardadas"] is True
    assert "password" not in cuerpo and "secreto-123" not in respuesta.text
    assert b"secreto-123" not in get_config().db_path.read_bytes()
    assert "secreto-123" not in cliente.get(f"/api/empresas/{cuerpo['id']}").text


def test_registrar_sin_contrasena(cliente):
    respuesta = _registrar(cliente, password=None)
    assert respuesta.status_code == 201 and respuesta.json()["credenciales_guardadas"] is False


def test_sin_llave_no_se_puede_guardar_la_contrasena(cliente, monkeypatch):
    monkeypatch.setenv("AUDITORIA_LLAVE_CIFRADO", "")
    get_config.cache_clear()
    respuesta = _registrar(cliente)
    assert respuesta.status_code == 422 and "AUDITORIA_LLAVE_CIFRADO" in respuesta.json()["detail"]


@pytest.mark.parametrize("dsn", ["localhost", "host:1521", "host/svc; DROP", "(DESCRIPTION=(ADDRESS=x))", "http://x/y"])
def test_dsn_invalido(cliente, dsn):
    assert _registrar(cliente, dsn=dsn).status_code == 422


def test_empresa_duplicada(cliente):
    assert _registrar(cliente).status_code == 201
    assert _registrar(cliente).status_code == 409


def test_perfil_valida_claves_y_tipos(cliente):
    assert _registrar(cliente, nombre="A1", perfil={"dias_inactividad": 30, "cuentas_dba_autorizadas": ["DBA_X"]}).status_code == 201
    assert _registrar(cliente, nombre="A2", perfil={"dias_inactividd": 30}).status_code == 422, "clave mal escrita"
    assert _registrar(cliente, nombre="A3", perfil={"dias_inactividad": "30"}).status_code == 422, "tipo incorrecto"
    assert _registrar(cliente, nombre="A4", perfil={"dias_inactividad": True}).status_code == 422, "bool no es entero"
    assert _registrar(cliente, nombre="A5", perfil={"aceptaciones_riesgo": {"OBS-24": ""}}).status_code == 422


def test_404_en_recursos_inexistentes(cliente):
    assert cliente.get("/api/empresas/999").status_code == 404
    assert cliente.get("/api/ejecuciones/999").status_code == 404
    assert cliente.post("/api/empresas/999/auditar", json={}).status_code == 404


def test_auditar_sin_credenciales_responde_400(cliente):
    empresa = _registrar(cliente, password=None).json()
    respuesta = cliente.post(f"/api/empresas/{empresa['id']}/auditar", json={})
    assert respuesta.status_code == 400


# ---------------------------------------------------------------- flujo completo
def test_ciclo_observar_corregir_reobservar(cliente, oracle_falso):
    empresa = _registrar(cliente, perfil={"aceptaciones_riesgo": {"OBS-24": "Oracle XE no recibe Release Updates trimestrales"}}).json()
    base = f"/api/empresas/{empresa['id']}"

    antes = cliente.post(f"{base}/auditar", json={"etiqueta": "antes"})
    assert antes.status_code == 201
    resumen = antes.json()
    por_control = {c["control_id"]: c for c in resumen["controles"]}
    assert por_control["A8.2"]["estado"] == "Parcial" and por_control["A8.2"]["madurez"] == 2
    assert por_control["A8.8"]["estado"] == "Parcial" and por_control["A8.8"]["aceptado"] is True
    assert por_control["A8.24"]["estado"] == "Cumple", "OBS-21 no evaluable no baja el control; OBS-22 cumple"
    assert por_control["A8.24"]["cobertura"] == 0.5
    assert resumen["conteo_controles"]["No evaluable"] == 0

    # se corrige OBS-09 y se vuelve a observar
    oracle_falso["fallan"].pop("OBS-09")
    despues = cliente.post(f"{base}/auditar", json={"etiqueta": "despues"}).json()
    assert {c["control_id"]: c for c in despues["controles"]}["A8.2"]["estado"] == "Cumple"

    matriz = cliente.get(f"{base}/matriz").json()
    assert (matriz["antes"], matriz["despues"]) == (resumen["id"], despues["id"])
    fila = next(f for f in matriz["filas"] if f["control_id"] == "A8.2")
    assert (fila["estado_antes"], fila["estado_despues"]) == ("Parcial", "Cumple")
    assert fila["correctivo_aplicado"] == "Sí: OBS-09"
    assert "APP_X" in fila["hallazgo"]

    csv = cliente.get(f"{base}/matriz.csv")
    assert csv.headers["content-type"].startswith("text/csv")
    assert csv.text.splitlines()[0].startswith("Empresa,Fecha,Tarea,Riesgo,Control,Hallazgo")

    historial = cliente.get(f"{base}/ejecuciones").json()
    assert [e["id"] for e in historial] == [despues["id"], resumen["id"]]


def test_correctivos_hallazgo_y_plan_de_mejora(cliente, oracle_falso):
    empresa = _registrar(cliente).json()
    ejecucion = cliente.post(f"/api/empresas/{empresa['id']}/auditar", json={"etiqueta": "antes"}).json()
    ejecucion_id = ejecucion["id"]

    script = cliente.get(f"/api/ejecuciones/{ejecucion_id}/correctivos")
    assert script.status_code == 200 and "REVOKE DBA FROM APP_X;" in script.text
    descarga = cliente.get(f"/api/ejecuciones/{ejecucion_id}/correctivos?descargar=true")
    assert "attachment" in descarga.headers["content-disposition"]

    hallazgo = cliente.get(f"/api/ejecuciones/{ejecucion_id}/hallazgos/OBS-09").json()
    assert hallazgo["resultado"]["estado"] == "No cumple"
    assert hallazgo["correctivos"][0]["script"].endswith("REVOKE DBA FROM APP_X;")
    assert hallazgo["entrada"]["sql"]
    assert cliente.get(f"/api/ejecuciones/{ejecucion_id}/hallazgos/OBS-99").status_code == 404

    plan = cliente.get(f"/api/ejecuciones/{ejecucion_id}/plan-mejora").json()
    assert [p["obs_id"] for p in plan][:1] == ["OBS-09"], "alta prioridad primero"
    assert {p["obs_id"] for p in plan} == {"OBS-09", "OBS-24", "OBS-21"}
    assert next(p for p in plan if p["obs_id"] == "OBS-21")["estado"] == "No evaluable"


def test_revision_registrada_habilita_el_nivel_4(cliente, oracle_falso):
    oracle_falso["fallan"].clear()
    oracle_falso["no_evaluables"].clear()
    empresa = _registrar(cliente).json()
    ejecucion = cliente.post(f"/api/empresas/{empresa['id']}/auditar", json={}).json()
    assert {c["control_id"]: c for c in ejecucion["controles"]}["A8.2"]["madurez"] == 3

    revisada = cliente.post(f"/api/ejecuciones/{ejecucion['id']}/revision", json={"revisor": "DBA Nominal", "notas": "Revisado"}).json()
    assert revisada["revisada_por"] == "DBA Nominal"
    assert {c["control_id"]: c for c in revisada["controles"]}["A8.2"]["madurez"] == 4


def test_descubrimiento_confirmacion_y_persistencia(cliente, oracle_falso):
    empresa = _registrar(cliente).json()
    base = f"/api/empresas/{empresa['id']}"
    descubierto = cliente.post(f"{base}/descubrir", json={}).json()
    assert descubierto["columnas"][0]["columna"] == "CEDULA" and descubierto["columnas"][0]["confirmada"] is None

    confirmadas = cliente.put(f"{base}/descubrimiento", json={"descartadas": [{"esquema": "APP", "tabla": "CLIENTES", "columna": "CEDULA"}]}).json()
    assert confirmadas[0]["confirmada"] == 0
    assert descubrimiento.columnas_para_auditar(empresa["id"]) == [], "lo descartado no se audita"

    cliente.post(f"{base}/descubrir", json={})  # redescubrir conserva la decisión del auditor
    assert cliente.get(f"{base}/descubrimiento").json()[0]["confirmada"] == 0


def test_el_csv_neutraliza_formulas():
    csv = reportes.matriz_csv([{k: "=HYPERLINK(\"x\")" if k == "hallazgo" else "v" for k, _ in reportes.COLUMNAS_CSV}])
    assert "'=HYPERLINK" in csv


def test_endpoints_de_mapeo_y_bateria(cliente):
    mapeo = cliente.get("/api/mapeo").json()
    assert len(mapeo) == 19 and all(m["justificacion"] for m in mapeo)
    bateria = cliente.get("/api/bateria").json()
    assert len(bateria) == 24 and bateria[0]["tipo"]


# ---------------------------------------------------------------- conexión de instancia (CDB$ROOT)
def test_la_conexion_de_instancia_se_guarda_cifrada_y_no_se_expone(cliente):
    empresa = _registrar(cliente).json()
    assert empresa["instancia_configurada"] is False

    respuesta = cliente.put(
        f"/api/empresas/{empresa['id']}/instancia",
        json={"dsn": "localhost:1521/XE", "usuario": "C##AUDITOR_ISO", "password": "secreto-inst-9"},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["instancia_configurada"] is True and cuerpo["credenciales_instancia_guardadas"] is True
    assert cuerpo["usuario_instancia"] == "C##AUDITOR_ISO" and cuerpo["dsn_instancia"] == "localhost:1521/XE"
    assert "secreto-inst-9" not in respuesta.text
    assert b"secreto-inst-9" not in get_config().db_path.read_bytes()

    quitada = cliente.delete(f"/api/empresas/{empresa['id']}/instancia").json()
    assert quitada["instancia_configurada"] is False and quitada["dsn_instancia"] is None


def test_la_conexion_de_instancia_valida_el_dsn_y_conserva_la_clave_guardada(cliente):
    empresa = _registrar(cliente).json()
    ruta = f"/api/empresas/{empresa['id']}/instancia"
    assert cliente.put(ruta, json={"dsn": "no-es-un-dsn", "usuario": "C##X"}).status_code == 422
    cliente.put(ruta, json={"dsn": "localhost:1521/XE", "usuario": "C##X", "password": "uno-uno-1"})
    cambiada = cliente.put(ruta, json={"dsn": "localhost:1521/XE2", "usuario": "C##X"}).json()
    assert cambiada["dsn_instancia"] == "localhost:1521/XE2" and cambiada["credenciales_instancia_guardadas"] is True


def test_se_puede_registrar_la_empresa_con_conexion_de_instancia(cliente):
    respuesta = _registrar(cliente, instancia={"dsn": "localhost:1521/XE", "usuario": "C##AUDITOR_ISO", "password": "otra-clave-2"})
    assert respuesta.status_code == 201 and respuesta.json()["instancia_configurada"] is True


def test_la_auditoria_usa_la_conexion_de_instancia_solo_si_esta_configurada(cliente, oracle_falso):
    empresa = _registrar(cliente).json()
    cliente.post(f"/api/empresas/{empresa['id']}/auditar", json={})
    assert oracle_falso["instancia_usada"] is False

    cliente.put(f"/api/empresas/{empresa['id']}/instancia", json={"dsn": "localhost:1521/XE", "usuario": "C##AUDITOR_ISO", "password": "clave-inst-3"})
    cliente.post(f"/api/empresas/{empresa['id']}/auditar", json={})
    assert oracle_falso["instancia_usada"] is True


def test_el_origen_de_cada_observable_se_guarda_y_se_devuelve(cliente, oracle_falso):
    empresa = _registrar(cliente).json()
    resumen = cliente.post(f"/api/empresas/{empresa['id']}/auditar", json={}).json()
    assert {o["origen"] for o in resumen["observables"]} == {"PDB"}
