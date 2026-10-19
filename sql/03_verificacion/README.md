# Pruebas de verificación (P-01 a P-24)

Cada archivo `PNN_<descripcion>.sql` es una prueba independiente, ejecutada por `backend/app/runner.py` contra Oracle con el usuario indicado en su cabecera (normalmente `AUDITOR_APP`, de solo lectura). El catálogo completo (control, riesgo, tarea, tipo, conexión, resultado esperado y ruta del script) vive en [`backend/data/pruebas.json`](../../backend/data/pruebas.json) — esa es la fuente que consume el backend; estos `.sql` son la fuente de verdad de *qué* se ejecuta.

## Tipos de prueba

- **Configuración**: una consulta de catálogo (`DBA_*`, `V$*`) que debe devolver un resultado específico (p. ej. 0 filas).
- **Negativa**: se ejecuta con el usuario restringido y se espera un error Oracle concreto (p. ej. `ORA-00942`), o un resultado ya filtrado por una política (VPD/Redaction).
- **Auditoría**: se genera una acción y luego se verifica que quedó registrada en `UNIFIED_AUDIT_TRAIL`.
- **Comparación**: se contrastan dos conjuntos de datos (p. ej. `CLINICA` vs. `CLINICA_DEV`).

## Convención de resultado

Cada script debe devolver algo que el backend pueda evaluar automáticamente contra `pruebas.json.esperado` (una fila con un conteo, o provocar un error ORA capturado por `runner.py`). Evitar `SELECT *` sin criterio: siempre un resultado acotado y determinístico.

Ejecutadas contra la línea base insegura (`sql/01_linea_base_insegura.sql`), estas pruebas deben fallar (estado "antes"). Ejecutadas después de aplicar `sql/02_controles/`, deben pasar (estado "después").
