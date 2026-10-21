"""Guías de práctica de las empresas de demostración.

Cada empresa de laboratorio aporta laboratorio/<empresa>/guia_practica.json. El instrumento solo
sabe leer ese formato: no contiene ningún escenario ni nombre de empresa en su código.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class Paso(BaseModel):
    tipo: Literal["instrumento", "sql", "esperado"]
    texto: str | None = None
    codigo: str | None = None
    conexion: str | None = None

    @model_validator(mode="after")
    def _completo(self) -> Paso:
        if self.tipo == "sql":
            if not (self.codigo and self.conexion):
                raise ValueError("un paso 'sql' requiere 'codigo' y 'conexion'")
        elif not self.texto:
            raise ValueError(f"un paso '{self.tipo}' requiere 'texto'")
        return self


class Escenario(BaseModel):
    id: str = Field(pattern=r"^E\d+$")
    titulo: str
    nivel: Literal["básico", "intermedio", "avanzado"]
    objetivo: str
    observables: list[str]
    pasos: list[Paso] = Field(min_length=2)
    deshacer: str | None = None


class GuiaPractica(BaseModel):
    titulo: str
    descripcion: str
    conexion_sql: str
    preparacion: list[str]
    escenarios: list[Escenario]


def cargar_guias(directorio: Path) -> list[dict[str, Any]]:
    """Guías de todas las empresas de laboratorio encontradas (lista vacía si no hay carpeta)."""
    if not directorio.is_dir():
        return []
    guias = []
    for archivo in sorted(directorio.glob("*/guia_practica.json")):
        guia = GuiaPractica(**json.loads(archivo.read_text(encoding="utf-8")))
        guias.append({"empresa": archivo.parent.name, **guia.model_dump()})
    return guias
