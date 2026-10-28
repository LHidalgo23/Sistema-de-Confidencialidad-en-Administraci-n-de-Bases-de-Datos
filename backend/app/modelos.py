"""Modelos Pydantic: catálogo del instrumento y contratos de la API."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Estado(str, Enum):
    CUMPLE = "Cumple"
    NO_CUMPLE = "No cumple"
    PARCIAL = "Parcial"
    NO_EVALUABLE = "No evaluable"


class Severidad(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


# --------------------------------------------------------------------------
# Catálogo (instrumento genérico)
# --------------------------------------------------------------------------
class Regla(BaseModel):
    tipo: Literal["sin_filas"]


class Fuente(BaseModel):
    titulo: str
    url: str


class Observable(BaseModel):
    archivo: str
    columnas: list[str]
    identificador: list[str] = []  # columnas que identifican un hallazgo en resúmenes
    regla: Regla


class PasoCorrectivo(BaseModel):
    condicion: str | None = None  # None = paso de una secuencia, sin ser alternativo
    sql: str


class PlaceholderCorrectivo(BaseModel):
    """Un dato que el instrumento no puede generar (secreto o decisión de negocio) y que la
    persona que revisa el correctivo debe escribir antes de poder aplicarlo."""

    token: str = Field(pattern=r"^[a-z][a-z0-9_]*$")  # nombre del campo {token} en la plantilla
    alcance: Literal["global", "por_hallazgo"]  # global: un valor para todo el script; por_hallazgo: uno por fila
    guia: str  # de dónde sacar ese valor, en una o dos frases


class Correctivo(BaseModel):
    plantilla: str | None = None
    discriminador: str | None = None
    plantillas: dict[str, str] | None = None
    pasos: list[PasoCorrectivo] = []  # pasos previos o condicionales que no son la plantilla principal
    placeholders: list[PlaceholderCorrectivo] = []  # campos manuales que usan plantilla/plantillas/pasos
    nota: str = ""

    @model_validator(mode="after")
    def _una_sola_forma(self) -> Correctivo:
        simple = self.plantilla is not None
        por_tipo = self.discriminador is not None or self.plantillas is not None
        if simple == por_tipo:
            raise ValueError("el correctivo define 'plantilla' o 'discriminador'+'plantillas', no ambos ni ninguno")
        if por_tipo and not (self.discriminador and self.plantillas):
            raise ValueError("'discriminador' y 'plantillas' deben definirse juntos")
        return self


class EntradaCatalogo(BaseModel):
    id: str = Field(pattern=r"^OBS-\d{2}$")
    control_iso: str
    controles_adicionales: list[str] = []
    nombre: str
    descripcion: str | None = None  # explicación ampliada, no ambigua, del qué y el porqué del observable
    fuentes: list[Fuente] = []  # documentación oficial de Oracle que respalda la descripción
    notas_implementacion: str | None = None  # matices propios de cómo está escrita la consulta (no del control en sí)
    tipo_prueba: Literal["Consulta de catálogo", "Revisión de configuración", "Revisión de auditoría"]
    resultado_esperado: str
    riesgo: str
    tarea: str
    alcance: Literal["PDB", "Instancia", "Instancia/PDB"]
    version_min: int
    requiere: list[str] = []
    observable: Observable
    correctivo: Correctivo
    preventivo: str
    severidad: Severidad
    limitaciones: str | None = None

    @property
    def controles(self) -> list[str]:
        return [self.control_iso, *self.controles_adicionales]


class ControlISO(BaseModel):
    id: str
    nombre: str
    tema: str
    nucleo: bool
    justificacion: str = ""  # por qué el mecanismo de Oracle mitiga el riesgo
    implementacion: str = ""  # cómo se implementa en Oracle
    evidencia: str = ""  # vistas o parámetros que lo evidencian


class Riesgo(BaseModel):
    id: str
    resumen: str
    descripcion: str | None = None
    causa: str | None = None
    consecuencia: str | None = None
    probabilidad: int | None = None
    impacto: int | None = None
    nivel: int | None = None
    justificacion: str | None = None
    base_legal: str | None = None


class Tarea(BaseModel):
    id: str
    nombre: str
    descripcion: str | None = None
    frecuencia: str | None = None
    riesgos_asociados: list[str] = []


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------
class InstanciaCrear(BaseModel):
    """Conexión opcional a CDB$ROOT para los controles de instancia (respaldos, parámetros, sesiones)."""

    dsn: str = Field(description="host:puerto/servicio del contenedor raíz")
    usuario: str = Field(min_length=1, max_length=128)
    password: str | None = Field(default=None, repr=False)


class EmpresaCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    sector: str = Field(default="", max_length=60)
    dsn: str = Field(description="host:puerto/servicio_de_la_PDB")
    usuario: str = Field(min_length=1, max_length=128)
    password: str | None = Field(default=None, repr=False)
    perfil: dict = Field(default_factory=dict)
    instancia: InstanciaCrear | None = None


class EmpresaPublica(BaseModel):
    id: int
    nombre: str
    sector: str
    dsn: str
    usuario: str
    credenciales_guardadas: bool
    perfil: dict
    creada_en: str
    instancia_configurada: bool = False
    dsn_instancia: str | None = None
    usuario_instancia: str | None = None
    credenciales_instancia_guardadas: bool = False


class Credencial(BaseModel):
    password: str | None = Field(default=None, repr=False)
    password_instancia: str | None = Field(default=None, repr=False)


class AuditarPeticion(Credencial):
    etiqueta: str = Field(default="", max_length=40)


class RevisionPeticion(BaseModel):
    revisor: str = Field(min_length=2, max_length=80)
    notas: str = Field(default="", max_length=500)


class MarcarCorrectivoPeticion(BaseModel):
    estado: Literal["resuelto", "pendiente"]
    nota: str = Field(default="", max_length=300)


class ValoresCorrectivo(BaseModel):
    """Lo que la persona llenó a mano en la pantalla de correctivos, para sustituir
    los placeholders antes de generar el script final. Nunca se guarda."""

    globales: dict[str, str] = {}  # token -> valor, uno para todo el script
    por_hallazgo: dict[str, dict[str, dict[str, str]]] = {}  # obs_id -> clave_hallazgo -> {token: valor}


class ColumnaRef(BaseModel):
    esquema: str
    tabla: str
    columna: str


class ConfirmacionDescubrimiento(BaseModel):
    confirmadas: list[ColumnaRef] = []
    descartadas: list[ColumnaRef] = []
