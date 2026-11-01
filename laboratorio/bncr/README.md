# Laboratorio: BNCR (banco ficticio, empresa de demostración)

**Solo para la demostración en clase.** El instrumento (`../../instrumento/`) no contiene nada de este banco: aquí vive todo lo específico del caso de evidencia. Confirma, con una segunda empresa real (no filas sembradas a mano), que el instrumento es genérico: nada de `backend/`, `frontend/` ni del catálogo se tocó para crear BNCR.

A diferencia de la Clínica Los Robles (que arranca **insegura** para mostrar correctivos), BNCR arranca **bien configurada** (línea base "antes") y se deja derivar durante 10 ejecuciones trimestrales más para mostrar lo contrario: qué le pasa a la madurez cuando nadie corrige nada y la configuración se relaja poco a poco. Vive en su propia PDB, `PDB_BNCR`, con datos 100 % inventados por script (clientes, cuentas, tarjetas, transacciones y empleados).

## Orden de ejecución

| Paso | Archivo | Quién / dónde |
|---|---|---|
| 1 | `bncr_00_crear_pdb.sql` | SYSDBA en `CDB$ROOT` |
| 2 | `bncr_00_esquema_y_datos.sql` | SYSDBA, crea tablespaces, esquema `BNCR`, usuarios y datos |
| 3 | `../../instrumento/onboarding_auditor.sql` | SYSDBA dentro de `PDB_BNCR` (`ALTER SESSION SET CONTAINER = pdb_bncr;` antes), crea `AUDITOR_ISO` |
| 4 | `bncr_01_linea_base_segura.sql` | SYSDBA: perfiles, roles, VPD, Data Redaction, auditoría unificada, purga, revocar `UTL_*` de `PUBLIC` |
| 5 | Registrar la empresa en el sistema con `perfil_bncr.json` | Pantalla **Empresas**, DSN `localhost:1521/pdb_bncr`, usuario `AUDITOR_ISO`, sector "Banca" |
| 6 | Descubrimiento y confirmar las 10 columnas sensibles encontradas | Sistema |
| 7 | Auditar (ejecución #1) y marcar su revisión | Sistema |
| 8 | `bncr_02_deriva_configuracion.sql`, sección por sección, auditando después de cada una (ejecuciones #2 a #8) | SYSDBA + Sistema |
| 9 | Auditar tres veces más sin tocar nada (ejecuciones #9, #10, #11: la deriva se estabiliza) | Sistema |

Las contraseñas (`clave_pdbadmin_bncr`, `clave_lab_bncr`, `clave_auditor_bncr`) están en `%LOCALAPPDATA%\AuditorISO\credenciales_laboratorio.txt`, igual que las de la clínica. `clave_lab_bncr` es la contraseña de `DBA_LHIDALGO`, `APP_BNCR`, `CAJERO_01`, `GERENTE_01` y `DEV_BNCR` dentro de `PDB_BNCR`.

**Lección de esta sesión, por si se repite el laboratorio:** nunca pasar la contraseña a `sqlplus` con `"clave" | sqlplus ...` desde PowerShell — PowerShell antepone un BOM UTF-8 invisible al texto y la contraseña real termina siendo otra. Usar un archivo de texto ASCII sin BOM y `cmd /c "sqlplus ... < archivo.txt"`.

## Las 11 ejecuciones reales y su madurez

Calculada por el propio instrumento contra `PDB_BNCR`, no inventada:

| # | Etiqueta | Qué cambió | Madurez |
|---|---|---|---|
| 1 | Línea base (alta madurez), **revisada** | — | **3.56** |
| 2 | Sin revisión firmada | `GRANT SELECT ANY TABLE TO dev_bncr` (y deja de firmarse la revisión) | 2.56 |
| 3 | Grant directo fuera de rol | `GRANT SELECT ON bncr.tarjetas TO cajero_01` | 2.50 |
| 4 | Cuenta SCOTT olvidada | `CREATE USER scott IDENTIFIED BY tiger` | 2.28 |
| 5 | DBA a gerencia | `GRANT DBA TO gerente_01` | 2.22 |
| 6 | Auditoría de acciones off | `NOAUDIT POLICY pol_bncr_acciones` | 2.17 |
| 7 | Papelera sin purgar | `DROP TABLE` sin `PURGE` | 2.00 |
| 8 | Redaction de IBAN off | `DBMS_REDACT.DISABLE_POLICY` sobre `CUENTAS` | 1.83 |
| 9 | Sin cambios | — | 1.83 |
| 10 | Deriva estabilizada | — | 1.83 |
| 11 | Cierre del período | — | 1.83 |

Arranca en ~3.5 (lo que pedía la demo) y, sin que nadie corrija nada, termina estabilizada un poco por debajo de 2 ("Parcial"): cada paso es un cambio real, chico y plausible (un grant de más, una cuenta de prueba olvidada, una política de auditoría apagada "para no llenar el log"), nunca una caída fabricada.

## Qué quedó fuera de alcance, y por qué (acoplamiento con la instancia)

Varios controles dependen de estado **compartido por toda la instancia Oracle local**, no de `PDB_BNCR`, y tocarlos afectaría también a `PDB_CLINICA`, `XEPDB1` y `BKPCAT`:

- **OBS-13** (hashes de contraseña `10G`/`11G`) y **OBS-20** (sesiones sin cifrar) solo se resuelven fijando parámetros en `sqlnet.ora`, que no existe todavía y es un único archivo para toda la instancia.
- **OBS-21/OBS-22** (TDE): ya existe un keystore en `C:\ORACLE_WALLET_DEMO\tde`, pero está **cerrado** en modo `UNITED` (compartido por las 4 PDB) y su contraseña no está documentada en este laboratorio.
- **OBS-24** (parches): Oracle Database XE no distribuye Release Updates trimestrales (misma limitación que ya acepta la clínica).

Los cinco quedan como **riesgo aceptado** en `perfil_bncr.json` (`aceptaciones_riesgo`), con la justificación completa ahí mismo: el control correspondiente queda en **Parcial** (madurez 2) de forma estable en vez de "No cumple" sin explicación, y nunca se tocó nada fuera de `PDB_BNCR`.

OBS-11, OBS-20, OBS-21 y OBS-24 sí se evaluaron **desde la PDB** sin configurar la conexión de instancia opcional (`V$SESSION`, `V$ENCRYPTION_WALLET` y la versión del motor son visibles por contenedor), igual que en la clínica. Solo el catálogo de respaldos RMAN no lo es: OBS-17/control A8.13 queda **No evaluable** (no se configuró `C##AUDITOR_ISO` para BNCR, a propósito, para no acoplarla a la clínica).

## Para repetir la demostración desde cero

No hay un script `_99_reiniciar` todavía. Para empezar de nuevo: `DROP PLUGGABLE DATABASE pdb_bncr INCLUDING DATAFILES;` desde `CDB$ROOT` como SYSDBA, borrar la empresa `BNCR` del sistema (pantalla Empresas) y repetir desde el paso 1.
