import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import conexiones  # noqa: E402
from app.catalogo import cargar_catalogo  # noqa: E402
from app.config import get_config  # noqa: E402


@pytest.fixture(scope="session")
def catalogo():
    return cargar_catalogo()


@pytest.fixture()
def entorno(tmp_path, monkeypatch):
    """Almacén SQLite temporal y llave de cifrado de prueba."""
    monkeypatch.setenv("AUDITORIA_DB", str(tmp_path / "auditoria.db"))
    monkeypatch.setenv("AUDITORIA_LLAVE_CIFRADO", conexiones.generar_llave())
    get_config.cache_clear()
    yield tmp_path
    get_config.cache_clear()


@pytest.fixture()
def cliente(entorno):
    from app.main import app

    with TestClient(app) as c:
        yield c
