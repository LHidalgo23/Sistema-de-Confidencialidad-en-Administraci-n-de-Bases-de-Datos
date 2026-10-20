-- ============================================================================
-- onboarding_auditor.sql
-- Crea el usuario de auditoria AUDITOR_ISO con privilegio minimo.
--
-- Quien lo ejecuta : el DBA de la empresa que sera auditada.
-- Donde            : conectado a la PDB (o base no-CDB) que se va a auditar,
--                    con un usuario que pueda crear usuarios y perfiles.
-- Que concede      : CREATE SESSION, SELECT_CATALOG_ROLE, AUDIT_VIEWER y SELECT
--                    sobre dos vistas del diccionario que esos roles no cubren
--                    (DBA_USERS_WITH_DEFPWD y DBA_AUDIT_MGMT_CLEANUP_JOBS).
-- Que NO concede   : ningun privilegio sobre datos de negocio. El auditor
--                    observa configuracion y metadatos, nunca los datos.
--                    Tampoco AUDIT_ADMIN: es el rol que OBS-08 restringe, y
--                    quien audita no debe poder administrar la auditoria.
--
-- Coherencia: el propio instrumento cumple los controles que audita.
--   * A8.2 / A5.15 -> privilegio minimo (solo lectura de catalogo y auditoria).
--   * A5.17        -> perfil dedicado con limites y funcion de verificacion.
--   * A5.17        -> la contrasena se pide por consola y no queda en el script.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK
SET SERVEROUTPUT ON

PROMPT Contexto de conexion (debe ser la PDB a auditar):
SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS contenedor FROM dual;

ACCEPT clave_auditor CHAR PROMPT 'Contrasena para AUDITOR_ISO (oculta): ' HIDE

-- Perfil dedicado: el observable OBS-06 marcaria como hallazgo un auditor que
-- usara el perfil DEFAULT sin limites. La funcion de verificacion de contrasenas
-- se incluye si existe en la base (si no, se avisa: ver utlpwdmg.sql).
DECLARE
  v_existe       NUMBER;
  v_verificacion VARCHAR2(80);
BEGIN
  SELECT COUNT(*) INTO v_existe
  FROM   dba_objects
  WHERE  owner = 'SYS' AND object_name = 'ORA12C_VERIFY_FUNCTION' AND object_type = 'FUNCTION';
  IF v_existe = 1 THEN
    v_verificacion := ' PASSWORD_VERIFY_FUNCTION ORA12C_VERIFY_FUNCTION';
  ELSE
    DBMS_OUTPUT.PUT_LINE('AVISO: no existe ORA12C_VERIFY_FUNCTION; el perfil del auditor quedara sin funcion de');
    DBMS_OUTPUT.PUT_LINE('verificacion de contrasenas. Ejecute utlpwdmg.sql y asignela con ALTER PROFILE.');
  END IF;
  EXECUTE IMMEDIATE
    'CREATE PROFILE perfil_auditor_iso LIMIT'
    || ' FAILED_LOGIN_ATTEMPTS 5'
    || ' PASSWORD_LIFE_TIME 90'
    || ' PASSWORD_REUSE_TIME 365'
    || ' PASSWORD_REUSE_MAX 5'
    || ' PASSWORD_LOCK_TIME 1'
    || ' IDLE_TIME 30'
    || v_verificacion;
END;
/

CREATE USER auditor_iso IDENTIFIED BY "&clave_auditor"
  PROFILE perfil_auditor_iso
  ACCOUNT UNLOCK;

GRANT CREATE SESSION      TO auditor_iso;
GRANT SELECT_CATALOG_ROLE TO auditor_iso;
GRANT AUDIT_VIEWER        TO auditor_iso;

-- Lectura de metadatos que los roles anteriores no cubren: contrasenas por defecto
-- (A5.17) y trabajos de purga de la pista de auditoria (A5.33).
GRANT SELECT ON sys.dba_users_with_defpwd       TO auditor_iso;
GRANT SELECT ON sys.dba_audit_mgmt_cleanup_jobs TO auditor_iso;

-- Verificacion: el auditor debe tener exactamente estos privilegios.
PROMPT Privilegios efectivos de AUDITOR_ISO:
SELECT 'ROL' AS tipo, granted_role AS privilegio FROM dba_role_privs WHERE grantee = 'AUDITOR_ISO'
UNION ALL
SELECT 'SISTEMA', privilege FROM dba_sys_privs WHERE grantee = 'AUDITOR_ISO'
UNION ALL
SELECT 'OBJETO', privilege || ' ON ' || owner || '.' || table_name FROM dba_tab_privs WHERE grantee = 'AUDITOR_ISO'
ORDER BY 1, 2;

UNDEFINE clave_auditor
