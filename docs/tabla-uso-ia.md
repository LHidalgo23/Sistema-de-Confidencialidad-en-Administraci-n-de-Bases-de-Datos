# Tabla de uso de Inteligencia Artificial

> **Obligatorio.** Se llena desde el inicio del proyecto (18 oct 2026). Cada fila debe tener el **prompt exacto** (copiado tal cual del historial de la conversación), no un resumen. El uso de IA no documentado se considera plagio según el Reglamento de Faltas Estudiantiles UNA.

| # | Fecha | Herramienta IA | Prompt exacto utilizado | Aporte de la IA | Validación / corrección del estudiante | Fuente verificada |
|---|---|---|---|---|---|---|
| 1 | 2026-10-18 | Claude | *(PENDIENTE — copiar textual de la conversación previa donde se definió cómo implementar el sistema, el `plan-de-accion-iso27001-confidencialidad.md` y las decisiones de la sección 1. Esa conversación no está en el historial de esta sesión, debe completarse desde el historial original.)* | Discusión inicial de enfoque, decisiones técnicas (React+Vite / FastAPI+python-oracledb) y redacción del plan de acción | *(completar)* | Asignación oficial del curso (`docs_clase/`) |
| 2 | 2026-10-18 | Claude (Sonnet 5) | "Ok, ya tuvimos una conversacion de como implementar el sistema y tomando en cosideracion todo aun asi, vamos a construirlo basandote en el plan de accion, ocupo que te bases solo en los docs que estan en docs_clase, si ocupas mas informacion busca en fuentes confiables y me notificas, primero armemos la estructura, no hagas commits a git hub el git hub solo yo lo modifico" | Creó la estructura completa del repositorio (`docs/`, `sql/00_setup`, `sql/01_linea_base_insegura.sql`, `sql/02_controles/` con 16 scripts, `sql/03_verificacion/` con 24 pruebas P-01–P-24), el esqueleto funcional del backend (FastAPI: `main.py`, `db.py`, `runner.py`, `scoring.py`, `models.py` + datos `riesgos.json`/`tareas.json`/`controles.json`/`pruebas.json` transcritos del plan) y del frontend (React+Vite+Tailwind+Recharts+Router, páginas Dashboard/Matriz/Pruebas/Riesgos/Tareas/Plan de mejora/Documentación). Verificó que el backend instala, importa y sirve datos reales, y que el frontend compila (`npm run build`), sin hacer commits al repositorio | *(completar: qué carpetas/nombres cambié, qué contenido revisé línea por línea, qué eliminé)* | `docs_clase/plan-de-accion-iso27001-confidencialidad.md` (plan propio) y `docs_clase/Asignacion-ISO27001-Confidencialidad-DBA-II-Ciclo-2026-UNA.pdf` (asignación oficial) |
| 3 | 2026-10-18 | Claude (Sonnet 5) | "Ok, ya lo probe y corrio super bien siguiendo el plan de accion ya cumplimos con el dia 0?" | Verificó el checklist de FASE 0 del plan contra el estado real: confirmó Oracle XE accesible y `XEPDB1` en `READ WRITE` ejecutando `sqlplus / as sysdba` → `SHOW PDBS`, confirmó Python 3.14.7 y Node v24.21.0 instalados, y completó esta tabla de uso de IA con los prompts reales de la sesión | *(completar)* | Verificación directa contra la instancia Oracle local (no es una fuente externa, es la propia base de datos) |

> Agregar una fila por cada conversación/prompt relevante, en orden cronológico. No resumir ni parafrasear el prompt. La columna "Validación / corrección del estudiante" la completa el estudiante, no la IA — es la evidencia de revisión crítica exigida por la asignación.

---

## Declaración jurada

Yo, **[Nombre completo del estudiante]**, declaro que todo contenido generado con Inteligencia Artificial en este proyecto ha sido declarado en la tabla anterior, validado contra fuentes oficiales (ISO/IEC 27001:2022, ISO/IEC 27002:2022, documentación oficial de Oracle Database) y que asumo responsabilidad por su veracidad. Entiendo que omitir esta declaración constituye falta grave según el Reglamento de Faltas Estudiantiles de la Universidad Nacional.

Firma: ____________________  Fecha: ____________________
