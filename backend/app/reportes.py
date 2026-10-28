"""Historial de ejecuciones, matriz de evaluación, comparativos y plan de mejora."""

from __future__ import annotations

import csv
import io
import json
from collections.abc import Sequence
from typing import Any

from . import almacen
from .catalogo import Catalogo
from .evaluacion import ResultadoControl, evaluar_controles
from .modelos import EntradaCatalogo, Estado, Severidad
from .motor import ResultadoObservable


class EjecucionNoEncontrada(Exception):
    pass


# --------------------------------------------------------------------------
# Persistencia
# --------------------------------------------------------------------------
def registrar_ejecucion(empresa_id: int, etiqueta: str, version: str, contenedor: str, perfil: dict) -> int:
    with almacen.conexion() as con:
        cursor = con.execute(
            "INSERT INTO ejecuciones (empresa_id, etiqueta, iniciada_en, version_oracle, contenedor, perfil_json) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (empresa_id, etiqueta.strip(), almacen.ahora_iso(), version, contenedor, json.dumps(perfil, ensure_ascii=False)),
        )
        return int(cursor.lastrowid)


def guardar_resultados(ejecucion_id: int, resultados: Sequence[ResultadoObservable]) -> None:
    with almacen.conexion() as con:
        con.executemany(
            "INSERT INTO resultados (ejecucion_id, obs_id, estado, motivo, hallazgos_json, duracion_ms, truncado, origen) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    ejecucion_id,
                    r.obs_id,
                    r.estado.value,
                    r.motivo,
                    json.dumps(r.hallazgos, ensure_ascii=False),
                    r.duracion_ms,
                    int(r.truncado),
                    r.origen,
                )
                for r in resultados
            ],
        )
        con.execute("UPDATE ejecuciones SET finalizada_en = ? WHERE id = ?", (almacen.ahora_iso(), ejecucion_id))


def obtener_ejecucion(ejecucion_id: int) -> dict[str, Any]:
    with almacen.conexion() as con:
        fila = con.execute("SELECT * FROM ejecuciones WHERE id = ?", (ejecucion_id,)).fetchone()
        if fila is None:
            raise EjecucionNoEncontrada(f"No existe la ejecución {ejecucion_id}")
        resultados = con.execute(
            "SELECT obs_id, estado, motivo, hallazgos_json, duracion_ms, truncado, origen FROM resultados "
            "WHERE ejecucion_id = ? ORDER BY obs_id",
            (ejecucion_id,),
        ).fetchall()
    ejecucion = dict(fila)
    ejecucion["perfil"] = json.loads(ejecucion.pop("perfil_json"))
    ejecucion["resultados"] = [
        {
            "obs_id": r["obs_id"],
            "estado": r["estado"],
            "motivo": r["motivo"],
            "hallazgos": json.loads(r["hallazgos_json"]),
            "duracion_ms": r["duracion_ms"],
            "truncado": bool(r["truncado"]),
            "origen": r["origen"],
        }
        for r in resultados
    ]
    return ejecucion


def listar_ejecuciones(empresa_id: int) -> list[dict[str, Any]]:
    with almacen.conexion() as con:
        filas = con.execute(
            "SELECT e.id, e.etiqueta, e.iniciada_en, e.finalizada_en, e.version_oracle, e.contenedor, "
            "e.revisada_por, e.revisada_en, "
            "(SELECT COUNT(*) FROM resultados r WHERE r.ejecucion_id = e.id AND r.estado = ?) AS con_hallazgos "
            "FROM ejecuciones e WHERE e.empresa_id = ? ORDER BY e.id DESC",
            (Estado.NO_CUMPLE.value, empresa_id),
        ).fetchall()
    return [dict(f) for f in filas]


def marcar_revision(ejecucion_id: int, revisor: str, notas: str) -> None:
    obtener_ejecucion(ejecucion_id)
    with almacen.conexion() as con:
        con.execute(
            "UPDATE ejecuciones SET revisada_por = ?, revisada_en = ?, notas_revision = ? WHERE id = ?",
            (revisor.strip(), almacen.ahora_iso(), notas.strip(), ejecucion_id),
        )


def marcar_correctivo(ejecucion_id: int, obs_id: str, estado: str, nota: str = "") -> None:
    """Marca manual del DBA sobre un observable de esta ejecución:
    - 'resuelto': ya lo arregló por su cuenta, se excluye del script final.
    - 'pendiente': lo deja para después; sigue en el script, pero no exige llenar
      sus campos manuales para poder generarlo.
    Marcar de nuevo (con el mismo estado o el otro) reemplaza la marca anterior."""
    if estado not in ("resuelto", "pendiente"):
        raise ValueError(f"estado inválido: {estado!r}")
    obtener_ejecucion(ejecucion_id)
    with almacen.conexion() as con:
        con.execute(
            "INSERT INTO correctivos_resueltos (ejecucion_id, obs_id, estado, marcado_en, nota) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT (ejecucion_id, obs_id) DO UPDATE SET estado = excluded.estado, marcado_en = excluded.marcado_en, nota = excluded.nota",
            (ejecucion_id, obs_id, estado, almacen.ahora_iso(), nota.strip()),
        )


def quitar_marca_correctivo(ejecucion_id: int, obs_id: str) -> None:
    with almacen.conexion() as con:
        con.execute("DELETE FROM correctivos_resueltos WHERE ejecucion_id = ? AND obs_id = ?", (ejecucion_id, obs_id))


def obtener_marcas_correctivos(ejecucion_id: int) -> dict[str, dict[str, str]]:
    with almacen.conexion() as con:
        filas = con.execute(
            "SELECT obs_id, estado, marcado_en, nota FROM correctivos_resueltos WHERE ejecucion_id = ?", (ejecucion_id,)
        ).fetchall()
    return {f["obs_id"]: {"estado": f["estado"], "marcado_en": f["marcado_en"], "nota": f["nota"]} for f in filas}


# --------------------------------------------------------------------------
# Evaluación
# --------------------------------------------------------------------------
def estados_de(ejecucion: dict[str, Any]) -> dict[str, Estado]:
    return {r["obs_id"]: Estado(r["estado"]) for r in ejecucion["resultados"]}


def evaluar_ejecucion(ejecucion: dict[str, Any], catalogo: Catalogo) -> list[ResultadoControl]:
    return evaluar_controles(
        catalogo,
        estados_de(ejecucion),
        revision_registrada=bool(ejecucion.get("revisada_por")),
        aceptaciones=ejecucion["perfil"].get("aceptaciones_riesgo", {}),
    )


def etiqueta_hallazgo(entrada: EntradaCatalogo, hallazgo: dict[str, Any]) -> str:
    """Texto corto que identifica un hallazgo, p. ej. CLINICA.EMPLEADOS.CEDULA."""
    claves = entrada.observable.identificador or entrada.observable.columnas[:1]
    partes = [str(hallazgo[c]) for c in claves if hallazgo.get(c) not in (None, "")]
    return ".".join(partes) or "(sin identificar)"


def _evidencia(ejecucion: dict[str, Any], observables: Sequence[str], catalogo: Catalogo) -> str:
    por_obs = {r["obs_id"]: r for r in ejecucion["resultados"]}
    partes = []
    for obs_id in observables:
        r = por_obs.get(obs_id)
        if r is None or r["estado"] == Estado.CUMPLE.value:
            continue
        if r["estado"] == Estado.NO_EVALUABLE.value:
            partes.append(f"{obs_id}: no evaluable ({r['motivo']})")
            continue
        entrada = catalogo.entrada(obs_id)
        muestra = ", ".join(etiqueta_hallazgo(entrada, h) for h in r["hallazgos"][:3])
        if len(r["hallazgos"]) > 3:
            muestra += ", …"
        partes.append(f"{obs_id}: {len(r['hallazgos'])} hallazgo(s) [{muestra}]")
    return " | ".join(partes) if partes else "Sin hallazgos"


def _correctivo_aplicado(antes: dict[str, Any], despues: dict[str, Any] | None, observables: Sequence[str]) -> str:
    if despues is None:
        return "—"
    antes_estados, despues_estados = estados_de(antes), estados_de(despues)
    con_hallazgo = [o for o in observables if antes_estados.get(o) == Estado.NO_CUMPLE]
    if not con_hallazgo:
        return "No requerido"
    resueltos = [o for o in con_hallazgo if despues_estados.get(o) == Estado.CUMPLE]
    return f"Sí: {', '.join(resueltos)}" if resueltos else "No"


def matriz(
    empresa: str,
    antes: dict[str, Any],
    despues: dict[str, Any] | None,
    catalogo: Catalogo,
) -> list[dict[str, Any]]:
    """Matriz de evaluación (una fila por control ISO):
    Empresa | Fecha | Tarea | Riesgo | Control | Hallazgo | Criterio antes | Estado antes |
    Correctivo aplicado | Criterio después | Estado después."""
    tareas = {t.id: t.nombre for t in catalogo.tareas}
    controles_antes = {c.control_id: c for c in evaluar_ejecucion(antes, catalogo)}
    controles_despues = {c.control_id: c for c in evaluar_ejecucion(despues, catalogo)} if despues else {}

    filas = []
    for control_id, antes_ctl in controles_antes.items():
        entradas = catalogo.entradas_de_control(control_id)
        observables = [e.id for e in entradas]
        despues_ctl = controles_despues.get(control_id)
        filas.append(
            {
                "empresa": empresa,
                "fecha": antes["iniciada_en"],
                "tarea": ", ".join(sorted({f"{e.tarea} {tareas.get(e.tarea, '')}".strip() for e in entradas})),
                "riesgo": ", ".join(sorted({e.riesgo for e in entradas})),
                "control": f"{control_id} {antes_ctl.nombre}",
                "control_id": control_id,
                "hallazgo": _evidencia(antes, observables, catalogo),
                "criterio_antes": antes_ctl.madurez,
                "estado_antes": antes_ctl.estado.value,
                "correctivo_aplicado": _correctivo_aplicado(antes, despues, observables),
                "criterio_despues": despues_ctl.madurez if despues_ctl else None,
                "estado_despues": despues_ctl.estado.value if despues_ctl else None,
            }
        )
    return filas


COLUMNAS_CSV = [
    ("empresa", "Empresa"),
    ("fecha", "Fecha"),
    ("tarea", "Tarea"),
    ("riesgo", "Riesgo"),
    ("control", "Control"),
    ("hallazgo", "Hallazgo (evidencia)"),
    ("criterio_antes", "Criterio 0-4 antes"),
    ("estado_antes", "Estado antes"),
    ("correctivo_aplicado", "Correctivo aplicado"),
    ("criterio_despues", "Criterio 0-4 después"),
    ("estado_despues", "Estado después"),
]


def _celda_segura(valor: Any) -> str:
    """Evita la inyección de fórmulas al abrir el CSV en una hoja de cálculo."""
    texto = "" if valor is None else str(valor)
    return "'" + texto if texto[:1] in ("=", "+", "-", "@") else texto


def matriz_csv(filas: Sequence[dict[str, Any]]) -> str:
    salida = io.StringIO()
    escritor = csv.writer(salida)
    escritor.writerow([titulo for _, titulo in COLUMNAS_CSV])
    for fila in filas:
        escritor.writerow([_celda_segura(fila[clave]) for clave, _ in COLUMNAS_CSV])
    return salida.getvalue()


# --------------------------------------------------------------------------
# Plan de mejora (Actuar)
# --------------------------------------------------------------------------
def _prioridad(estado: str, severidad: Severidad) -> int:
    if estado == Estado.NO_EVALUABLE.value:
        return 2
    return {Severidad.ALTA: 1, Severidad.MEDIA: 2, Severidad.BAJA: 3}[severidad]


def plan_mejora(ejecucion: dict[str, Any], catalogo: Catalogo) -> list[dict[str, Any]]:
    """Pendientes de la ejecución (No cumple y No evaluable) con su acción
    correctiva y su control preventivo, ordenados por prioridad."""
    pendientes = []
    for r in ejecucion["resultados"]:
        if r["estado"] == Estado.CUMPLE.value:
            continue
        entrada = catalogo.entrada(r["obs_id"])
        no_evaluable = r["estado"] == Estado.NO_EVALUABLE.value
        pendientes.append(
            {
                "obs_id": entrada.id,
                "control_iso": entrada.control_iso,
                "nombre": entrada.nombre,
                "estado": r["estado"],
                "severidad": entrada.severidad.value,
                "prioridad": _prioridad(r["estado"], entrada.severidad),
                "detalle": r["motivo"] if no_evaluable else f"{len(r['hallazgos'])} hallazgo(s)",
                "accion": (
                    "Habilitar la visibilidad necesaria para el usuario auditor o evaluar el control de forma manual."
                    if no_evaluable
                    else entrada.correctivo.nota or "Aplicar el correctivo generado."
                ),
                "preventivo": entrada.preventivo,
            }
        )
    pendientes.sort(key=lambda p: (p["prioridad"], p["obs_id"]))
    return pendientes
