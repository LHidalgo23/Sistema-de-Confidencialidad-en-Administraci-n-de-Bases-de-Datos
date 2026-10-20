# Laboratorio: Clínica Los Robles S.A. (empresa ficticia)

**Solo para la demostración en clase.** El instrumento (`../../instrumento/`) no contiene nada de esta empresa: aquí vive todo lo específico del caso de evidencia.

Clínica Los Robles S.A. maneja datos personales y **datos sensibles de salud**, por lo que aplica la Ley 8968. Vive en su propia PDB, `PDB_CLINICA`, con los datos 100 % inventados por script.

## Orden de ejecución

| Paso | Archivo | Quién / dónde |
|---|---|---|
| 1 | `clinica_00_crear_pdb.sql` | SYSDBA en `CDB$ROOT` |
| 2 | `clinica_00_esquema_y_datos.sql` | SYSDBA, crea tablespaces, esquema `CLINICA`, usuarios y datos |
| 3 | `../../instrumento/onboarding_auditor.sql` | DBA en `PDB_CLINICA`, crea `AUDITOR_ISO` |
| 4 | `clinica_01_linea_base_insegura.sql` | SYSDBA, introduce los errores intencionales |
| 5 | Registrar la empresa en el sistema con `perfil_clinica.json` | Pantalla **Empresas**, DSN `localhost:1521/pdb_clinica`, usuario `AUDITOR_ISO` |
| 6 | Pre-vuelo, descubrimiento y auditoría "antes" | Sistema |
| 7 | Descargar el script correctivo generado y guardarlo en `clinica_02_correctivos/` | Sistema → repositorio |
| 8 | Revisarlo, completar a mano lo que no se puede generar (TDE, VPD, RMAN, `sqlnet.ora`) y aplicarlo | DBA |
| 9 | Auditoría "después" (re-observar) | Sistema |

Los scripts piden las contraseñas por consola (`ACCEPT ... HIDE`): no hay secretos en el repositorio.

## Qué errores contiene la línea base

| Hallazgo intencional | Observable que lo detecta |
|---|---|
| `GRANT DBA TO APP_CLINICA` | OBS-09 |
| `GRANT SELECT ANY TABLE TO DEV_USER` | OBS-10 |
| `GRANT SELECT ON CLINICA.PACIENTES TO PUBLIC` | OBS-02 |
| Grants directos a usuarios, sin roles | OBS-03 |
| Todos los usuarios con el perfil `DEFAULT` | OBS-06 |
| `EXEMPLEADO_01` abierta y sin uso | OBS-04 |
| Sin VPD, sin Data Redaction, sin auditoría unificada | OBS-12, OBS-15, OBS-18, OBS-19 |
| `TS_SENSIBLE` sin cifrar | OBS-22 |
| Tabla eliminada sin `PURGE` | OBS-14 |
| `UTL_FILE`/`UTL_HTTP`/... a `PUBLIC` (por defecto en 21c) | OBS-16 |
| Respaldo RMAN sin cifrar | OBS-17 |
| `sqlnet.ora` sin cifrado de red | OBS-20 |

## Notas para la demostración

- **`EXEMPLEADO_01` y los 90 días.** `last_login` no se puede falsear: una cuenta nueva que nunca inició sesión solo se marca tras superar el umbral. Por eso `perfil_clinica.json` baja `dias_inactividad` a 1 para el laboratorio; la cuenta aparece como hallazgo un día después de crearse. Es un ajuste de la empresa, no del catálogo.
- **OBS-24 (parches).** Oracle XE no recibe Release Updates trimestrales. El perfil registra una aceptación de riesgo documentada, de modo que A8.8 queda en **Parcial justificado**, como indica el plan.
- **Controles de instancia** (OBS-11 y OBS-17): desde una PDB pueden no ser visibles y saldrán **No evaluable**. Es el comportamiento esperado: el instrumento no inventa un incumplimiento.
- **Pruebas negativas.** `pruebas_laboratorio/` contiene verificaciones que dependen de los usuarios de la clínica (por ejemplo, que `RECEPCION_01` no pueda leer `EXPEDIENTES`). Son opcionales y están fuera del catálogo genérico.
- **Respaldo antes de TDE y de `sqlnet.ora`.** Guardar también el wallet y su contraseña fuera del repositorio.
