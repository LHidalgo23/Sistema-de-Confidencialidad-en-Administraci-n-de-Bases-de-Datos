import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import montar_frontend


@pytest.fixture()
def sitio(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>INDICE</html>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('app')", encoding="utf-8")
    (tmp_path / "secreto.txt").write_text("CONTENIDO SECRETO", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/hola")
    def hola():
        return {"hola": "mundo"}

    assert montar_frontend(app, dist) is True
    return TestClient(app)


def test_sirve_el_indice_y_los_archivos_estaticos(sitio):
    assert "INDICE" in sitio.get("/").text
    assert sitio.get("/assets/app.js").text == "console.log('app')"


def test_las_rutas_del_enrutador_del_cliente_devuelven_el_indice(sitio):
    assert "INDICE" in sitio.get("/empresas/3/matriz").text


def test_la_api_no_queda_tapada_por_el_frontend(sitio):
    assert sitio.get("/api/hola").json() == {"hola": "mundo"}
    assert sitio.get("/api/no-existe").status_code == 404


@pytest.mark.parametrize("ruta", ["/../secreto.txt", "/%2e%2e/secreto.txt", "/assets/../../secreto.txt", "/..%2fsecreto.txt"])
def test_no_permite_salir_de_la_carpeta_del_frontend(sitio, ruta):
    assert "CONTENIDO SECRETO" not in sitio.get(ruta).text


def test_sin_frontend_compilado_no_registra_nada(tmp_path):
    assert montar_frontend(FastAPI(), tmp_path / "no_existe") is False
