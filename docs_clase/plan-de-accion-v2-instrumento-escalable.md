# Plan de acción v2 — Instrumento escalable de auditoría de Confidencialidad (ISO 27001:2022) para Oracle

**Curso:** Administración de Bases de Datos (EIF402) — Prof. Johnny Villalobos Murillo — II Ciclo 2026
**Modalidad:** Individual (se verifica individualidad y originalidad)
**Motor:** Oracle 19c/21c (laboratorio en 21c XE) · **Metodología:** PHVA · **Herramienta:** SQL Developer
**Artefacto:** Sistema web — React + Vite (frontend) · FastAPI + python-oracledb (backend)

> **Cambio respecto a la v1 (retroalimentación del profesor):**
> 1. La matriz es un **instrumento genérico y escalable**: se conecta a **cualquier** base Oracle y la analiza sin conocerla de antemano.
> 2. Cada control sigue la secuencia **observable → hallazgo → correctivo → re-observación**. No hay corrección sin observación previa.
> 3. Con fines didácticos se usa **una empresa ficticia** (Clínica Los Robles) como base de demostración en clase. La herramienta no tiene nada "quemado" de esa empresa.

---

## 0. Fechas y reglas

| Fecha | Hito | Nota |
|---|---|---|
| Mar 20 oct | Rediseño (este plan) | |
| **Jue 22 oct** | **Avance obligatorio** | No presentarlo = **pérdida del proyecto** |
| **Jue 29 oct, 8:00–12:00 md** | **Entrega formal** | Informe, scripts, repo, video, tabla IA |

**Reglas de oro**
- [ ] Todo uso de IA se documenta (prompt exacto + qué corregí + fuente). Incluir esta conversación y la retroalimentación del profesor que motivó la v2.
- [ ] Redacción propia en el informe.
- [ ] **Nada específico de la empresa ficticia dentro del código ni del catálogo.** Si una consulta menciona `CLINICA`, está mal diseñada.
- [ ] El instrumento **observa y genera** correcciones; **no las ejecuta solo**. Las aplica el DBA de la empresa (separación de funciones, gestión de cambios).

---

## 1. Concepto del instrumento

```
            ┌──────────────── INSTRUMENTO (genérico) ────────────────┐
            │  Catálogo de controles (JSON)  +  Motor de evaluación  │
            └───────────────────────────┬────────────────────────────┘
                                        │ se "pega" a cualquier base
          ┌─────────────────────────────┼─────────────────────────────┐
     Empresa ficticia             Empresa X (cualquiera)          Empresa Y …
   (Clínica Los Robles)            Oracle 19c/21c
   ← demo en clase
```

### 1.1 Ciclo de auditoría por empresa (PHVA)

| Paso | Qué hace el instrumento | Tipo de control ISO | PHVA |
|---|---|---|---|
| 1. Registrar empresa | Nombre, sector, conexión, perfil de política | — | Planificar |
| 2. Pre-vuelo | Verifica versión, CDB/PDB y privilegios del usuario auditor | — | Planificar |
| 3. Descubrimiento | Encuentra esquemas de negocio, usuarios y columnas sensibles | — | Planificar |
| 4. **Observar** | Ejecuta los controles observables del catálogo | **Detectivo** | Verificar |
| 5. Evaluar | Calcula madurez 0–4 y estado por control | — | Verificar |
| 6. **Corregir** | Genera el script correctivo para cada hallazgo; el DBA lo revisa y aplica | **Correctivo** | Hacer / Actuar |
| 7. **Re-observar** | Ejecuta de nuevo los mismos observables | Detectivo | Verificar |
| 8. Prevenir y reportar | Recomienda controles preventivos; guarda historial y reporte | **Preventivo** | Actuar |

### 1.2 Qué hace que sea escalable

- [ ] **Catálogo externo** (`catalogo_controles.json`): agregar un control = agregar una entrada, sin tocar el código.
- [ ] **Consultas parametrizadas** con *bind variables* (`:esquemas_negocio`, `:dias_inactividad`, `:cuentas_dba_autorizadas`), nunca nombres fijos.
- [ ] **Descubrimiento automático** de esquemas de negocio (`ORACLE_MAINTAINED = 'N'`) y de columnas sensibles por **metadatos** (nombre y tipo de columna). **No lee datos reales**: auditar confidencialidad leyendo datos sensibles sería contradictorio.
- [ ] **Perfil de política por empresa:** umbrales por defecto basados en ISO (ej. 5 intentos fallidos, 90 días de vigencia) que se pueden ajustar por empresa.
- [ ] **Registro de N empresas:** cada una es una conexión más. La herramienta guarda empresas, ejecuciones y hallazgos en su propia base local (SQLite).
- [ ] **Compatibilidad por versión:** cada control indica la versión mínima; el motor detecta la versión y elige la variante de la consulta.
- [ ] **Cuarto estado, "No evaluable":** si el usuario auditor no ve algo (ej. un parámetro de la instancia desde una PDB), el control **no** se marca como No cumple; se reporta que no se pudo observar.
- [ ] **Script de incorporación** (`onboarding_auditor.sql`): cualquier empresa lo ejecuta para crear el usuario auditor de mínimo privilegio. Esto es lo que permite "pegar" el instrumento a cualquier base.

---

## 2. Decisiones técnicas

| Tema | Decisión |
|---|---|
| Frontend | React + Vite + Tailwind CSS + shadcn/ui + Recharts |
| Backend | Python + FastAPI + python-oracledb (modo *thin*) |
| Almacén propio | SQLite: empresas, ejecuciones, hallazgos y reportes |
| Catálogo | `catalogo_controles.json` (versionado en Git) |
| Credenciales | No se guardan en texto plano: se piden al ejecutar, o se cifran en reposo (`cryptography`/Fernet) con la llave en `.env`. **Nunca en el repo.** |
| Usuario auditor | `AUDITOR_ISO`: `CREATE SESSION`, `SELECT_CATALOG_ROLE`, `AUDIT_VIEWER` (solo lectura) |
| Correctivos | Generados como `.sql` para revisión y aplicación por el DBA; nunca ejecución automática |
| Laboratorio | Oracle 21c XE con la PDB `PDB_CLINICA` (empresa ficticia) |
| Controles núcleo | A5.12, A5.15, A5.16, A5.17, A5.18, A5.33, A8.2, A8.3, A8.5, A8.10, A8.11, A8.12, A8.13, A8.15, A8.20 |
| Extras justificados | A8.24 (criptografía/TDE), A8.8 (vulnerabilidades), A8.31/A8.33 (ambientes e información de prueba) |

> Coherencia: el propio instrumento aplica los controles que audita (mínimo privilegio del auditor = A8.2/A5.15; credenciales protegidas = A5.17/A8.24). Documentarlo en el informe.

---

## 3. La matriz: instrumento + evaluación

### 3.1 Matriz-instrumento (genérica, una sola vez)

Cada fila es un **control evaluable** del catálogo:

`ID | Control ISO | Riesgo R-CONF | Tarea DBA | Control observable (consulta) | Regla de evaluación | Criterio 0–4 | Control correctivo (plantilla) | Control preventivo | Alcance (PDB / instancia) | Versión mínima`

Ejemplo:

| Campo | Valor |
|---|---|
| ID | OBS-09 |
| Control ISO | A8.2 Derechos de acceso privilegiado |
| Riesgo / Tarea | R-CONF-01 / T-02 |
| Observable | `SELECT grantee FROM dba_role_privs WHERE granted_role = 'DBA' AND grantee NOT IN (:cuentas_dba_autorizadas)` |
| Regla | 0 filas = Cumple; ≥ 1 fila = hallazgo por cada `grantee` |
| Correctivo (plantilla) | `REVOKE DBA FROM {grantee};` + crear rol funcional con los privilegios realmente necesarios |
| Preventivo | Revisión trimestral de privilegios (A5.18) + política de auditoría sobre `GRANT` |
| Alcance | PDB |

Formato en `catalogo_controles.json`:
```json
{
  "id": "OBS-09",
  "control_iso": "A8.2",
  "riesgo": "R-CONF-01",
  "tarea": "T-02",
  "alcance": "PDB",
  "version_min": "19",
  "observable": {
    "sql": "SELECT grantee FROM dba_role_privs WHERE granted_role = 'DBA' AND grantee NOT IN (SELECT column_value FROM TABLE(:cuentas_dba_autorizadas))",
    "regla": { "tipo": "sin_filas" }
  },
  "correctivo": {
    "plantilla": "REVOKE DBA FROM {grantee};",
    "nota": "Antes de revocar, identificar los privilegios realmente requeridos y otorgarlos mediante un rol funcional."
  },
  "preventivo": "Revisión periódica de derechos (A5.18) y auditoría unificada sobre GRANT/REVOKE (A8.15)",
  "severidad": "alta"
}
```

### 3.2 Matriz de evaluación (una por empresa y ejecución)

Cumple las columnas oficiales y agrega la secuencia observable → correctivo:

`Empresa | Fecha | Tarea | Riesgo | Control | Hallazgo (evidencia) | Criterio 0–4 antes | Estado antes | Correctivo aplicado | Criterio 0–4 después | Estado después`

### 3.3 Escala de madurez y estados

| Nivel | Nombre | Criterio |
|---|---|---|
| 0 | Inexistente | No hay control |
| 1 | Inicial | Informal o inconsistente |
| 2 | Repetible | Implementado parcialmente / sin documentar |
| 3 | Definido | Implementado, documentado y consistente |
| 4 | Gestionado | Además monitoreado, auditado y revisado periódicamente |

- **Estado:** 0–1 **No cumple** · 2 **Parcial** · 3–4 **Cumple** · **No evaluable** (no se pudo observar).
- **Cálculo** (idéntico en informe y en `scoring.py`): 0 % de observables OK → 0 · < 50 % → 1 · ≥ 50 % → 2 · 100 % → 3 · 100 % + auditoría activa sobre el control + revisión registrada → 4.

---

## 4. Empresa ficticia para la demostración en clase

> **Clínica Los Robles S.A.** (ficticia). Maneja datos personales y **datos sensibles de salud** → aplica la **Ley 8968**. Vive en su propia PDB: `PDB_CLINICA`.

### 4.1 Esquemas y datos

| Tabla | Columnas sensibles | Clasificación |
|---|---|---|
| `PACIENTES` | cédula, fecha de nacimiento, teléfono, correo, dirección | Confidencial — dato personal |
| `EXPEDIENTES` | diagnóstico, tratamiento | **Restringido — dato sensible (salud)** |
| `EMPLEADOS` | cédula, salario, IBAN (ficticio) | Confidencial — personal/financiero |
| `CITAS` | paciente, médico, fecha | Interno |

- [ ] Datos 100 % inventados (script generador): mín. 200 pacientes, 50 empleados.
- [ ] Tablas sensibles en el tablespace `TS_SENSIBLE` (luego se cifra con TDE).
- [ ] Nombres de columna "realistas" (`CEDULA`, `SALARIO`, `DIAGNOSTICO`, `IBAN`, `CORREO`) para que el **descubrimiento automático** las encuentre sin que se le diga.

### 4.2 Usuarios

| Usuario | Propósito |
|---|---|
| `CLINICA` | Dueño del esquema |
| `APP_CLINICA` | Aplicación |
| `MEDICO_01`, `MEDICO_02` | Médicos |
| `RECEPCION_01` | Recepción |
| `RRHH_01` | Recursos humanos |
| `DEV_USER` | Desarrollador |
| `EXEMPLEADO_01` | Cuenta inactiva (hallazgo intencional) |
| `DBA_JSANCHEZ` | DBA nominal |
| `AUDITOR_ISO` | Usuario del instrumento (creado con `onboarding_auditor.sql`) |

### 4.3 Línea base insegura (`clinica_01_linea_base_insegura.sql`)

Errores intencionales para que el instrumento los **observe**:

- [ ] `GRANT DBA TO APP_CLINICA;`
- [ ] `GRANT SELECT ANY TABLE TO DEV_USER;`
- [ ] `GRANT SELECT ON CLINICA.PACIENTES TO PUBLIC;`
- [ ] Grants directos a usuarios (sin roles)
- [ ] Usuarios con perfil `DEFAULT` sin límites; contraseñas débiles
- [ ] `EXEMPLEADO_01` abierta y sin uso
- [ ] Sin VPD, sin Data Redaction, sin políticas de auditoría
- [ ] `TS_SENSIBLE` sin cifrar
- [ ] Tabla borrada sin `PURGE` (queda en el recyclebin)
- [ ] `EXECUTE` sobre `UTL_FILE`/`UTL_HTTP` a PUBLIC (verificar estado por defecto y documentar)
- [ ] Backup RMAN sin cifrar
- [ ] `sqlnet.ora` sin cifrado de red

### 4.4 Correctivos de la empresa (`clinica_02_correctivos/`)

- [ ] Se generan **desde el instrumento** a partir de los hallazgos y se guardan en el repo.
- [ ] Se revisan, se completan a mano donde haga falta (TDE, VPD, redaction, RMAN, `sqlnet.ora`) y se aplican.
- [ ] Se re-observa con el instrumento → snapshot "después".

### 4.5 (Opcional) Prueba de escalabilidad

Si sobra tiempo: una segunda base mínima (ej. `PDB_TIENDA`, con 2–3 tablas y otros errores) **sin modificar el instrumento**, solo registrándola. Es la demostración más contundente de que "se pega a cualquier base". Si no hay tiempo, basta con explicarlo y mostrar que el catálogo no menciona a la clínica.

---

## 5. Estructura del repositorio

```
iso27001-confidencialidad-oracle/
├── README.md                          ← instalar, registrar una empresa, auditar
├── .gitignore                         ← .env, *.db, wallets, node_modules
├── docs/
│   ├── informe.md / informe.pdf
│   ├── marco-teorico.md
│   ├── tabla-uso-ia.md
│   ├── referencias-apa7.md
│   └── evidencias/
├── instrumento/                       ← GENÉRICO (sirve para cualquier empresa)
│   ├── onboarding_auditor.sql         ← crea AUDITOR_ISO con mínimo privilegio
│   ├── catalogo_controles.json        ← la matriz-instrumento
│   ├── perfil_politica_default.json   ← umbrales ISO por defecto
│   └── sql/observables/               ← un .sql por control observable (OBS-01 …)
├── laboratorio/                       ← SOLO para la demo en clase
│   └── clinica/
│       ├── clinica_00_crear_pdb.sql
│       ├── clinica_00_esquema_y_datos.sql
│       ├── clinica_01_linea_base_insegura.sql
│       ├── clinica_02_correctivos/    ← generados + completados
│       └── sqlnet_cambios.md
├── backend/
│   ├── app/
│   │   ├── main.py                    ← FastAPI + CORS
│   │   ├── empresas.py                ← registro de empresas (SQLite)
│   │   ├── conexiones.py              ← conexión por empresa, credenciales cifradas
│   │   ├── prevuelo.py                ← versión, CDB/PDB, privilegios del auditor
│   │   ├── descubrimiento.py          ← esquemas y columnas sensibles por metadatos
│   │   ├── motor.py                   ← ejecuta observables con bind variables
│   │   ├── evaluacion.py              ← madurez 0–4 y estados
│   │   ├── correctivos.py             ← rellena plantillas y genera .sql
│   │   └── reportes.py                ← historial, comparativos, exportar
│   ├── data/auditoria.db              ← (ignorado en Git)
│   ├── requirements.txt
│   └── .env.example
└── frontend/                          ← React + Vite
```

---

## 6. Pantallas del sistema

| Pantalla | Contenido |
|---|---|
| **Empresas** | Listado, registrar nueva (nombre, sector, conexión, perfil de política), probar conexión |
| **Pre-vuelo** | Versión, tipo CDB/PDB, privilegios del auditor; controles que serán "No evaluable" y por qué |
| **Descubrimiento** | Esquemas de negocio y columnas sensibles detectadas; el auditor confirma o descarta (alimenta A5.12) |
| **Dashboard por empresa** | Madurez promedio, semáforo de 15 controles, gráfico antes/después, fecha de la ejecución |
| **Matriz de evaluación** | Columnas oficiales + antes/después + filtros + exportar CSV/PDF |
| **Hallazgo** | Observable → evidencia → correctivo generado (copiar/descargar) → re-observación |
| **Correctivos** | Script consolidado por empresa, ordenado por severidad, para que el DBA lo aplique |
| **Plan de mejora** | Controles preventivos y pendientes (Parcial / No cumple / No evaluable) |
| **Catálogo** | La matriz-instrumento: todos los controles con su observable, regla, correctivo y preventivo |
| **Documentación** | Marco teórico, APA 7, tabla de uso de IA |

### Endpoints principales

| Método | Ruta | Para qué |
|---|---|---|
| GET/POST | `/api/empresas` | Listar / registrar |
| POST | `/api/empresas/{id}/probar` | Probar conexión |
| POST | `/api/empresas/{id}/prevuelo` | Verificación previa |
| POST | `/api/empresas/{id}/descubrir` | Descubrimiento de datos sensibles |
| POST | `/api/empresas/{id}/auditar` | Ejecutar todos los observables |
| GET | `/api/empresas/{id}/ejecuciones` | Historial (antes/después) |
| GET | `/api/ejecuciones/{id}/correctivos` | Script correctivo generado |
| GET | `/api/catalogo` | Matriz-instrumento |

---

## 7. Plan día por día

### FASE 1 — Rediseño y núcleo del instrumento (Mar 20 – Mié 21)

**Martes 20 (hoy)**
- [ ] Actualizar la tabla de uso de IA con este cambio de enfoque (y la retroalimentación del profesor).
- [ ] Redactar **riesgos** R-CONF-01 a R-CONF-06 (escala P × I) y **12 tareas del DBA** (T-01 a T-12).
- [ ] Escribir `onboarding_auditor.sql`.
- [ ] Crear `PDB_CLINICA`, esquema, datos ficticios y línea base insegura.

**Miércoles 21**
- [ ] `catalogo_controles.json` con los **15 controles** (observable, regla, correctivo, preventivo, alcance). Al menos **6 con SQL funcionando**: OBS-02 grants a PUBLIC, OBS-04 cuentas inactivas, OBS-06 perfiles, OBS-09 rol DBA, OBS-10 privilegios ANY, OBS-22 wallet TDE.
- [ ] Backend mínimo: registrar empresa, pre-vuelo, `auditar` con esos 6 observables, generar correctivos.
- [ ] Frontend mínimo: pantalla Empresas + Dashboard (semáforo) + Matriz.
- [ ] Ejecutar contra `PDB_CLINICA` → hallazgos "antes" → capturas.

### ★ AVANCE — Jue 22 oct

**Mostrar:**
- [ ] El concepto: instrumento genérico + empresa ficticia de demostración
- [ ] Riesgos R-CONF y 12 tareas del DBA
- [ ] Matriz-instrumento (catálogo con observable → correctivo → preventivo)
- [ ] Escala 0–4 y estados (incluido "No evaluable")
- [ ] Demo: registrar la clínica → auditar → hallazgos → correctivo generado
- [ ] Repo con commits · tabla IA iniciada
- [ ] Anotar la retroalimentación y ajustar

### FASE 2 — Completar el instrumento (Vie 23 – Sáb 24)

- [ ] Completar los observables restantes (ver Anexo B) con bind variables y variantes por versión.
- [ ] `descubrimiento.py`: esquemas de negocio + columnas sensibles por patrones de nombre (`CEDULA`, `SALARIO`, `IBAN`, `TARJETA`, `DIAGNOSTICO`, `CORREO`, `TELEFONO`, `DIRECCION`, `NACIMIENTO`) y tipo de dato.
- [ ] Observables que **usan el descubrimiento**: columnas sensibles sin redaction (A8.11), tablespaces con columnas sensibles sin cifrar (A8.24), tablas sensibles sin política de auditoría (A8.15), sin VPD (A8.3), sin clasificar (A5.12).
- [ ] Estado "No evaluable" cuando falta visibilidad o privilegio.
- [ ] Credenciales cifradas en reposo.

### FASE 3 — Correctivos en la empresa ficticia (Dom 25)

> Respaldo de la base **antes** de TDE y de cambios en `sqlnet.ora`.

- [ ] Generar el script correctivo desde el instrumento.
- [ ] Revisarlo y completar a mano: roles funcionales, perfiles (`IDLE_TIME`, intentos, vigencia), VPD (`DBMS_RLS`), redaction (`DBMS_REDACT`), auditoría unificada, `AUDIT_ADMIN` restringido, revocar `UTL_*` de PUBLIC, `PURGE`, TDE (`WALLET_ROOT`, keystore, AES256 — **respaldar el wallet**), RMAN cifrado AES256, `sqlnet.ora` (cifrado y validación de nodos), clon DEV enmascarado.
- [ ] Aplicar → **re-observar** → snapshot "después".

### FASE 4 — Sistema completo (Lun 26)

- [ ] Todas las pantallas de la sección 6.
- [ ] Gráfico antes/después y exportación de la matriz.
- [ ] (Opcional) `PDB_TIENDA` para la prueba de escalabilidad.

### FASE 5 — Documentar (Mar 27 – Mié 28)

**Informe PDF** (todo en negro)
- [ ] Portada · Índice · Presentación y justificación · Objetivos
- [ ] Marco teórico (2–3 págs.): ISO 27001:2022 vs. 2013 (93 controles, 4 temas, **atributos: preventivo/detectivo/correctivo**) · mínimo privilegio y separación de funciones · defensa en profundidad y Zero Trust · TDE, Data Redaction, VPD, TLS/cifrado nativo · DLP y backups cifrados (AES) · logging, monitoreo y SIEM · Ley 8968 y reglamento vigente (SCIJ)
- [ ] Diseño del instrumento: ciclo, catálogo, escalabilidad, limitaciones (controles de instancia, "No evaluable")
- [ ] Componentes 1–6 del artefacto
- [ ] Aplicación a la empresa ficticia: hallazgos, correctivos, re-observación (capturas antes/después)
- [ ] Plan de mejora · Conclusiones · Referencias APA 7
- [ ] Tabla de uso de IA + **declaración jurada firmada**
- [ ] Links al repo y al video

**Video 5 min** (Anexo D) · **README** (cómo auditar una empresa nueva en 4 pasos) · revisar que no haya secretos en el repo.

### ENTREGA — Jue 29 oct (8:00–12:00 md)

- [ ] 1. Informe PDF · [ ] 2. Scripts `.sql` · [ ] 3. Repo Git · [ ] 4. Video · [ ] 5. Tabla IA firmada
- [ ] Probar el sistema completo la noche anterior

---

## 8. Checklist contra la rúbrica

| Criterio | Peso | Cómo lo cubro | ✓ |
|---|---|---|---|
| Riesgos y tareas DBA | 20 % | ≥ 5 riesgos con escala, 12 tareas vinculadas | [ ] |
| Mapeo y justificación ISO | 20 % | 15 controles + extras, justificación del mecanismo, tipo de control | [ ] |
| Matriz y observables | 20 % | Matriz-instrumento + evaluación antes/después, escala 0–4, 4 estados | [ ] |
| Pruebas y scripts | 15 % | Observables y correctivos que corren sin error en la clínica | [ ] |
| IA y APA 7 | 15 % | Prompts textuales, validación propia, declaración firmada | [ ] |
| Presentación, video, repo | 10 % | Sistema, video de 5 min, repo ordenado, a tiempo | [ ] |

---

## 9. Riesgos del proyecto

| Riesgo | Mitigación |
|---|---|
| Perder el wallet de TDE | Respaldo previo de la base y copia del wallet fuera del repo |
| `sqlnet.ora` rompe la conexión | Copia original; probar tras cada cambio |
| Sobre-ingeniería del "escalable" | Escalable = catálogo + bind variables + descubrimiento. Nada más hasta tener lo básico |
| Poco tiempo antes del avance | 6 observables reales bastan para el jueves |
| Consultas que fallan en otra versión u otro contexto | Pre-vuelo + estado "No evaluable" |
| El profesor no tiene Oracle | Historial guardado (modo demo) + video |
| Secretos en el repo | `.gitignore` y revisión antes de cada push |

---

## Anexo A — Script de incorporación del auditor (`onboarding_auditor.sql`)

Lo ejecuta el DBA de **cualquier** empresa, conectado a la PDB que se va a auditar:

```sql
CREATE USER auditor_iso IDENTIFIED BY "<contraseña_robusta>"
  PROFILE default ACCOUNT UNLOCK;
GRANT CREATE SESSION      TO auditor_iso;
GRANT SELECT_CATALOG_ROLE TO auditor_iso;
GRANT AUDIT_VIEWER        TO auditor_iso;
-- Sin privilegios sobre datos de negocio: el auditor observa configuración y metadatos, no datos.
```

El pre-vuelo reporta los privilegios efectivos del auditor y qué controles quedarían "No evaluable" con ellos.

## Anexo B — Controles observables del catálogo

| ID | Control | Qué observa (genérico) | Alcance |
|---|---|---|---|
| OBS-01 | A5.12 | Columnas sensibles descubiertas sin clasificación registrada | PDB |
| OBS-02 | A5.15 | Objetos de esquemas de negocio con grants a PUBLIC | PDB |
| OBS-03 | A5.15 | Grants directos a usuarios (no vía roles) | PDB |
| OBS-04 | A5.16 | Cuentas abiertas sin uso en más de `:dias_inactividad` | PDB |
| OBS-05 | A5.16/A5.17 | Cuentas abiertas con contraseña por defecto | PDB |
| OBS-06 | A5.17 | Perfiles sin verify function o con límites débiles | PDB |
| OBS-07 | A5.18 | Usuarios con privilegios de sistema no justificados por su rol | PDB |
| OBS-08 | A5.33 | `AUDIT_ADMIN` fuera de las cuentas autorizadas; retención no configurada | PDB |
| OBS-09 | A8.2 | Rol DBA fuera de `:cuentas_dba_autorizadas` | PDB |
| OBS-10 | A8.2 | Privilegios `ANY` a cuentas no administrativas | PDB |
| OBS-11 | A8.2 | `AUDIT_SYS_OPERATIONS` desactivado; usuarios en el password file | Instancia |
| OBS-12 | A8.3 | Tablas con datos sensibles sin política VPD | PDB |
| OBS-13 | A8.5 | Cuentas con hashes de contraseña antiguos (no `12C`) | PDB |
| OBS-14 | A8.10 | Objetos de esquemas de negocio en el recyclebin | PDB |
| OBS-15 | A8.11 | Columnas sensibles sin política de redaction | PDB |
| OBS-16 | A8.12 | `EXECUTE` de `UTL_FILE`/`UTL_HTTP`/`UTL_TCP` a PUBLIC; directorios con permisos amplios; privilegios de Data Pump | PDB |
| OBS-17 | A8.13 | Backups recientes sin cifrar | Instancia |
| OBS-18 | A8.15 | Tablas sensibles sin política de auditoría unificada | PDB |
| OBS-19 | A8.15 | Logons fallidos y acciones privilegiadas sin auditar | PDB |
| OBS-20 | A8.20 | Sesiones sin cifrado de red | Instancia |
| OBS-21 | A8.24 | Wallet TDE no abierto | Instancia/PDB |
| OBS-22 | A8.24 | Tablespaces con columnas sensibles sin cifrar | PDB |
| OBS-23 | A8.33 | Esquemas de desarrollo/prueba con columnas sensibles sin enmascarar (por convención de nombre `_DEV`, `_TEST`) | PDB |
| OBS-24 | A8.8 | Versión y parches aplicados (en XE: Parcial justificado) | Instancia |

Las **pruebas negativas** (ej. "RECEPCION_01 no puede leer EXPEDIENTES") dependen de usuarios de cada empresa. Se configuran como **pruebas de laboratorio opcionales por empresa**, fuera del catálogo genérico, y se usan en la demo de la clínica.

## Anexo C — Plantilla de tabla de uso de IA

| Herramienta IA | Prompt exacto | Aporte de la IA | Validación / corrección propia | Fuente verificada |
|---|---|---|---|---|
| Claude | *(textual)* | Explicación de la asignación | *(…)* | Asignación oficial; ISO/IEC 27002:2022 |
| Claude | *(textual)* | Arquitectura y flujo del sistema | *(…)* | Docs FastAPI / python-oracledb |
| Claude | *(textual)* | Plan de acción v1 | *(…)* | Asignación oficial |
| Claude | *(textual)* | Plan v2: instrumento escalable (tras retroalimentación del profesor) | *(qué cambié según el profesor)* | Retroalimentación del profesor; docs Oracle |

> **Declaración jurada:** Yo, [Nombre], declaro que todo contenido generado con IA ha sido declarado en la tabla anterior, validado contra fuentes oficiales y que asumo responsabilidad por su veracidad. Entiendo que omitir esta declaración constituye falta grave.
> Firma: ____________ Fecha: ________

## Anexo D — Guion del video (5 min)

| Tiempo | Contenido |
|---|---|
| 0:00–0:30 | Problema, Ley 8968 y el concepto: instrumento genérico + empresa ficticia |
| 0:30–1:15 | Riesgos, tareas y la matriz-instrumento (catálogo) |
| 1:15–1:45 | Registrar la clínica, pre-vuelo y descubrimiento automático de columnas sensibles |
| 1:45–2:30 | **Observar**: auditoría "antes", semáforo en rojo, hallazgos con evidencia |
| 2:30–3:30 | **Corregir**: correctivo generado, aplicación de 2–3 correcciones |
| 3:30–4:20 | **Re-observar**: auditoría "después", matriz comparativa |
| 4:20–5:00 | Escalabilidad (otra base o el catálogo genérico), plan de mejora, uso de IA |

## Anexo E — Fuentes a consultar y citar (APA 7)

- ISO/IEC 27001:2022 y ISO/IEC 27002:2022.
- Oracle: *Database Security Guide 21c*, *Advanced Security Guide 21c* (TDE, Redaction), *Backup and Recovery User's Guide 21c*, *Database XE Licensing Information 21c*.
- *Ley 8968* y su reglamento vigente (SCIJ).
- Documentación oficial de FastAPI, python-oracledb, React y Vite.
