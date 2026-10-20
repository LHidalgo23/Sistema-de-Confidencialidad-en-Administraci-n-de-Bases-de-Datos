import json
import re
import shutil

import pytest

from app.catalogo import (
    CatalogoInvalido,
    cargar_catalogo,
    campos_de_plantilla,
    extraer_binds,
    validar_catalogo,
)
from app.config import REPO_DIR


def test_el_catalogo_real_cumple_su_contrato(catalogo):
    assert validar_catalogo(catalogo) == []
    assert len(catalogo.entradas) == 24


def test_los_15_controles_nucleo_tienen_observables(catalogo):
    nucleo = [c for c in catalogo.controles_iso if c.nucleo]
    assert len(nucleo) == 15
    assert all(catalogo.entradas_de_control(c.id) for c in nucleo)


def test_el_catalogo_no_menciona_a_la_empresa_ficticia(catalogo):
    """Regla de oro del plan v2: nada de la clínica dentro del instrumento."""
    textos = [catalogo.sql_por_obs[e.id] for e in catalogo.entradas]
    textos += [e.model_dump_json() for e in catalogo.entradas]
    textos.append(json.dumps(catalogo.perfil_default))
    assert not any("CLINICA" in t.upper() for t in textos)
    carpeta = REPO_DIR / "instrumento"
    for archivo in carpeta.rglob("*"):
        if archivo.is_file():
            assert "CLINICA" not in archivo.read_text(encoding="utf-8").upper(), archivo


def test_los_observables_son_de_solo_lectura(catalogo):
    prohibidas = ("INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "GRANT ", "REVOKE ", "TRUNCATE ", "MERGE ", "CREATE ")
    for obs_id, sql in catalogo.sql_por_obs.items():
        sin_literales = re.sub(r"--[^\n]*|/\*.*?\*/|'(?:[^']|'')*'", " ", sql, flags=re.DOTALL)
        cuerpo = sin_literales.upper()
        assert cuerpo.lstrip().startswith(("SELECT", "WITH")), obs_id
        assert not any(p in cuerpo for p in prohibidas), obs_id


def test_extraer_binds_ignora_comentarios_y_literales():
    sql = """
    -- comentario con :falso_bind y una comilla ' suelta
    SELECT TO_CHAR(x, 'HH24:MI') AS hora, :real_uno, :real_dos
    FROM t /* otro :falso */ WHERE y = ':literal' AND z = :real_uno
    """
    assert extraer_binds(sql) == {"real_uno", "real_dos"}


def test_campos_de_plantilla_ignora_el_modificador():
    assert campos_de_plantilla("REVOKE {privilegio!k} ON {esquema}.{objeto} FROM {grantee};") == {
        "privilegio",
        "esquema",
        "objeto",
        "grantee",
    }


def _copiar_instrumento(destino):
    shutil.copytree(REPO_DIR / "instrumento", destino / "instrumento")
    return destino / "instrumento"


def test_detecta_un_bind_sin_parametro(tmp_path):
    base = _copiar_instrumento(tmp_path)
    ruta = base / "sql" / "observables" / "OBS-04.sql"
    ruta.write_text(ruta.read_text(encoding="utf-8") + "\n-- fin\n", encoding="utf-8")
    sql = ruta.read_text(encoding="utf-8").replace(":dias_inactividad", ":dias_inventados")
    ruta.write_text(sql, encoding="utf-8")
    with pytest.raises(CatalogoInvalido, match="dias_inventados"):
        cargar_catalogo(base)


def test_detecta_una_plantilla_con_columna_inexistente(tmp_path):
    base = _copiar_instrumento(tmp_path)
    ruta = base / "catalogo_controles.json"
    entradas = json.loads(ruta.read_text(encoding="utf-8"))
    entradas[8]["correctivo"]["plantilla"] = "REVOKE DBA FROM {usuario_que_no_existe};"
    ruta.write_text(json.dumps(entradas), encoding="utf-8")
    with pytest.raises(CatalogoInvalido, match="usuario_que_no_existe"):
        cargar_catalogo(base)


def test_rechaza_un_archivo_fuera_del_instrumento(tmp_path):
    base = _copiar_instrumento(tmp_path)
    ruta = base / "catalogo_controles.json"
    entradas = json.loads(ruta.read_text(encoding="utf-8"))
    entradas[0]["observable"]["archivo"] = "../../backend/app/main.py"
    ruta.write_text(json.dumps(entradas), encoding="utf-8")
    with pytest.raises(CatalogoInvalido, match="no existe en el instrumento"):
        cargar_catalogo(base)


# ---------------------------------------------------------------- Fase 1: riesgos y tareas
def test_los_seis_riesgos_estan_redactados_con_su_escala(catalogo):
    assert [r.id for r in catalogo.riesgos] == [f"R-CONF-0{n}" for n in range(1, 7)]
    for r in catalogo.riesgos:
        for campo in ("descripcion", "causa", "consecuencia", "justificacion", "base_legal"):
            assert getattr(r, campo), (r.id, campo)
        assert 1 <= r.probabilidad <= 5 and 1 <= r.impacto <= 5, r.id
        assert r.nivel == r.probabilidad * r.impacto, r.id


def test_las_doce_tareas_estan_redactadas_y_ligadas_a_riesgos_reales(catalogo):
    assert [t.id for t in catalogo.tareas] == [f"T-{n:02d}" for n in range(1, 13)]
    riesgos = {r.id for r in catalogo.riesgos}
    for t in catalogo.tareas:
        assert t.descripcion and t.frecuencia, t.id
        assert t.riesgos_asociados and set(t.riesgos_asociados) <= riesgos, t.id


def test_cada_riesgo_y_cada_tarea_tienen_algun_observable(catalogo):
    assert {e.riesgo for e in catalogo.entradas} == {r.id for r in catalogo.riesgos}
    assert {e.tarea for e in catalogo.entradas} == {t.id for t in catalogo.tareas}


def test_las_tareas_declaran_los_riesgos_de_sus_observables(catalogo):
    por_tarea = {t.id: set(t.riesgos_asociados) for t in catalogo.tareas}
    for e in catalogo.entradas:
        assert e.riesgo in por_tarea[e.tarea], f"{e.id}: {e.tarea} no declara el riesgo {e.riesgo}"


# ---------------------------------------------------------------- identificación de hallazgos
def test_cada_observable_declara_como_se_identifica_un_hallazgo(catalogo):
    for e in catalogo.entradas:
        assert e.observable.identificador, e.id
        assert set(e.observable.identificador) <= set(e.observable.columnas), e.id


def test_la_etiqueta_de_un_hallazgo_es_legible(catalogo):
    from app.reportes import etiqueta_hallazgo

    assert etiqueta_hallazgo(
        catalogo.entrada("OBS-01"),
        {"esquema": "CLINICA", "tabla": "EMPLEADOS", "columna": "CEDULA", "nivel": "x"},
    ) == "CLINICA.EMPLEADOS.CEDULA"
    assert etiqueta_hallazgo(catalogo.entrada("OBS-08"), {"tipo": "RETENCION", "grantee": None}) == "RETENCION"
    assert etiqueta_hallazgo(catalogo.entrada("OBS-09"), {}) == "(sin identificar)"
