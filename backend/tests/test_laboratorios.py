import json

import pytest
from pydantic import ValidationError

from app.config import get_config
from app.laboratorios import GuiaPractica, Paso, cargar_guias


@pytest.fixture(scope="module")
def guias():
    return cargar_guias(get_config().laboratorio_dir)


def test_se_encuentra_la_guia_de_la_clinica(guias):
    assert [g["empresa"] for g in guias] == ["clinica"]
    assert len(guias[0]["escenarios"]) >= 10


def test_los_escenarios_citan_observables_que_existen_en_el_catalogo(guias, catalogo):
    existentes = {e.id for e in catalogo.entradas}
    for guia in guias:
        for escenario in guia["escenarios"]:
            assert escenario["observables"], escenario["id"]
            assert set(escenario["observables"]) <= existentes, escenario["id"]


def test_los_ids_de_escenario_no_se_repiten(guias):
    for guia in guias:
        ids = [e["id"] for e in guia["escenarios"]]
        assert len(ids) == len(set(ids))


def test_cada_escenario_declara_un_resultado_esperado(guias):
    for guia in guias:
        for escenario in guia["escenarios"]:
            assert any(p["tipo"] == "esperado" for p in escenario["pasos"]), escenario["id"]


def test_un_paso_sql_exige_codigo_y_conexion():
    with pytest.raises(ValidationError):
        Paso(tipo="sql", codigo="SELECT 1 FROM dual")
    with pytest.raises(ValidationError):
        Paso(tipo="esperado")
    assert Paso(tipo="sql", codigo="SELECT 1 FROM dual", conexion="DBA").tipo == "sql"


def test_el_nivel_debe_ser_conocido():
    with pytest.raises(ValidationError):
        GuiaPractica(
            titulo="t",
            descripcion="d",
            conexion_sql="c",
            preparacion=[],
            escenarios=[
                {
                    "id": "E1",
                    "titulo": "t",
                    "nivel": "imposible",
                    "objetivo": "o",
                    "observables": ["OBS-01"],
                    "pasos": [{"tipo": "instrumento", "texto": "a"}, {"tipo": "esperado", "texto": "b"}],
                }
            ],
        )


def test_sin_carpeta_de_laboratorio_no_hay_guias(tmp_path):
    assert cargar_guias(tmp_path / "no_existe") == []


def test_una_guia_mal_formada_se_rechaza(tmp_path):
    carpeta = tmp_path / "x"
    carpeta.mkdir()
    (carpeta / "guia_practica.json").write_text(json.dumps({"titulo": "solo titulo"}), encoding="utf-8")
    with pytest.raises(ValidationError):
        cargar_guias(tmp_path)


def test_endpoint_laboratorios(cliente):
    respuesta = cliente.get("/api/laboratorios")
    assert respuesta.status_code == 200
    assert respuesta.json()[0]["empresa"] == "clinica"
