import pytest

from app.correctivos import ErrorRender, generar_script, renderizar, renderizar_sql, valores_por_defecto
from app.modelos import Estado


def _entrada(catalogo, obs_id):
    return catalogo.entrada(obs_id)


def test_obs_09_genera_el_revoke_de_la_plantilla_del_plan(catalogo):
    sql = renderizar(_entrada(catalogo, "OBS-09"), {"grantee": "APP_X", "con_admin_option": "NO"})
    assert "REVOKE DBA FROM APP_X;" in sql


@pytest.mark.parametrize("obs_id", [f"OBS-{n:02d}" for n in range(1, 25)])
def test_todas_las_plantillas_se_pueden_renderizar(catalogo, obs_id):
    """Cada plantilla se renderiza con valores de muestra y sin dejar llaves sin resolver."""
    entrada = _entrada(catalogo, obs_id)
    muestra = {c: "VALOR_X" for c in entrada.observable.columnas}
    muestra.update({"sid": "42", "dias": "10"})
    tipos = entrada.correctivo.plantillas or {"unico": None}
    for tipo in tipos:
        hallazgo = dict(muestra)
        if entrada.correctivo.discriminador:
            hallazgo[entrada.correctivo.discriminador] = tipo
        texto = renderizar(entrada, hallazgo, catalogo.perfil_default["parametros"])
        assert "{" not in texto and "}" not in texto, (obs_id, tipo)
        for paso in entrada.correctivo.pasos:
            texto_paso = renderizar_sql(paso.sql, hallazgo, catalogo.perfil_default["parametros"], valores_por_defecto(entrada))
            assert "{" not in texto_paso and "}" not in texto_paso, (obs_id, tipo, paso.condicion)


def test_identificador_inusual_se_entrecomilla(catalogo):
    sql = renderizar(_entrada(catalogo, "OBS-09"), {"grantee": "Jose Perez", "con_admin_option": "NO"})
    assert 'REVOKE DBA FROM "Jose Perez";' in sql


def test_identificador_con_comilla_doble_se_rechaza(catalogo):
    with pytest.raises(ErrorRender):
        renderizar(_entrada(catalogo, "OBS-09"), {"grantee": 'X"; DROP USER SYS; --', "con_admin_option": "NO"})


def test_el_sql_inyectado_en_un_identificador_no_sale_sin_comillas(catalogo):
    sql = renderizar(_entrada(catalogo, "OBS-04"), {"usuario": "x; drop user sys", "estado": "OPEN", "ultimo_acceso": "", "creado": ""})
    assert 'ACCOUNT LOCK' in sql and '"x; drop user sys"' in sql


def test_literal_duplica_las_comillas_simples(catalogo):
    hallazgo = {"esquema": "S", "tabla": "T", "columna": "C", "nivel": "Confidencial", "marcador": "CLASIFICACION", "comentario_actual": "dato 'x'; DROP TABLE t; --"}
    sql = renderizar(_entrada(catalogo, "OBS-01"), hallazgo)
    assert "dato ''x''; DROP TABLE t; --'" in sql
    assert sql.endswith("';")


def test_token_rechaza_texto_libre(catalogo):
    with pytest.raises(ErrorRender):
        renderizar(_entrada(catalogo, "OBS-06"), {"perfil": "P", "parametro": "IDLE_TIME; DROP USER X", "actual": "UNLIMITED", "recomendado": "30"})


def test_discriminador_elige_la_plantilla(catalogo):
    entrada = _entrada(catalogo, "OBS-16")
    assert "ON SYS.UTL_FILE FROM PUBLIC" in renderizar(entrada, {"tipo": "PAQUETE", "grantee": "PUBLIC", "objeto": "UTL_FILE", "privilegio": "EXECUTE"})
    assert "ON DIRECTORY DIR_X FROM PUBLIC" in renderizar(entrada, {"tipo": "DIRECTORIO", "grantee": "PUBLIC", "objeto": "DIR_X", "privilegio": "READ"})
    with pytest.raises(ErrorRender):
        renderizar(entrada, {"tipo": "INEXISTENTE", "grantee": "X", "objeto": "Y", "privilegio": "Z"})


def _resultados():
    return [
        {"obs_id": "OBS-24", "estado": Estado.NO_CUMPLE.value, "hallazgos": [{"version": "21c", "ultimo_parche": "SIN REGISTRO", "dias": "N/D"}]},
        {"obs_id": "OBS-09", "estado": Estado.NO_CUMPLE.value, "hallazgos": [{"grantee": "APP_X", "con_admin_option": "NO"}]},
        {"obs_id": "OBS-04", "estado": Estado.CUMPLE.value, "hallazgos": []},
        {"obs_id": "OBS-21", "estado": Estado.NO_EVALUABLE.value, "hallazgos": []},
    ]


def test_script_consolidado_ordena_por_severidad_y_omite_lo_que_cumple(catalogo):
    script = generar_script(empresa="ACME", ejecucion_id=7, etiqueta="antes", fecha="2026-10-20", resultados=_resultados(), catalogo=catalogo)
    assert script.index("OBS-09") < script.index("OBS-24"), "alta antes que media"
    assert "OBS-04" not in script and "OBS-21" not in script
    assert "NO ejecuta este script" in script
    assert "SET DEFINE OFF" in script


def test_script_sin_hallazgos(catalogo):
    script = generar_script(empresa="ACME", ejecucion_id=1, etiqueta="", fecha="x", resultados=[{"obs_id": "OBS-04", "estado": "Cumple", "hallazgos": []}], catalogo=catalogo)
    assert "Sin hallazgos que corregir" in script


def test_script_elimina_sentencias_duplicadas(catalogo):
    hallazgos = [{"tipo": "ACCION_PRIVILEGIADA", "accion": a} for a in ("CREATE USER", "ALTER USER", "GRANT")]
    script = generar_script(
        empresa="ACME", ejecucion_id=1, etiqueta="", fecha="x",
        resultados=[{"obs_id": "OBS-19", "estado": "No cumple", "hallazgos": hallazgos}], catalogo=catalogo,
    )
    assert script.count("CREATE AUDIT POLICY POL_ISO_ACCIONES_PRIVILEGIADAS") == 1


def test_script_marca_para_revision_manual_lo_que_no_es_seguro(catalogo):
    script = generar_script(
        empresa="ACME", ejecucion_id=1, etiqueta="", fecha="x",
        resultados=[{"obs_id": "OBS-09", "estado": "No cumple", "hallazgos": [{"grantee": 'MAL"NOMBRE', "con_admin_option": "NO"}]}],
        catalogo=catalogo,
    )
    assert "REVISAR MANUALMENTE" in script
    assert "REVOKE DBA FROM" not in script.replace("-- REVISAR", "")
