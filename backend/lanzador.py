"""Punto de entrada del ejecutable: levanta el backend con el frontend incluido y
abre el navegador. También sirve en desarrollo: `python lanzador.py`.

La primera vez genera la llave de cifrado de las contraseñas y la guarda en el
.env de la carpeta de datos (nunca en el repositorio).
"""

from __future__ import annotations

import argparse
import os
import socket
import sys
import threading
import webbrowser
from pathlib import Path

import uvicorn

from app.config import DATOS_DIR
from app.conexiones import generar_llave

HOST = "127.0.0.1"  # solo accesible desde este equipo
PUERTO_PREFERIDO = 8000


def puerto_libre(preferido: int) -> int:
    """El puerto preferido si está libre; si no, uno libre que asigne el sistema."""
    for puerto in (preferido, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as candidato:
            try:
                candidato.bind((HOST, puerto))
            except OSError:
                continue
            return candidato.getsockname()[1]
    raise RuntimeError("No hay ningún puerto libre en este equipo")


def asegurar_llave_de_cifrado(carpeta: Path) -> None:
    """Garantiza AUDITORIA_LLAVE_CIFRADO: la lee del entorno o del .env, y si no
    existe la genera y la guarda para que las contraseñas ya cifradas sigan siendo legibles."""
    if os.environ.get("AUDITORIA_LLAVE_CIFRADO"):
        return
    carpeta.mkdir(parents=True, exist_ok=True)
    archivo = carpeta / ".env"
    llave = generar_llave()
    with archivo.open("a", encoding="utf-8") as env:
        env.write(f"AUDITORIA_LLAVE_CIFRADO={llave}\n")
    os.environ["AUDITORIA_LLAVE_CIFRADO"] = llave
    print(f"Se generó la llave de cifrado y se guardó en {archivo}")
    print("Respalde ese archivo: sin la llave no se pueden descifrar las contraseñas guardadas.")


def verificar_driver_oracle() -> None:
    """Comprueba que el driver de Oracle (modo thin) quedó completo en el paquete.

    Se intenta una conexión a un puerto cerrado: si el driver funciona, falla por no poder
    conectar; si le faltan módulos de `cryptography` (PyInstaller no ve los imports de los
    módulos compilados), falla con DPY-3016 y el ejecutable no serviría para auditar.
    """
    import oracledb

    try:
        oracledb.connect(user="verificacion", password="verificacion", dsn="127.0.0.1:1/verificacion", tcp_connect_timeout=2)
    except oracledb.Error as exc:
        if "DPY-3016" in str(exc):
            raise SystemExit(f"El driver de Oracle quedó incompleto en el paquete: {exc}") from None
    print("Driver de Oracle (thin) operativo")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Instrumento de auditoría de confidencialidad ISO 27001 para Oracle")
    parser.add_argument("--puerto", type=int, default=PUERTO_PREFERIDO)
    parser.add_argument("--sin-navegador", action="store_true", help="no abrir el navegador al arrancar")
    parser.add_argument("--verificar", action="store_true", help="comprobar el paquete (driver de Oracle) y salir")
    argumentos = parser.parse_args(argv)

    if argumentos.verificar:
        verificar_driver_oracle()
        return

    asegurar_llave_de_cifrado(DATOS_DIR)
    from app.main import app  # se importa después de preparar la llave: la configuración se lee al importar

    puerto = puerto_libre(argumentos.puerto)
    url = f"http://{HOST}:{puerto}"
    print(f"Instrumento de auditoría en {url}")
    print(f"Datos y configuración en {DATOS_DIR}")
    print("Cierre esta ventana (o pulse Ctrl+C) para detener el servidor.")
    if not argumentos.sin_navegador:
        threading.Timer(1.5, webbrowser.open, args=(url,)).start()
    uvicorn.run(app, host=HOST, port=puerto, log_level="info")


if __name__ == "__main__":
    main(sys.argv[1:])
