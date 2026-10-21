# Laboratorio: Clínica Los Robles S.A. (empresa ficticia)

**Solo para la demostración en clase.** El instrumento (`../../instrumento/`) no contiene nada de esta empresa: aquí vive todo lo específico del caso de evidencia.

Clínica Los Robles S.A. maneja datos personales y **datos sensibles de salud**, por lo que aplica la Ley 8968. Vive en su propia PDB, `PDB_CLINICA`, con los datos 100 % inventados por script.

## Orden de ejecución

| Paso | Archivo | Quién / dónde |
|---|---|---|
| 1 | `clinica_00_crear_pdb.sql` | SYSDBA en `CDB$ROOT` |
| 2 | `clinica_00_esquema_y_datos.sql` | SYSDBA, crea tablespaces, esquema `CLINICA`, usuarios y datos |
| 3 | `../../instrumento/onboarding_auditor.sql` | DBA dentro de `PDB_CLINICA` (`ALTER SESSION SET CONTAINER = pdb_clinica;` antes), crea `AUDITOR_ISO` |
| 3b | `../../instrumento/onboarding_auditor_instancia.sql` | SYSDBA en `CDB$ROOT` (opcional): crea el usuario común `C##AUDITOR_ISO` para los controles de instancia (respaldos, sesiones, parches, `AUDIT_SYS_OPERATIONS`) |
| 4 | `clinica_01_linea_base_insegura.sql` | SYSDBA, introduce los errores intencionales |
| 5 | `clinica_00_actividad_usuarios.sql` | SYSDBA: **repetir antes de cada observación** (ver notas) |
| 6 | Registrar la empresa en el sistema con `perfil_clinica.json` | Pantalla **Empresas**, DSN `localhost:1521/pdb_clinica`, usuario `AUDITOR_ISO` |
| 7 | Pre-vuelo, descubrimiento y auditoría "antes" | Sistema |
| 8 | Descargar el script correctivo generado y guardarlo en `clinica_02_correctivos/` | Sistema → repositorio |
| 9 | Revisarlo, completar a mano lo que no se puede generar (TDE, VPD, RMAN, `sqlnet.ora`) y aplicarlo | DBA |
| 10 | Repetir el paso 5 y auditar "después" (re-observar) | Sistema |

**Práctica guiada.** `guia_practica.json` contiene 11 escenarios (provocar un hallazgo con SQL, observar, corregir, re-observar) con su resultado esperado, verificados contra esta base. El sistema los muestra en la pantalla *Práctica*.

**Usuario común `C##AUDITOR_ISO`.** Es un usuario del contenedor raíz, así que existe también en las demás PDB de la instancia (solo con `CREATE SESSION` y `SELECT_CATALOG_ROLE`). Para quitarlo: `DROP USER c##auditor_iso CASCADE;` y `DROP PROFILE c##perfil_auditor_iso;` como SYSDBA en `CDB$ROOT`.

El DBA nominal de la clínica es `USUARIO1`. En una `PDB_CLINICA` montada antes de ese cambio, `clinica_98_migrar_usuario1.sql` (SYSDBA, una sola vez) crea `USUARIO1` con los mismos privilegios y borra la cuenta anterior; después se repite la actividad de usuarios.

Para repetir la demostración desde cero: `clinica_99_reiniciar_laboratorio.sql` borra el esquema, los usuarios y los tablespaces de la clínica (no toca la PDB ni a `AUDITOR_ISO`) y se vuelve a ejecutar desde el paso 2.

Los scripts piden las contraseñas por consola (`ACCEPT ... HIDE`): no hay secretos en el repositorio. Si se ejecutan sin terminal interactiva, sustituir cada `ACCEPT` por un `DEFINE` con la contraseña. La contraseña del auditor debe cumplir `ORA12C_VERIFY_FUNCTION` (mínimo 8 caracteres, con letra, dígito y **al menos un carácter especial**), porque su perfil la aplica.

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

- **`EXEMPLEADO_01` y los 90 días.** `last_login` no se puede falsear: una cuenta nueva que nunca inició sesión solo se marca tras superar el umbral. Por eso `perfil_clinica.json` baja `dias_inactividad` a 1 para el laboratorio: `EXEMPLEADO_01` aparece como hallazgo un día después de crearse. Es un ajuste de la empresa, no del catálogo.
- **Por qué repetir la actividad de usuarios.** Con ese umbral, cualquier usuario que no haya iniciado sesión en el último día también saldría como inactivo. `clinica_00_actividad_usuarios.sql` hace que todos (incluido `PDBADMIN`) inicien sesión salvo `EXEMPLEADO_01`, así que el único hallazgo de OBS-04 es el intencional. Ejecutarlo justo antes de cada observación.
- **El auditor también aparece en algunos hallazgos, y es correcto.** OBS-13 marca a `AUDITOR_ISO` (y a todos) porque la base conserva el hash `11G` mientras `SQLNET.ALLOWED_LOGON_VERSION_SERVER` siga en su valor por defecto; OBS-20 lista la sesión del propio auditor mientras no haya cifrado de red. Se resuelven con el correctivo de red y renovando las contraseñas.
- **Controles de instancia desde una PDB.** OBS-17 (respaldos) queda **No evaluable**: el catálogo de RMAN no es visible desde la PDB, y el instrumento no inventa un incumplimiento. OBS-11 (`AUDIT_SYS_OPERATIONS` y password file) y OBS-21 (keystore de TDE) sí se observan.
- **OBS-24 (parches).** Oracle XE no recibe Release Updates trimestrales. El perfil registra una aceptación de riesgo documentada, de modo que A8.8 queda en **Parcial justificado**, como indica el plan.
- **Pruebas negativas.** `pruebas_laboratorio/` contiene verificaciones que dependen de los usuarios de la clínica (por ejemplo, que `RECEPCION_01` no pueda leer `EXPEDIENTES`). Son opcionales y están fuera del catálogo genérico.
- **Respaldo antes de TDE y de `sqlnet.ora`.** Guardar también el wallet y su contraseña fuera del repositorio.
