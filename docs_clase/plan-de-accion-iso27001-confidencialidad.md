# Plan de acción — Controles ISO 27001:2022 para la Confidencialidad en Oracle

**Curso:** Administración de Bases de Datos (EIF402) — Prof. Johnny Villalobos Murillo — II Ciclo 2026
**Modalidad:** Individual (se verifica individualidad y originalidad)
**Motor:** Oracle 21c XE (PDB `XEPDB1`) · **Metodología:** PHVA · **Herramienta:** SQL Developer
**Artefacto:** Sistema web de auditoría en vivo — React + Vite (frontend) · FastAPI + python-oracledb (backend)

---

## 0. Fechas y reglas que no se negocian

| Fecha | Hito | Nota |
|---|---|---|
| Dom 18 oct | Arranque | Este plan |
| **Jue 22 oct** | **Avance obligatorio** | No presentarlo = **pérdida del proyecto** |
| **Jue 29 oct, 8:00–12:00 md** | **Entrega formal** | Informe, scripts, repo, video, tabla IA |

**Reglas de oro**
- [ ] Todo uso de IA se documenta **desde hoy** (prompt exacto + qué corregí + fuente). Uso no documentado = plagio.
- [ ] Redactar todo con palabras propias. Las tablas de ejemplo de las conversaciones con IA son una guía, no texto para copiar.
- [ ] Los scripts del repositorio son la única fuente de verdad: el sistema ejecuta **esos mismos** `.sql`.
- [ ] El análisis (60 % de la nota) va primero; el frontend bonito va después.

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Tipo de artefacto | Sistema web de auditoría en vivo + informe PDF |
| Frontend | React + Vite + Tailwind CSS + shadcn/ui + Recharts |
| Backend | Python + FastAPI + python-oracledb (modo *thin*, sin Instant Client) |
| Base de datos | Oracle 21c XE, PDB `XEPDB1` (incluye TDE, Data Redaction, auditoría unificada) |
| Enfoque | Línea base **insegura** → aplicar controles → re-auditar (**antes / después**) |
| Controles núcleo | Los 15 de la asignación: A5.12, A5.15, A5.16, A5.17, A5.18, A5.33, A8.2, A8.3, A8.5, A8.10, A8.11, A8.12, A8.13, A8.15, A8.20 |
| Controles extra justificados | A8.24 (criptografía/TDE), A8.8 (vulnerabilidades/parcheo), A8.31 y A8.33 (ambientes e información de prueba) |
| Usuario del sistema | `AUDITOR_APP` de solo lectura (`CREATE SESSION`, `SELECT_CATALOG_ROLE`, `AUDIT_VIEWER`) |
| Credenciales | Archivo `.env` fuera del repositorio (`.gitignore`) |

---

## 2. Caso de estudio ficticio (base de todo)

> Empresa **ficticia**: *Clínica Los Robles S.A.* Maneja datos personales y **datos sensibles de salud**, por lo que aplica directamente la **Ley 8968**.

### 2.1 Esquema `CLINICA` (dueño de objetos, sin login)

| Tabla | Columnas sensibles | Clasificación (A5.12) |
|---|---|---|
| `PACIENTES` | cédula, fecha de nacimiento, teléfono, correo, dirección | Confidencial — dato personal |
| `EXPEDIENTES` | diagnóstico, tratamiento, médico asignado | **Restringido — dato sensible (salud)** |
| `EMPLEADOS` | cédula, salario, cuenta IBAN (ficticia) | Confidencial — dato personal/financiero |
| `CITAS` | paciente, médico, fecha | Interno |
| `CLASIFICACION_DATOS` | inventario: tabla, columna, nivel, base legal | Tabla de control (evidencia A5.12) |
| `REVISION_ACCESOS` | fecha, revisor, hallazgos | Tabla de control (evidencia A5.18) |

- [ ] Datos 100 % inventados (generados con script), nunca datos reales.
- [ ] Tablas sensibles en un tablespace propio: `TS_CLINICA_SENSIBLE` (luego se cifra con TDE).

### 2.2 Usuarios y roles

| Usuario | Propósito | Rol(es) |
|---|---|---|
| `CLINICA` | Dueño del esquema | (cuenta bloqueada / sin `CREATE SESSION` al final) |
| `APP_CLINICA` | Aplicación | `ROL_APP` |
| `MEDICO_01`, `MEDICO_02` | Médicos | `ROL_MEDICO` (VPD: solo sus pacientes) |
| `RECEPCION_01` | Recepción | `ROL_RECEPCION` (sin acceso a `EXPEDIENTES`) |
| `RRHH_01` | Recursos humanos | `ROL_RRHH` (salarios) |
| `DEV_USER` | Desarrollador | `ROL_DESARROLLO` (datos redactados) |
| `USUARIO1` | DBA nominal | DBA sin usar `SYSTEM` para el día a día |
| `BACKUP_OP` | Operador de respaldos | `SYSBACKUP` (separación de funciones) |
| `AUDITOR_APP` | Sistema de auditoría | Solo lectura de catálogo y auditoría |

### 2.3 Línea base insegura (errores intencionales — `01_linea_base_insegura.sql`)

Cada error está pensado para que una prueba lo detecte:

- [ ] `GRANT DBA TO APP_CLINICA;` → detecta P-09
- [ ] `GRANT SELECT ANY TABLE TO DEV_USER;` → P-10
- [ ] `GRANT SELECT ON CLINICA.PACIENTES TO PUBLIC;` → P-02
- [ ] Grants directos a usuarios (sin roles) → P-03
- [ ] Usuarios con perfil `DEFAULT` sin límites y contraseñas débiles → P-06, P-07
- [ ] Usuario inactivo `EXEMPLEADO_01` con cuenta abierta → P-04
- [ ] Sin VPD, sin Data Redaction, sin políticas de auditoría → P-12, P-16, P-19
- [ ] Tablespace sensible sin cifrar → P-22
- [ ] Tabla con datos borrada sin `PURGE` (queda en recyclebin) → P-15
- [ ] `EXECUTE` sobre `UTL_FILE` / `UTL_HTTP` a `PUBLIC` (verificar estado por defecto y documentarlo) → P-17
- [ ] Backup RMAN sin cifrar → P-18
- [ ] `sqlnet.ora` sin cifrado de red ni validación de nodos → P-21

---

## 3. Estructura del repositorio

```
iso27001-confidencialidad-oracle/
├── README.md                     ← cómo instalar, correr y reproducir
├── .gitignore                    ← .env, node_modules, __pycache__, wallets
├── docs/
│   ├── informe.md / informe.pdf
│   ├── marco-teorico.md
│   ├── tabla-uso-ia.md           ← se llena DESDE HOY
│   ├── referencias-apa7.md
│   └── evidencias/               ← capturas antes/después
├── sql/
│   ├── 00_setup/
│   │   ├── 00_crear_tablespaces.sql
│   │   ├── 01_crear_esquema_clinica.sql
│   │   ├── 02_datos_ficticios.sql
│   │   └── 03_usuarios_y_auditor_app.sql
│   ├── 01_linea_base_insegura.sql
│   ├── 02_controles/             ← un script por control
│   │   ├── A5_12_clasificacion.sql
│   │   ├── A5_15_A5_18_roles_y_privilegios.sql
│   │   ├── A5_16_identidades.sql
│   │   ├── A5_17_A8_5_perfiles_autenticacion.sql
│   │   ├── A5_33_proteccion_registros_auditoria.sql
│   │   ├── A8_2_acceso_privilegiado.sql
│   │   ├── A8_3_vpd.sql
│   │   ├── A8_10_eliminacion_segura.sql
│   │   ├── A8_11_data_redaction.sql
│   │   ├── A8_12_dlp.sql
│   │   ├── A8_13_rman_cifrado.rman
│   │   ├── A8_15_auditoria_unificada.sql
│   │   ├── A8_20_red_sqlnet.md   ← cambios de sqlnet.ora / listener.ora
│   │   ├── A8_24_tde.sql
│   │   └── A8_33_enmascarar_clon_dev.sql
│   └── 03_verificacion/          ← un script por prueba (P01_... a P24_...)
├── backend/
│   ├── app/
│   │   ├── main.py               ← FastAPI + CORS
│   │   ├── db.py                 ← pool de conexiones por usuario
│   │   ├── runner.py             ← ejecuta .sql y compara con lo esperado
│   │   ├── scoring.py            ← madurez 0-4 y estado
│   │   └── models.py             ← Pydantic
│   ├── data/
│   │   ├── riesgos.json
│   │   ├── tareas.json
│   │   ├── controles.json
│   │   └── pruebas.json          ← catálogo de pruebas
│   ├── snapshots/                ← antes.json, despues.json
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── (React + Vite)
```

---

## 4. Plan día por día

### FASE 0 — Preparación (Dom 18, noche)

- [ ] Crear el repositorio Git institucional con la estructura anterior.
- [ ] Crear `docs/tabla-uso-ia.md` y registrar las conversaciones con IA de hoy (copiar los prompts **textuales** desde el historial).
- [ ] Verificar Oracle XE: `sqlplus / as sysdba` → `SHOW PDBS` → `XEPDB1` en `READ WRITE`.
- [ ] Verificar SQL Developer conectado a `XEPDB1`.
- [ ] Verificar Python 3.11+ y Node 20+ instalados.
- [ ] **Respaldo previo de la base** (RMAN o copia en frío) antes de tocar TDE y parámetros.

**Listo cuando:** repo creado, Oracle accesible, tabla IA iniciada.

---

### FASE 1 — Planificar: riesgos y tareas (Lun 19)

**1.1 Riesgos (componente 1 del artefacto — 20 %)**
- [ ] Definir escala: Probabilidad 1–5 × Impacto 1–5. Nivel: 1–6 Bajo, 8–12 Medio, 15–25 Alto.
- [ ] Redactar R-CONF-01 a R-CONF-06 con descripción, causa, consecuencia, P, I y nivel:

| ID | Riesgo (resumen) |
|---|---|
| R-CONF-01 | Privilegios excesivos (ANY, DBA, PUBLIC) |
| R-CONF-02 | Cuentas por defecto, inactivas o con contraseñas débiles |
| R-CONF-03 | Robo de datafiles o backups sin cifrar |
| R-CONF-04 | Clones DEV/TEST con datos personales reales |
| R-CONF-05 | Acceso privilegiado sin auditoría ni trazabilidad |
| R-CONF-06 | Tráfico de red sin cifrar / listener expuesto |

- [ ] Relacionar cada riesgo con la Ley 8968 (dato personal vs. dato sensible).

**1.2 Tareas del DBA (componente 2)**
- [ ] Tabla `ID | Tarea | Descripción | Frecuencia | Riesgos asociados` para las 12 tareas:
  T-01 Gestión de usuarios · T-02 Privilegios y roles · T-03 Autenticación/perfiles · T-04 Cifrado TDE · T-05 Masking/Redaction · T-06 Backup · T-07 Auditoría · T-08 Parcheo · T-09 Listener/red · T-10 Eliminación segura · T-11 Gestión de logs · T-12 Clones DEV/TEST

**1.3 Caso ficticio**
- [ ] Escribir `00_crear_tablespaces.sql`, `01_crear_esquema_clinica.sql`, `02_datos_ficticios.sql` (mín. 200 pacientes, 50 empleados).
- [ ] Ejecutarlos en `XEPDB1` y guardar captura.

**Listo cuando:** riesgos y tareas redactados en `informe.md`; esquema creado con datos.

---

### FASE 2 — Planificar: controles y matriz (Mar 20)

**2.1 Mapeo de controles (componente 3 — 20 %)**
- [ ] Tabla `Control | Nombre | Riesgo(s) | Tarea(s) | Justificación | Implementación en Oracle | Evidencia observable`.
- [ ] Justificación **del mecanismo**, no genérica (ej.: "A8.11 mitiga R-CONF-04 porque el desarrollador recibe la cédula redactada aunque tenga SELECT").
- [ ] Sección de controles extra (A8.24, A8.8, A8.31, A8.33) explicando por qué se agregan.
- [ ] Nota: `pg_hba.conf` es de PostgreSQL; en Oracle el equivalente es `sqlnet.ora` (`TCP.VALIDNODE_CHECKING`, `TCP.INVITED_NODES`).

**2.2 15 controles observables (componente 4)**
- [ ] Para cada control: `CO-xx | Control | Qué se verifica | Cómo (consulta/archivo) | Resultado aceptable`.

**2.3 Escala de madurez y regla de estado (componente 5)**

| Nivel | Nombre | Criterio |
|---|---|---|
| 0 | Inexistente | No hay control |
| 1 | Inicial | Informal o inconsistente |
| 2 | Repetible | Implementado parcialmente / sin documentar |
| 3 | Definido | Implementado, documentado y consistente |
| 4 | Gestionado | Además monitoreado, auditado y revisado periódicamente |

- [ ] Regla de estado: **0–1 No cumple · 2 Parcial · 3–4 Cumple**.
- [ ] Regla de cálculo desde pruebas (la misma en informe y en `scoring.py`):
  - 0 pruebas pasan → 0 · < 50 % → 1 · ≥ 50 % → 2 · 100 % → 3 · 100 % + auditoría activa sobre el control + evidencia de revisión → 4

**2.4 Línea base insegura**
- [ ] Escribir y ejecutar `03_usuarios_y_auditor_app.sql` y `01_linea_base_insegura.sql`.

**Listo cuando:** mapeo, observables, escala y matriz (esqueleto) en el informe; línea base aplicada.

---

### FASE 3 — Hacer (inicio): scripts y esqueleto del sistema (Mié 21)

**3.1 Primeras pruebas de verificación (prioridad para el avance)**
- [ ] P-02 grants a PUBLIC · P-09 rol DBA · P-10 privilegios ANY · P-06 perfiles · P-22 wallet TDE (`V$ENCRYPTION_WALLET`).
- [ ] Ejecutarlas contra la línea base: deben salir en **No cumple** → capturas de evidencia "antes".

**3.2 Backend mínimo**
- [ ] `pip install fastapi uvicorn oracledb python-dotenv`
- [ ] `db.py`: conexión con `oracledb.connect(user, password, dsn="localhost:1521/XEPDB1")` usando `.env`.
- [ ] `runner.py`: leer `.sql`, ejecutar (una sentencia por script), devolver filas o error ORA.
- [ ] Endpoints: `GET /api/pruebas`, `POST /api/auditoria`.
- [ ] Habilitar CORS para `http://localhost:5173`.

**3.3 Frontend mínimo**
- [ ] `npm create vite@latest frontend -- --template react` + Tailwind.
- [ ] Dashboard con semáforo de controles y botón "Ejecutar auditoría".
- [ ] Tabla de matriz simple.

**Listo cuando:** clic en el dashboard → se ejecutan 5 pruebas reales → semáforo en rojo.

---

### ★ AVANCE — Jue 22 oct

**Mostrar:**
- [ ] Caso ficticio y su relación con la Ley 8968
- [ ] Tabla de riesgos R-CONF con escala
- [ ] Tabla de 12 tareas del DBA
- [ ] Mapeo de los 15 controles + extras
- [ ] Escala de madurez y matriz (parcial)
- [ ] 5 pruebas funcionando en el sistema contra Oracle (estado "antes")
- [ ] Repositorio con estructura y commits
- [ ] Tabla de uso de IA iniciada

**Preparar:** explicación de 3–5 minutos siguiendo la cadena *riesgo → tarea → control → evidencia → madurez → prueba*.
- [ ] Anotar la retroalimentación del profesor y ajustar el plan.

---

### FASE 4 — Hacer: implementar los controles en Oracle (Vie 23 – Sáb 24)

> Orden recomendado: de lo menos invasivo a lo más invasivo. **Respaldo antes de TDE.**

- [ ] **A5.15 / A5.18** — Crear roles funcionales, mover grants a roles, revocar grants directos y a PUBLIC.
- [ ] **A8.2** — Revocar `DBA` y privilegios `ANY` no justificados; `BACKUP_OP` con `SYSBACKUP`; confirmar `AUDIT_SYS_OPERATIONS=TRUE`.
- [ ] **A5.16** — Bloquear cuentas inactivas y por defecto; cuentas nominales.
- [ ] **A5.17 / A8.5** — Perfil `PERFIL_USUARIOS` (verify function, `FAILED_LOGIN_ATTEMPTS`, `PASSWORD_LIFE_TIME`, `IDLE_TIME` — mencionado en clase); solo hashes `12C`.
- [ ] **A5.12** — Llenar `CLASIFICACION_DATOS` + `COMMENT ON COLUMN`.
- [ ] **A8.3** — VPD con `DBMS_RLS.ADD_POLICY` en `EXPEDIENTES` (médico solo ve sus pacientes).
- [ ] **A8.11** — `DBMS_REDACT.ADD_POLICY` sobre cédula, salario e IBAN para `DEV_USER` y `RECEPCION_01`.
- [ ] **A8.15** — Auditoría unificada: `CREATE AUDIT POLICY` sobre tablas sensibles, logons fallidos y acciones privilegiadas; `AUDIT POLICY ...`.
- [ ] **A5.33** — Solo el DBA nominal con `AUDIT_ADMIN`; `AUDITOR_APP` con `AUDIT_VIEWER`; retención con `DBMS_AUDIT_MGMT`.
- [ ] **A8.12** — Revocar `UTL_FILE`/`UTL_HTTP`/`UTL_TCP` de PUBLIC (documentar el impacto); restringir directorios y privilegios de Data Pump; auditar exportaciones.
- [ ] **A8.10** — `PURGE` del recyclebin; procedimiento de borrado seguro documentado (`DROP ... PURGE`, `INCLUDING CONTENTS AND DATAFILES`, `DELETE OBSOLETE` en RMAN).
- [ ] **A8.24 (TDE)** — `WALLET_ROOT` + `TDE_CONFIGURATION` (requiere reinicio) → crear y abrir keystore en `CDB$ROOT` → llave maestra → cifrar `TS_CLINICA_SENSIBLE` (AES256). **Respaldar el wallet y su contraseña.**
- [ ] **A8.13** — RMAN: `CONFIGURE ENCRYPTION FOR DATABASE ON;` + `CONFIGURE ENCRYPTION ALGORITHM 'AES256';` → backup cifrado.
- [ ] **A8.20** — `sqlnet.ora`: `SQLNET.ENCRYPTION_SERVER=REQUIRED`, `SQLNET.ENCRYPTION_TYPES_SERVER=(AES256)`, `TCP.VALIDNODE_CHECKING=YES`, `TCP.INVITED_NODES=(...)`; reiniciar listener.
- [ ] **A8.33 / A8.31** — Esquema `CLINICA_DEV` con copia enmascarada (script con `DBMS_RANDOM`).
- [ ] **A8.8** — Documentar versión (`V$VERSION`, `DBA_REGISTRY_SQLPATCH`); XE no recibe parches trimestrales → declararlo como hallazgo honesto (Parcial) con plan.

**Listo cuando:** todos los scripts de `02_controles/` corren sin error y quedan versionados.

---

### FASE 5 — Verificar: batería completa y sistema (Dom 25 – Lun 26)

**5.1 Completar las 24 pruebas** (ver Anexo B) y el catálogo `pruebas.json`.

**5.2 Snapshots**
- [ ] Restaurar a línea base (o usar el snapshot guardado del miércoles) → `snapshots/antes.json`.
- [ ] Con controles aplicados → `snapshots/despues.json`.

**5.3 Sistema completo — pantallas de resultados**
- [ ] **Dashboard:** tarjetas resumen, semáforo de 15 controles, gráfico antes/después, indicador "En vivo / Modo demo".
- [ ] **Matriz:** columnas oficiales + filtros + modo comparar + exportar CSV.
- [ ] **Pruebas:** esperado vs. obtenido, SQL, usuario, salida real, botón ejecutar; distinguir ❌ de ⚠️ error de ejecución.
- [ ] **Detalle de control:** cadena completa riesgo → tarea → control → evidencia → pruebas → historial.
- [ ] **Plan de mejora (Actuar):** brechas en Parcial/No cumple con acción y prioridad.
- [ ] Pantallas de apoyo: Riesgos (mapa de calor 5×5), Tareas, Scripts, Documentación.
- [ ] Modo demo: el frontend funciona leyendo los snapshots sin Oracle.

**Listo cuando:** auditoría completa "antes" (rojo) y "después" (verde/amarillo) visibles en el sistema.

---

### FASE 6 — Actuar y documentar (Mar 27 – Mié 28)

**6.1 Informe PDF** (todo en negro, sin colores de acento)
- [ ] Portada · Índice
- [ ] Presentación y justificación · Objetivo general y específicos
- [ ] Marco teórico (2–3 páginas): ISO 27001:2022 vs. 2013 · mínimo privilegio y separación de funciones · defensa en profundidad y Zero Trust · TDE, Data Redaction (= "Dynamic Data Masking" en otros motores), VPD, TLS/cifrado nativo · DLP y backups cifrados (AES) · logging, monitoreo y SIEM · Ley 8968 y su reglamento (verificar versión vigente en el SCIJ)
- [ ] Metodología PHVA aplicada al caso
- [ ] Componentes 1 a 6 del artefacto
- [ ] Resultados antes/después con capturas
- [ ] Plan de mejora (Actuar)
- [ ] Conclusiones
- [ ] Referencias APA 7
- [ ] Tabla de uso de IA + **declaración jurada firmada**
- [ ] Link al repositorio y al video

**6.2 Video de 5 minutos** (ver Anexo D)
- [ ] Guion → grabación → revisión de audio y duración.

**6.3 Repositorio**
- [ ] README con instalación y reproducción paso a paso.
- [ ] Confirmar que **no** se subió `.env`, wallets ni contraseñas.
- [ ] Historial de commits limpio y frecuente (evidencia de trabajo individual).

---

### ENTREGA — Jue 29 oct (8:00–12:00 md)

- [ ] 1. Informe PDF con el artefacto / link
- [ ] 2. Scripts `.sql` de verificación
- [ ] 3. Repositorio Git
- [ ] 4. Video de 5 minutos
- [ ] 5. Tabla de uso de IA firmada
- [ ] Sistema probado en modo en vivo y en modo demo la noche anterior

---

## 5. Checklist contra la rúbrica

| Criterio | Peso | Cómo lo cubro | ✓ |
|---|---|---|---|
| Riesgos y tareas DBA | 20 % | ≥ 5 riesgos con escala explicada, 12 tareas vinculadas | [ ] |
| Mapeo y justificación ISO | 20 % | 15 controles + extras, justificación del mecanismo, evidencia SQL | [ ] |
| Matriz y observables | 20 % | Escala 0–4 definida, regla de estado, evidencia real antes/después | [ ] |
| Pruebas y scripts | 15 % | 24 scripts que corren sin error, pruebas negativas, resultados reales | [ ] |
| IA y APA 7 | 15 % | Prompts textuales, validación propia, fuente verificada, declaración firmada | [ ] |
| Presentación, video, repo | 10 % | Sistema, video de 5 min, repo ordenado, entrega a tiempo | [ ] |

---

## 6. Riesgos del propio proyecto y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| Perder el wallet de TDE → datos ilegibles | Respaldo de la base antes; copia del wallet y su contraseña fuera del repo |
| Cambios en `sqlnet.ora` impiden conectar | Guardar copia original; probar con SQL Developer tras cada cambio |
| Revocar `UTL_*` de PUBLIC rompe componentes | Probar y documentar; si algo falla, revertir y registrarlo como Parcial |
| Falta de tiempo | El avance prioriza análisis; el frontend se pule al final |
| El profesor no tiene Oracle | Modo demo con snapshots + video |
| Plagio por IA | Redactar con palabras propias y documentar cada prompt |
| Falla de la PC el día de entrega | Repo en Git actualizado y PDF/video subidos un día antes |

---

## Anexo A — Controles, implementación y evidencia

| Control | Implementación en Oracle | Evidencia observable |
|---|---|---|
| A5.12 Clasificación | `CLASIFICACION_DATOS`, `COMMENT ON COLUMN` | `SELECT` sobre la tabla de clasificación / `DBA_COL_COMMENTS` |
| A5.15 Control de acceso | Roles funcionales, sin grants a PUBLIC | `DBA_TAB_PRIVS`, `DBA_ROLE_PRIVS` |
| A5.16 Identidades | Cuentas nominales; inactivas y por defecto bloqueadas | `DBA_USERS` (`account_status`, `last_login`) |
| A5.17 Autenticación | Perfil con verify function y límites | `DBA_PROFILES`, `DBA_USERS_WITH_DEFPWD` |
| A5.18 Derechos de acceso | Revisión periódica registrada | `DBA_SYS_PRIVS`, `DBA_TAB_PRIVS`, `REVISION_ACCESOS` |
| A5.33 Protección de registros | `AUDIT_ADMIN` restringido, retención configurada | `DBA_ROLE_PRIVS`, `DBA_AUDIT_MGMT_CONFIG_PARAMS` |
| A8.2 Acceso privilegiado | Sin DBA/ANY indebidos; SYSBACKUP; `AUDIT_SYS_OPERATIONS` | `DBA_ROLE_PRIVS`, `DBA_SYS_PRIVS`, `V$PWFILE_USERS`, `V$PARAMETER` |
| A8.3 Restricción de acceso | VPD (`DBMS_RLS`) | `DBA_POLICIES` + prueba por usuario |
| A8.5 Autenticación segura | Solo hashes 12C, logon version mínima | `DBA_USERS.password_versions`, `sqlnet.ora` |
| A8.10 Eliminación | Purge, borrado con datafiles, `DELETE OBSOLETE` | `DBA_RECYCLEBIN`, reporte RMAN |
| A8.11 Enmascaramiento | `DBMS_REDACT` | `REDACTION_POLICIES`, `REDACTION_COLUMNS` |
| A8.12 DLP | Revocar `UTL_*` de PUBLIC, directorios y Data Pump restringidos | `DBA_TAB_PRIVS` (paquetes), `DBA_DIRECTORIES` |
| A8.13 Respaldo | RMAN cifrado AES256 | `V$BACKUP_PIECE.encrypted`, `V$RMAN_ENCRYPTION_ALGORITHMS` |
| A8.15 Registro | Políticas de auditoría unificada | `AUDIT_UNIFIED_ENABLED_POLICIES`, `UNIFIED_AUDIT_TRAIL` |
| A8.20 Redes | Cifrado nativo/TLS, validación de nodos | `V$SESSION_CONNECT_INFO`, `SYS_CONTEXT('USERENV','NETWORK_PROTOCOL')`, `sqlnet.ora` |
| *A8.24 Criptografía (extra)* | TDE en tablespace sensible | `V$ENCRYPTION_WALLET`, `V$ENCRYPTED_TABLESPACES`, `DBA_TABLESPACES.encrypted` |
| *A8.8 Vulnerabilidades (extra)* | Inventario de versión y parches | `V$VERSION`, `DBA_REGISTRY_SQLPATCH` |
| *A8.31/A8.33 Info. de prueba (extra)* | Clon DEV enmascarado | Comparación PROD vs. DEV |

## Anexo B — Batería de pruebas sugerida

| ID | Control | Tipo | Conexión | Resultado esperado (después) |
|---|---|---|---|---|
| P-01 | A5.12 | Configuración | AUDITOR_APP | Todas las columnas sensibles clasificadas |
| P-02 | A5.15 | Configuración | AUDITOR_APP | 0 grants de objetos `CLINICA` a PUBLIC |
| P-03 | A5.15 | Configuración | AUDITOR_APP | 0 grants directos a usuarios (solo vía roles) |
| P-04 | A5.16 | Configuración | AUDITOR_APP | 0 cuentas abiertas sin uso > 90 días |
| P-05 | A5.16/A5.17 | Configuración | AUDITOR_APP | 0 cuentas abiertas con contraseña por defecto |
| P-06 | A5.17 | Configuración | AUDITOR_APP | Perfil con verify function, intentos ≤ 5, vigencia ≤ 90 |
| P-07 | A5.17 | Negativa | Usuario de prueba | Tras 5 intentos fallidos: cuenta `LOCKED(TIMED)` |
| P-08 | A5.18 | Configuración | AUDITOR_APP | Revisión de accesos registrada hace < 90 días |
| P-09 | A8.2 | Configuración | AUDITOR_APP | Rol DBA solo en cuentas autorizadas |
| P-10 | A8.2 | Configuración | AUDITOR_APP | 0 privilegios `ANY` a cuentas no administrativas |
| P-11 | A8.2 | Configuración | AUDITOR_APP | `AUDIT_SYS_OPERATIONS = TRUE` |
| P-12 | A8.3 | Negativa | MEDICO_01 | Solo ve expedientes de sus pacientes |
| P-13 | A8.3 | Negativa | RECEPCION_01 | `ORA-00942`/`ORA-01031` al leer `EXPEDIENTES` |
| P-14 | A8.5 | Configuración | AUDITOR_APP | Solo hashes `12C` |
| P-15 | A8.10 | Configuración | AUDITOR_APP | Recyclebin de `CLINICA` vacío |
| P-16 | A8.11 | Negativa | DEV_USER | Cédula, salario e IBAN redactados |
| P-17 | A8.12 | Configuración | AUDITOR_APP | 0 `EXECUTE` de `UTL_FILE`/`UTL_HTTP`/`UTL_TCP` a PUBLIC |
| P-18 | A8.13 | Configuración | AUDITOR_APP | Backups recientes con `encrypted = YES` |
| P-19 | A8.15 | Auditoría | APP_CLINICA + AUDITOR_APP | El SELECT sobre tabla sensible aparece en `UNIFIED_AUDIT_TRAIL` |
| P-20 | A5.33 | Configuración | AUDITOR_APP | `AUDIT_ADMIN` solo al DBA nominal; retención configurada |
| P-21 | A8.20 | Configuración | AUDITOR_APP | Sesión con cifrado de red activo |
| P-22 | A8.24 | Configuración | AUDITOR_APP | Wallet `OPEN`; `TS_CLINICA_SENSIBLE` cifrado |
| P-23 | A8.33 | Comparación | AUDITOR_APP | 0 cédulas iguales entre PROD y DEV |
| P-24 | A8.8 | Configuración | AUDITOR_APP | Versión documentada (en XE: Parcial justificado) |

Formato en `pruebas.json`:
```json
{
  "id": "P-13",
  "control": "A8.3",
  "riesgo": "R-CONF-01",
  "tarea": "T-02",
  "tipo": "negativa",
  "conexion": "RECEPCION_01",
  "script": "sql/03_verificacion/P13_recepcion_expedientes.sql",
  "esperado": { "error": ["ORA-00942", "ORA-01031"] }
}
```

## Anexo C — Plantilla de tabla de uso de IA

| Herramienta IA | Prompt exacto utilizado | Aporte de la IA | Validación / corrección del estudiante | Fuente verificada |
|---|---|---|---|---|
| Claude | *(copiar textual del historial)* | Explicación de la asignación, estructura del artefacto | *(qué verifiqué, qué cambié o descarté)* | ISO/IEC 27002:2022; Oracle Database Security Guide 21c |
| Claude | *(copiar textual)* | Arquitectura del sistema y flujo | *(...)* | Documentación FastAPI / python-oracledb |
| Claude | *(copiar textual)* | Este plan de acción | *(...)* | Asignación oficial del curso |

> **Declaración jurada:** Yo, [Nombre], declaro que todo contenido generado con IA ha sido declarado en la tabla anterior, validado contra fuentes oficiales y que asumo responsabilidad por su veracidad. Entiendo que omitir esta declaración constituye falta grave.
> Firma: ____________ Fecha: ________

## Anexo D — Guion del video (5 min)

| Tiempo | Contenido |
|---|---|
| 0:00–0:30 | Problema: confidencialidad en Oracle, caso Clínica Los Robles, Ley 8968 |
| 0:30–1:15 | Riesgos R-CONF y tareas del DBA (pantalla de riesgos, mapa de calor) |
| 1:15–2:00 | Controles ISO y mapeo (pantalla de controles) |
| 2:00–2:45 | Auditoría "antes": ejecutar → semáforo en rojo |
| 2:45–3:45 | Aplicar 2–3 controles en vivo (ej. redaction, revocar DBA, TDE) |
| 3:45–4:30 | Auditoría "después": verde; matriz comparativa; prueba negativa en vivo |
| 4:30–5:00 | Plan de mejora (Actuar), conclusiones y uso documentado de IA |

## Anexo E — Fuentes oficiales a consultar y citar (APA 7)

- ISO/IEC 27001:2022 — *Information security management systems — Requirements*.
- ISO/IEC 27002:2022 — *Information security controls*.
- Oracle. *Oracle Database Security Guide 21c*.
- Oracle. *Oracle Database Advanced Security Guide 21c* (TDE y Data Redaction).
- Oracle. *Oracle Database Express Edition Licensing Information 21c*.
- Oracle. *Backup and Recovery User's Guide 21c* (cifrado RMAN).
- Asamblea Legislativa de Costa Rica. *Ley 8968, Protección de la persona frente al tratamiento de sus datos personales* (SCIJ) y su reglamento vigente.
- Documentación oficial de FastAPI, python-oracledb, React y Vite (para la sección técnica del sistema).
