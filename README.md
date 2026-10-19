# Sistema de Confidencialidad en Administración de Bases de Datos

Controles ISO/IEC 27001:2022 e ISO/IEC 27002:2022 para la **confidencialidad** en tareas del DBA, aplicados sobre un caso ficticio (*Clínica Los Robles S.A.*) en **Oracle 21c XE**. Incluye un sistema web de auditoría en vivo (antes/después) construido con React + Vite y FastAPI + python-oracledb.

**Curso:** Administración de Bases de Datos (EIF402) — Escuela de Informática, Universidad Nacional de Costa Rica — Prof. Johnny Villalobos Murillo — II Ciclo 2026
**Autor:** Luis Hidalgo — trabajo individual
**Metodología:** PHVA (Planificar, Hacer, Verificar, Actuar)

> El plan de trabajo detallado (fases, fechas, decisiones) está en [`docs_clase/plan-de-accion-iso27001-confidencialidad.md`](docs_clase/plan-de-accion-iso27001-confidencialidad.md). La asignación oficial está en [`docs_clase/`](docs_clase/).

---

## Estructura del repositorio

```
.
├── docs/                   Informe, marco teórico, tabla de uso de IA, referencias, evidencias
├── sql/
│   ├── 00_setup/           Tablespaces, esquema CLINICA, datos ficticios, usuarios/roles
│   ├── 01_linea_base_insegura.sql   Línea base con fallas intencionales (punto de partida "antes")
│   ├── 02_controles/       Un script por control ISO (A5.12 … A8.33)
│   └── 03_verificacion/    Pruebas P-01 a P-24 (una por control/escenario)
├── backend/                FastAPI + python-oracledb: ejecuta los .sql y calcula madurez/estado
└── frontend/                React + Vite: dashboard, matriz de evaluación, pruebas, plan de mejora
```

Detalle completo de cada carpeta en [`docs_clase/plan-de-accion-iso27001-confidencialidad.md`](docs_clase/plan-de-accion-iso27001-confidencialidad.md#3-estructura-del-repositorio).

---

## Requisitos

- Oracle Database 21c XE con el PDB `XEPDB1` en `READ WRITE`
- SQL Developer (para ejecutar y revisar los scripts manualmente)
- Python 3.11+
- Node.js 20+

## Instalación y ejecución

### 1. Base de datos

1. Verificar que el PDB esté abierto: `sqlplus / as sysdba` → `SHOW PDBS`.
2. Ejecutar en orden los scripts de `sql/00_setup/` contra `XEPDB1` (crean tablespaces, el esquema `CLINICA`, los datos ficticios y los usuarios de aplicación, incluyendo `AUDITOR_APP`).
3. (Opcional, para reproducir el estado "antes") ejecutar `sql/01_linea_base_insegura.sql`.
4. Ejecutar los scripts de `sql/02_controles/` para aplicar los controles (estado "después").
5. Los scripts de `sql/03_verificacion/` contienen las pruebas P-01 a P-24 que el sistema ejecuta.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # completar credenciales de AUDITOR_APP y el DSN
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173` y consume la API en `http://localhost:8000`.

### Modo demo

Si no hay una instancia de Oracle disponible, el frontend puede leer los snapshots `backend/snapshots/antes.json` y `backend/snapshots/despues.json` en lugar de consultar la base en vivo.

---

## Diseño: motor genérico, caso de evidencia específico

El motor de auditoría (catálogo de controles/riesgos/tareas en `backend/data/*.json`, el runner de pruebas, la API y el dashboard) **no está acoplado a la clínica**: es un framework de auditoría de confidencialidad ISO/IEC 27001 para Oracle, reutilizable con cualquier esquema. `Clínica Los Robles S.A.` es únicamente el caso ficticio usado para generar evidencia real (datos, SQL, resultados antes/después) en este proyecto. La identidad del cliente auditado vive en `backend/data/caso.json` (servido vía `GET /api/caso`) y el resto del sistema no depende de ese archivo para funcionar.

## Seguridad y credenciales

- Ninguna credencial real se versiona en este repositorio. El archivo `.env` (con usuario/contraseña de `AUDITOR_APP` y el DSN de conexión) está excluido vía `.gitignore`; usar `backend/.env.example` como plantilla.
- Todos los datos del caso (`Clínica Los Robles S.A.`, pacientes, empleados, expedientes) son **ficticios**, generados por script.
- El wallet de TDE y su contraseña no se versionan.

## Uso de Inteligencia Artificial

Todo uso de IA generativa en este proyecto está documentado en [`docs/tabla-uso-ia.md`](docs/tabla-uso-ia.md), incluyendo el prompt exacto, el aporte y la validación/corrección aplicada, según lo exige la asignación del curso.

## Licencia / Uso académico

Proyecto desarrollado con fines estrictamente académicos para el curso Administración de Bases de Datos, UNA, II Ciclo 2026.
