"""Modelos Pydantic compartidos por la API."""

from enum import Enum

from pydantic import BaseModel


class TipoPrueba(str, Enum):
    CONFIGURACION = "configuracion"
    NEGATIVA = "negativa"
    AUDITORIA = "auditoria"
    COMPARACION = "comparacion"


class Estado(str, Enum):
    NO_CUMPLE = "No cumple"
    PARCIAL = "Parcial"
    CUMPLE = "Cumple"


class Riesgo(BaseModel):
    id: str
    resumen: str
    descripcion: str | None = None
    causa: str | None = None
    consecuencia: str | None = None
    probabilidad: int | None = None
    impacto: int | None = None
    nivel: int | None = None
    baseLegal: str | None = None


class Tarea(BaseModel):
    id: str
    nombre: str
    descripcion: str | None = None
    frecuencia: str | None = None
    riesgosAsociados: list[str] = []


class Control(BaseModel):
    id: str
    nombre: str
    extra: bool = False
    riesgos: list[str] = []
    tareas: list[str] = []
    implementacion: str
    evidencia: str
    script: str
    pruebas: list[str] = []


class Prueba(BaseModel):
    id: str
    control: str
    riesgo: list[str] = []
    tarea: list[str] = []
    tipo: TipoPrueba
    conexion: str
    script: str
    esperado: dict


class ResultadoPrueba(BaseModel):
    id: str
    paso: bool
    obtenido: str | None = None
    error: str | None = None


class ResultadoControl(BaseModel):
    control: str
    madurez: int
    estado: Estado
    pruebas: list[ResultadoPrueba] = []


class ResultadoAuditoria(BaseModel):
    timestamp: str
    modo: str  # "en_vivo" | "demo"
    controles: list[ResultadoControl] = []
