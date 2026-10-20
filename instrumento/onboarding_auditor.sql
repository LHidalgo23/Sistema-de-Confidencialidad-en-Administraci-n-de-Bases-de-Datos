-- ============================================================================
-- onboarding_auditor.sql
-- Crea el usuario de auditoria AUDITOR_ISO con privilegio minimo.
--
-- Quien lo ejecuta : el DBA de la empresa que sera auditada.
-- Donde            : conectado a la PDB (o base no-CDB) que se va a auditar,
--                    con un usuario que pueda crear usuarios y perfiles.
-- Que concede      : CREATE SESSION, SELECT_CATALOG_ROLE y AUDIT_VIEWER.
-- Que NO concede   : ningun privilegio sobre datos de negocio. El auditor
--                    observa configuracion y metadatos, nunca los datos.
--
-- Coherencia: el propio instrumento cumple los controles que audita.
--   * A8.2 / A5.15 -> privilegio minimo (solo lectura de catalogo y auditoria).
--   * A5.17        -> perfil dedicado con limites (no usa el perfil DEFAULT).
--   * A5.17        -> la contrasena se pide por consola y no queda en el script.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

PROMPT Contexto de conexion (debe ser la PDB a auditar):
SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS contenedor FROM dual;

ACCEPT clave_auditor CHAR PROMPT 'Contrasena para AUDITOR_ISO (oculta): ' HIDE

-- Perfil dedicado: el observable OBS-06 marcaria como hallazgo un auditor
-- que usara el perfil DEFAULT sin limites.
CREATE PROFILE perfil_auditor_iso LIMIT
  FAILED_LOGIN_ATTEMPTS    5
  PASSWORD_LIFE_TIME       90
  PASSWORD_REUSE_TIME      365
  PASSWORD_REUSE_MAX       5
  PASSWORD_LOCK_TIME       1
  IDLE_TIME                30;

CREATE USER auditor_iso IDENTIFIED BY "&clave_auditor"
  PROFILE perfil_auditor_iso
  ACCOUNT UNLOCK;

GRANT CREATE SESSION      TO auditor_iso;
GRANT SELECT_CATALOG_ROLE TO auditor_iso;
GRANT AUDIT_VIEWER        TO auditor_iso;

-- Verificacion: el auditor debe tener exactamente estos tres privilegios.
PROMPT Privilegios efectivos de AUDITOR_ISO:
SELECT 'ROL' AS tipo, granted_role AS privilegio FROM dba_role_privs WHERE grantee = 'AUDITOR_ISO'
UNION ALL
SELECT 'SISTEMA', privilege FROM dba_sys_privs WHERE grantee = 'AUDITOR_ISO'
ORDER BY 1, 2;

UNDEFINE clave_auditor
