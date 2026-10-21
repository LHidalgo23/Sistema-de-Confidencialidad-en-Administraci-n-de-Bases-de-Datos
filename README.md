# Instrumento de auditoría de confidencialidad (ISO/IEC 27001:2022) para Oracle

Sistema web que se conecta a **cualquier** base Oracle 19c/21c, la analiza sin conocerla de antemano y evalúa controles de confidencialidad del Anexo A de ISO/IEC 27001:2022 con la secuencia **observable → hallazgo → correctivo → re-observación**.

**Curso:** Administración de Bases de Datos (EIF402) — Escuela de Informática, Universidad Nacional de Costa Rica — Prof. Johnny Villalobos Murillo — II Ciclo 2026
**Autor:** Luis Hidalgo — trabajo individual · **Metodología:** PHVA

> Plan de trabajo vigente: [`docs_clase/plan-de-accion-v2-instrumento-escalable.md`](docs_clase/plan-de-accion-v2-instrumento-escalable.md). El plan v1 se conserva en `docs_clase/` como referencia histórica.

## Concepto

```
          ┌──────────────── INSTRUMENTO (genérico) ────────────────┐
          │  Catálogo de controles (JSON + SQL)  +  Motor           │
          └───────────────────────────┬─────────────────────────────┘
                                      │ se "pega" a cualquier base
        Empresa ficticia          Empresa X               Empresa Y …
      (Clínica Los Robles)      Oracle 19c/21c
        ← demo en clase
```

- El **instrumento** (`instrumento/` + `backend/` + `frontend/`) no contiene nada de ninguna empresa. Una consulta que mencione una empresa concreta está mal diseñada; una prueba automática lo verifica.
- La **clínica ficticia** (`laboratorio/clinica/`) solo existe para la demostración y generar evidencia.
- El instrumento **observa y propone; no ejecuta correcciones**. Las aplica el DBA de la empresa (separación de funciones y gestión de cambios).
- Solo lee **metadatos y configuración**, nunca datos de negocio: auditar confidencialidad leyendo datos sensibles sería contradictorio.

### Ciclo por empresa

| Paso | Qué hace | Tipo de control | PHVA |
|---|---|---|---|
| 1. Registrar | Nombre, conexión, perfil de política | — | Planificar |
| 2. Pre-vuelo | Versión, CDB/PDB, privilegios del auditor | — | Planificar |
| 3. Descubrimiento | Esquemas de negocio y columnas sensibles (metadatos) | — | Planificar |
| 4. **Observar** | Ejecuta los observables del catálogo | Detectivo | Verificar |
| 5. Evaluar | Madurez 0-4 y estado por control | — | Verificar |
| 6. **Corregir** | Script correctivo para que el DBA lo revise y aplique | Correctivo | Hacer / Actuar |
| 7. **Re-observar** | Los mismos observables otra vez; matriz antes/después | Detectivo | Verificar |
| 8. Prevenir y reportar | Controles preventivos, historial, exportación | Preventivo | Actuar |

Estados: **Cumple · Parcial · No cumple · No evaluable** (cuando el usuario auditor no puede ver algo, el control no se marca como incumplido: se reporta que no se pudo observar).

## Estructura

```
instrumento/                   GENÉRICO: sirve para cualquier empresa
├── onboarding_auditor.sql     crea AUDITOR_ISO con privilegio mínimo (en la PDB)
├── onboarding_auditor_instancia.sql   opcional: C##AUDITOR_ISO para controles de instancia (CDB$ROOT)
├── catalogo_controles.json    la matriz-instrumento (24 observables)
├── controles_iso.json         los 15 controles núcleo + 4 extras justificados
├── riesgos.json, tareas.json  riesgos R-CONF y tareas del DBA que el catálogo referencia
├── perfil_politica_default.json   umbrales ISO y patrones de datos sensibles
└── sql/observables/           un .sql por observable (OBS-01 … OBS-24)
laboratorio/clinica/           SOLO para la demo en clase (ver su README); incluye guia_practica.json
backend/                       FastAPI + python-oracledb (thin) + SQLite propio
├── app/                       empresas, conexiones, prevuelo, descubrimiento, motor, evaluacion,
│                              correctivos, reportes, catalogo, laboratorios, almacen, config, main
└── tests/                     pruebas automáticas (no requieren Oracle)
frontend/                      React + Vite + Tailwind + Recharts
docs/                          informe, marco teórico, tabla de uso de IA, referencias APA 7, evidencias
docs_clase/                    asignación, apuntes y planes de acción
```

Cada observable es un `.sql` de solo lectura con variables *bind* (`:dias_inactividad`, `:cuentas_dba_autorizadas`, `:esquemas_negocio`, `:columnas_sensibles`…). Las listas se envían como un único arreglo JSON que la consulta lee con `JSON_TABLE`; las exclusiones usan `NOT EXISTS` y no `NOT IN`, porque un solo `NULL` en la lista haría que `NOT IN` ocultara todos los hallazgos. El mismo archivo se puede ejecutar a mano en SQL Developer.

## Requisitos

- Python 3.11+ y Node.js 20+
- Una base Oracle 19c/21c con un usuario auditor creado con `instrumento/onboarding_auditor.sql`

## Instalación

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Windows
pip install -r requirements-dev.txt    # requirements.txt si no se van a correr las pruebas
cp .env.example .env
python -c "from app.conexiones import generar_llave; print(generar_llave())"   # pegar en AUDITORIA_LLAVE_CIFRADO
uvicorn app.main:app --reload --port 8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev                            # http://localhost:5173
```

Pruebas del backend: `cd backend && python -m pytest`.

## Levantar todo con doble clic: `iniciar.cmd`

Desde la raíz del repositorio, doble clic en **`iniciar.cmd`** (o `iniciar.cmd` en una consola). Compila el frontend con el código actual, prepara el backend y abre el navegador en `http://127.0.0.1:8000` (o el siguiente puerto libre). Es un solo servidor: el backend sirve también el frontend.

```bat
iniciar.cmd                   :: normal
iniciar.cmd --puerto 9000     :: otro puerto
iniciar.cmd --sin-navegador   :: sin abrir el navegador
```

- Requiere Python 3.11+ y Node.js 20+ en el PATH. La primera vez tarda unos minutos porque instala dependencias; después arranca en segundos, y solo reinstala si cambian `frontend/package-lock.json` o `backend/requirements.txt`.
- Los datos (base SQLite de empresas y ejecuciones, y la llave de cifrado) viven en `%LOCALAPPDATA%\AuditorISO`, los mismos que usa el `.exe`. El entorno virtual de Python también vive ahí, fuera del repositorio y de OneDrive. Para usar otra carpeta, defina `AUDITORIA_DATOS_DIR` antes de ejecutarlo.
- La primera vez se genera la llave; **respalde** `%LOCALAPPDATA%\AuditorISO\.env`, porque sin ella no se pueden descifrar las contraseñas guardadas.
- Escucha solo en `127.0.0.1`. Para detenerlo se cierra la ventana de consola (o Ctrl+C).

### Ejecutable para una máquina sin Python ni Node (opcional)

`AuditorISO.exe` empaqueta lo mismo en una carpeta que no necesita Python ni Node donde se usa. Solo hace falta para llevar el instrumento a otro equipo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\construir_exe.ps1   # construir (requiere Python y Node)
dist\AuditorISO\AuditorISO.exe                                       # usar
```

Se distribuye la carpeta `dist\AuditorISO\` completa, no solo el `.exe`. Comparte datos y llave con `iniciar.cmd`.

## Auditar una empresa nueva en 4 pasos

1. **Incorporar al auditor.** El DBA de la empresa ejecuta `instrumento/onboarding_auditor.sql` conectado a la PDB que se va a auditar.
2. **Registrar la empresa** en la pantalla *Empresas* (conexión `host:puerto/servicio_de_la_PDB`, usuario `AUDITOR_ISO`, perfil de política opcional) y ejecutar el *Pre-vuelo* y el *Descubrimiento*.
3. **Observar** desde el *Dashboard*, revisar los hallazgos y descargar el script correctivo; el DBA lo revisa, lo completa y lo aplica.
4. **Re-observar** con otra ejecución y comparar en la *Matriz* (antes/después, exportable a CSV).

La demostración con la clínica ficticia sigue el mismo flujo: ver [`laboratorio/clinica/README.md`](laboratorio/clinica/README.md).

### Conexión de instancia (opcional)

Cuatro controles son de alcance *Instancia* (respaldos, `AUDIT_SYS_OPERATIONS` y password file, sesiones sin cifrar, parches) y no se ven desde una PDB. Si la empresa registra una segunda conexión a `CDB$ROOT` con un usuario común creado con `instrumento/onboarding_auditor_instancia.sql`, esos observables se ejecutan ahí y su resultado indica el origen («PDB» o «Instancia»). Sin ella, el instrumento no inventa nada: los reporta «No evaluable» con el motivo.

### Guías y práctica

Cada pantalla trae el panel plegable «¿Qué es esto y cómo lo pruebo?» y la pantalla *Práctica* lista escenarios con resultado esperado para la empresa de demostración. En el Catálogo, las pestañas *Mapeo de controles* y *Batería de pruebas* muestran la justificación de cada control y cómo se prueba.

## Coherencia: el instrumento aplica lo que audita

| Control | Cómo lo cumple el propio instrumento |
|---|---|
| A8.2 / A5.15 mínimo privilegio | El auditor solo tiene `CREATE SESSION`, `SELECT_CATALOG_ROLE` y `AUDIT_VIEWER`; el pre-vuelo advierte si tiene más |
| A5.17 autenticación | Perfil dedicado con límites para `AUDITOR_ISO`; contraseña por consola, nunca en un script |
| A8.24 criptografía | Contraseñas de las empresas cifradas en reposo (Fernet); la llave vive en `.env` |
| A5.15 / A8.3 | Las consultas son de solo lectura y no leen datos de negocio |

Nada de esto se versiona: `.env`, `*.db` y wallets están en `.gitignore`. Los correctivos se generan escapando cada valor según su contexto y, si un nombre no es seguro, lo dejan como comentario «REVISAR MANUALMENTE».

## Estado de la validación

Los 24 observables **se ejecutaron contra Oracle 21c XE real** (PDB `PDB_CLINICA`, usuario `AUDITOR_ISO`) y la validación corrigió varios errores de consultas, scripts y empaquetado que las pruebas con una conexión simulada no podían detectar. Los seis que exige el avance (OBS-02, 04, 06, 09, 10 y 22) funcionan.

| Resultado en la línea base de la clínica | Observables |
|---|---|
| Detectan el hallazgo intencional | OBS-01, 02, 03, 04*, 06, 07, 09, 10, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 24 |
| Cumple (no hay hallazgo) | OBS-05, 11, 23 |
| No evaluable (no visible desde una PDB) | OBS-17 |

\* OBS-04 usa el umbral `dias_inactividad = 1` del laboratorio: `EXEMPLEADO_01` aparece como hallazgo un día después de crearse (ver `laboratorio/clinica/README.md`).

Evidencia "antes" en [`docs/evidencias/fase1/`](docs/evidencias/fase1/): pre-vuelo, descubrimiento, la ejecución completa, los hallazgos por observable, la matriz (CSV), el script correctivo generado y 11 capturas de pantalla.

Sigue pendiente validar contra Oracle los **correctivos** (se aplican en la Fase 3), en particular los de auditoría unificada (nombres de acciones como `GRANT`/`REVOKE`), la purga de la pista (`DBMS_AUDIT_MGMT`), TDE y Data Redaction. Las pruebas automáticas (`python -m pytest`) cubren catálogo, motor, evaluación, correctivos y API con una conexión simulada.

## Uso de Inteligencia Artificial

Todo uso de IA generativa está documentado en [`docs/tabla-uso-ia.md`](docs/tabla-uso-ia.md): prompt exacto, aporte y validación o corrección propia, como exige la asignación.

## Licencia / uso académico

Proyecto con fines estrictamente académicos para el curso Administración de Bases de Datos, UNA, II Ciclo 2026. Todos los datos del laboratorio son ficticios.
