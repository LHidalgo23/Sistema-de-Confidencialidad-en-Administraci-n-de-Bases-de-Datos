"""API del instrumento de auditoría de confidencialidad (ISO/IEC 27001:2022) para Oracle.

Ciclo por empresa (PHVA): registrar -> pre-vuelo -> descubrimiento -> observar
-> evaluar -> corregir (script para el DBA) -> re-observar -> reportar.
"""

from __future__ import annotations

import dataclasses
from collections.abc import Iterator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

import oracledb
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from . import almacen, descubrimiento, empresas, motor, prevuelo, reportes
from .catalogo import Catalogo, cargar_catalogo
from .config import get_config
from .conexiones import (
    ConexionFallida,
    CredencialesFaltantes,
    LlaveNoConfigurada,
    abrir_conexion,
    mensaje_oracle,
)
from .correctivos import ErrorRender, generar_script, renderizar
from .evaluacion import ResultadoControl
from .frontend import montar_frontend
from .modelos import (
    AuditarPeticion,
    ConfirmacionDescubrimiento,
    Credencial,
    EmpresaCrear,
    EmpresaPublica,
    Estado,
    RevisionPeticion,
)


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    almacen.inicializar()
    app.state.catalogo = cargar_catalogo()  # falla al arrancar si el catálogo no cumple su contrato
    yield


app = FastAPI(title="Instrumento de auditoría de confidencialidad ISO 27001 para Oracle", lifespan=ciclo_de_vida)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(get_config().cors_origins),
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


def get_catalogo(request: Request) -> Catalogo:
    return request.app.state.catalogo


@app.exception_handler(empresas.EmpresaNoEncontrada)
@app.exception_handler(reportes.EjecucionNoEncontrada)
async def _no_encontrado(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(empresas.EmpresaInvalida)
@app.exception_handler(LlaveNoConfigurada)
async def _peticion_invalida(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(empresas.EmpresaDuplicada)
async def _duplicado(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@contextmanager
def _conexion_empresa(fila, password: str | None) -> Iterator[oracledb.Connection]:
    try:
        conexion = abrir_conexion(fila, password)
    except CredencialesFaltantes as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except ConexionFallida as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar a Oracle: {exc}") from None
    try:
        yield conexion
    finally:
        conexion.close()


def _oracle_a_http(exc: oracledb.Error, accion: str) -> HTTPException:
    return HTTPException(status_code=502, detail=f"Error de Oracle al {accion}: {mensaje_oracle(exc)}")


# --------------------------------------------------------------------------
# Catálogo (genérico)
# --------------------------------------------------------------------------
@app.get("/api/health")
def salud() -> dict[str, str]:
    return {"estado": "ok"}


@app.get("/api/catalogo")
def obtener_catalogo(catalogo: Catalogo = Depends(get_catalogo)) -> list[dict[str, Any]]:
    return [
        {**e.model_dump(mode="json"), "sql": catalogo.sql_por_obs[e.id]}
        for e in catalogo.entradas
    ]


@app.get("/api/controles-iso")
def obtener_controles_iso(catalogo: Catalogo = Depends(get_catalogo)):
    return catalogo.controles_iso


@app.get("/api/riesgos")
def obtener_riesgos(catalogo: Catalogo = Depends(get_catalogo)):
    return catalogo.riesgos


@app.get("/api/tareas")
def obtener_tareas(catalogo: Catalogo = Depends(get_catalogo)):
    return catalogo.tareas


@app.get("/api/perfil-default")
def obtener_perfil_default(catalogo: Catalogo = Depends(get_catalogo)) -> dict:
    return catalogo.perfil_default


# --------------------------------------------------------------------------
# Empresas
# --------------------------------------------------------------------------
@app.get("/api/empresas", response_model=list[EmpresaPublica])
def listar_empresas():
    return empresas.listar_empresas()


@app.post("/api/empresas", response_model=EmpresaPublica, status_code=201)
def registrar_empresa(datos: EmpresaCrear, catalogo: Catalogo = Depends(get_catalogo)):
    return empresas.crear_empresa(datos, catalogo.perfil_default)


@app.get("/api/empresas/{empresa_id}", response_model=EmpresaPublica)
def obtener_empresa(empresa_id: int):
    return empresas.a_publica(empresas.obtener_empresa(empresa_id))


@app.put("/api/empresas/{empresa_id}/perfil", response_model=EmpresaPublica)
def actualizar_perfil(empresa_id: int, perfil: dict, catalogo: Catalogo = Depends(get_catalogo)):
    return empresas.actualizar_perfil(empresa_id, perfil, catalogo.perfil_default)


@app.post("/api/empresas/{empresa_id}/probar")
def probar_conexion(empresa_id: int, credencial: Credencial):
    fila = empresas.obtener_empresa(empresa_id)
    with _conexion_empresa(fila, credencial.password) as conexion:
        try:
            return {"conectado": True, "version": conexion.version, **prevuelo.leer_contexto(conexion)}
        except oracledb.Error as exc:
            raise _oracle_a_http(exc, "probar la conexión") from None


@app.post("/api/empresas/{empresa_id}/prevuelo")
def ejecutar_prevuelo(empresa_id: int, credencial: Credencial, catalogo: Catalogo = Depends(get_catalogo)):
    fila = empresas.obtener_empresa(empresa_id)
    with _conexion_empresa(fila, credencial.password) as conexion:
        try:
            return prevuelo.ejecutar_prevuelo(conexion, catalogo)
        except oracledb.Error as exc:
            raise _oracle_a_http(exc, "ejecutar el pre-vuelo") from None


# --------------------------------------------------------------------------
# Descubrimiento
# --------------------------------------------------------------------------
@app.post("/api/empresas/{empresa_id}/descubrir")
def descubrir(empresa_id: int, credencial: Credencial, catalogo: Catalogo = Depends(get_catalogo)):
    fila = empresas.obtener_empresa(empresa_id)
    perfil = empresas.perfil_de_empresa(fila, catalogo.perfil_default)
    with _conexion_empresa(fila, credencial.password) as conexion:
        try:
            esquemas = descubrimiento.esquemas_de_negocio(conexion)
            encontradas = descubrimiento.columnas_sensibles(conexion, [e["esquema"] for e in esquemas], perfil)
        except oracledb.Error as exc:
            raise _oracle_a_http(exc, "descubrir los datos sensibles") from None
    descubrimiento.guardar_descubrimiento(empresa_id, encontradas)
    return {"esquemas": esquemas, "columnas": descubrimiento.listar_descubrimiento(empresa_id)}


@app.get("/api/empresas/{empresa_id}/descubrimiento")
def obtener_descubrimiento(empresa_id: int):
    empresas.obtener_empresa(empresa_id)
    return descubrimiento.listar_descubrimiento(empresa_id)


@app.put("/api/empresas/{empresa_id}/descubrimiento")
def confirmar_descubrimiento(empresa_id: int, confirmacion: ConfirmacionDescubrimiento):
    empresas.obtener_empresa(empresa_id)
    descubrimiento.confirmar(
        empresa_id,
        [c.model_dump() for c in confirmacion.confirmadas],
        [c.model_dump() for c in confirmacion.descartadas],
    )
    return descubrimiento.listar_descubrimiento(empresa_id)


# --------------------------------------------------------------------------
# Auditoría
# --------------------------------------------------------------------------
def _control_a_dict(control: ResultadoControl) -> dict[str, Any]:
    datos = dataclasses.asdict(control)
    datos["estado"] = control.estado.value
    datos["cobertura"] = round(control.cobertura, 2)
    return datos


def _resumen_ejecucion(ejecucion: dict[str, Any], catalogo: Catalogo) -> dict[str, Any]:
    controles = reportes.evaluar_ejecucion(ejecucion, catalogo)
    conteo = {estado.value: 0 for estado in Estado}
    for control in controles:
        conteo[control.estado.value] += 1
    madureces = [c.madurez for c in controles if c.madurez is not None]
    observables = []
    for r in ejecucion["resultados"]:
        entrada = catalogo.entrada(r["obs_id"])
        observables.append(
            {
                "obs_id": r["obs_id"],
                "nombre": entrada.nombre,
                "control_iso": entrada.control_iso,
                "severidad": entrada.severidad.value,
                "estado": r["estado"],
                "motivo": r["motivo"],
                "hallazgos": len(r["hallazgos"]),
                "truncado": r["truncado"],
            }
        )
    meta = {k: v for k, v in ejecucion.items() if k not in ("resultados", "perfil")}
    return {
        **meta,
        "madurez_promedio": round(sum(madureces) / len(madureces), 2) if madureces else None,
        "conteo_controles": conteo,
        "controles": [_control_a_dict(c) for c in controles],
        "observables": observables,
    }


@app.post("/api/empresas/{empresa_id}/auditar", status_code=201)
def auditar(empresa_id: int, peticion: AuditarPeticion, catalogo: Catalogo = Depends(get_catalogo)):
    fila = empresas.obtener_empresa(empresa_id)
    perfil = empresas.perfil_de_empresa(fila, catalogo.perfil_default)
    with _conexion_empresa(fila, peticion.password) as conexion:
        try:
            version = conexion.version
            contexto = prevuelo.leer_contexto(conexion)
            esquemas = [e["esquema"] for e in descubrimiento.esquemas_de_negocio(conexion)]
            encontradas = descubrimiento.columnas_sensibles(conexion, esquemas, perfil)
        except oracledb.Error as exc:
            raise _oracle_a_http(exc, "preparar la auditoría") from None
        descubrimiento.guardar_descubrimiento(empresa_id, encontradas)
        parametros = {
            **perfil["parametros"],
            "esquemas_negocio": esquemas,
            "columnas_sensibles": descubrimiento.columnas_para_auditar(empresa_id),
        }
        ejecucion_id = reportes.registrar_ejecucion(empresa_id, peticion.etiqueta, version, contexto["contenedor"], perfil)
        resultados = motor.auditar(conexion, catalogo, parametros, version_servidor=version)
    reportes.guardar_resultados(ejecucion_id, resultados)
    return _resumen_ejecucion(reportes.obtener_ejecucion(ejecucion_id), catalogo)


@app.get("/api/empresas/{empresa_id}/ejecuciones")
def listar_ejecuciones(empresa_id: int):
    empresas.obtener_empresa(empresa_id)
    return reportes.listar_ejecuciones(empresa_id)


@app.get("/api/ejecuciones/{ejecucion_id}")
def obtener_ejecucion(ejecucion_id: int, catalogo: Catalogo = Depends(get_catalogo)):
    return _resumen_ejecucion(reportes.obtener_ejecucion(ejecucion_id), catalogo)


@app.post("/api/ejecuciones/{ejecucion_id}/revision")
def registrar_revision(ejecucion_id: int, revision: RevisionPeticion, catalogo: Catalogo = Depends(get_catalogo)):
    reportes.marcar_revision(ejecucion_id, revision.revisor, revision.notas)
    return _resumen_ejecucion(reportes.obtener_ejecucion(ejecucion_id), catalogo)


@app.get("/api/ejecuciones/{ejecucion_id}/hallazgos/{obs_id}")
def obtener_hallazgo(ejecucion_id: int, obs_id: str, catalogo: Catalogo = Depends(get_catalogo)):
    ejecucion = reportes.obtener_ejecucion(ejecucion_id)
    resultado = next((r for r in ejecucion["resultados"] if r["obs_id"] == obs_id), None)
    if resultado is None:
        raise HTTPException(status_code=404, detail=f"La ejecución {ejecucion_id} no tiene el observable {obs_id}")
    entrada = catalogo.entrada(obs_id)
    correctivos = []
    for hallazgo in resultado["hallazgos"]:
        try:
            correctivos.append({"hallazgo": hallazgo, "script": renderizar(entrada, hallazgo), "error": None})
        except (ErrorRender, KeyError) as exc:
            correctivos.append({"hallazgo": hallazgo, "script": None, "error": str(exc)})
    return {
        "ejecucion_id": ejecucion_id,
        "entrada": {**entrada.model_dump(mode="json"), "sql": catalogo.sql_por_obs[obs_id]},
        "resultado": resultado,
        "correctivos": correctivos,
    }


@app.get("/api/ejecuciones/{ejecucion_id}/correctivos")
def obtener_correctivos(
    ejecucion_id: int,
    descargar: bool = Query(default=False),
    catalogo: Catalogo = Depends(get_catalogo),
):
    ejecucion = reportes.obtener_ejecucion(ejecucion_id)
    empresa = empresas.obtener_empresa(ejecucion["empresa_id"])
    script = generar_script(
        empresa=empresa["nombre"],
        ejecucion_id=ejecucion_id,
        etiqueta=ejecucion["etiqueta"],
        fecha=ejecucion["iniciada_en"],
        resultados=ejecucion["resultados"],
        catalogo=catalogo,
    )
    cabeceras = {"Content-Disposition": f'attachment; filename="correctivos_ejecucion_{ejecucion_id}.sql"'} if descargar else {}
    return PlainTextResponse(script, headers=cabeceras)


@app.get("/api/ejecuciones/{ejecucion_id}/plan-mejora")
def obtener_plan_mejora(ejecucion_id: int, catalogo: Catalogo = Depends(get_catalogo)):
    return reportes.plan_mejora(reportes.obtener_ejecucion(ejecucion_id), catalogo)


# --------------------------------------------------------------------------
# Matriz de evaluación (antes / después)
# --------------------------------------------------------------------------
def _matriz_de_empresa(empresa_id: int, antes: int | None, despues: int | None, catalogo: Catalogo):
    fila = empresas.obtener_empresa(empresa_id)
    historial = reportes.listar_ejecuciones(empresa_id)
    if not historial:
        raise HTTPException(status_code=404, detail="La empresa aún no tiene ejecuciones")
    if antes is None and despues is None:
        despues = historial[0]["id"] if len(historial) > 1 else None
        antes = historial[1]["id"] if len(historial) > 1 else historial[0]["id"]
    if antes is None:
        raise HTTPException(status_code=422, detail="Indique la ejecución 'antes'")
    ejecucion_antes = reportes.obtener_ejecucion(antes)
    ejecucion_despues = reportes.obtener_ejecucion(despues) if despues is not None else None
    for ejecucion in (ejecucion_antes, ejecucion_despues):
        if ejecucion is not None and ejecucion["empresa_id"] != empresa_id:
            raise HTTPException(status_code=422, detail="Las ejecuciones deben pertenecer a la empresa")
    return reportes.matriz(fila["nombre"], ejecucion_antes, ejecucion_despues, catalogo), antes, despues


@app.get("/api/empresas/{empresa_id}/matriz")
def obtener_matriz(
    empresa_id: int,
    antes: int | None = None,
    despues: int | None = None,
    catalogo: Catalogo = Depends(get_catalogo),
):
    filas, id_antes, id_despues = _matriz_de_empresa(empresa_id, antes, despues, catalogo)
    return {"antes": id_antes, "despues": id_despues, "filas": filas}


@app.get("/api/empresas/{empresa_id}/matriz.csv")
def exportar_matriz(
    empresa_id: int,
    antes: int | None = None,
    despues: int | None = None,
    catalogo: Catalogo = Depends(get_catalogo),
) -> Response:
    filas, _, _ = _matriz_de_empresa(empresa_id, antes, despues, catalogo)
    return Response(
        reportes.matriz_csv(filas),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="matriz_empresa_{empresa_id}.csv"'},
    )


# Debe ir al final: la ruta comodín del frontend no puede tapar las rutas de la API.
montar_frontend(app, get_config().frontend_dir)
