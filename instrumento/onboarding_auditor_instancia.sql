-- ============================================================================
-- onboarding_auditor_instancia.sql
-- OPCIONAL. Crea el usuario de auditoria de INSTANCIA C##AUDITOR_ISO, con privilegio
-- minimo, para que el instrumento observe los controles de alcance "Instancia"
-- (respaldos RMAN, parametros, password file, sesiones y parches).
--
-- Por que existe: desde una PDB esos controles no son visibles (por ejemplo, el
-- catalogo de RMAN pertenece a la instancia). Sin este usuario, el instrumento los
-- observa desde la PDB y los reporta como "No evaluable".
--
-- Quien lo ejecuta : el DBA de la empresa, conectado a CDB$ROOT (no a una PDB).
-- Que crea         : un usuario COMUN (en Oracle debe llamarse C##...) y un perfil comun.
-- Que concede      : CREATE SESSION y SELECT_CATALOG_ROLE, solo en CDB$ROOT
--                    (CONTAINER=CURRENT): no puede conectarse a ninguna PDB.
-- Que NO concede   : privilegios sobre datos, AUDIT_VIEWER ni AUDIT_ADMIN.
-- Efecto colateral : un usuario comun existe en TODAS las PDBs de la instancia (sin poder
--                    conectarse a ellas). Para retirarlo: DROP USER c##auditor_iso CASCADE;
--                    y DROP PROFILE c##perfil_auditor_iso;
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK
SET SERVEROUTPUT ON

PROMPT Contexto de conexion (debe ser CDB$ROOT):
SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS contenedor FROM dual;

ACCEPT clave_auditor_instancia CHAR PROMPT 'Contrasena para C##AUDITOR_ISO (oculta): ' HIDE

-- Perfil comun con los mismos limites que el del auditor de la PDB.
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
    DBMS_OUTPUT.PUT_LINE('AVISO: no existe ORA12C_VERIFY_FUNCTION; el perfil quedara sin funcion de verificacion.');
  END IF;
  EXECUTE IMMEDIATE
    'CREATE PROFILE c##perfil_auditor_iso LIMIT'
    || ' FAILED_LOGIN_ATTEMPTS 5'
    || ' PASSWORD_LIFE_TIME 90'
    || ' PASSWORD_REUSE_TIME 365'
    || ' PASSWORD_REUSE_MAX 5'
    || ' PASSWORD_LOCK_TIME 1'
    || ' IDLE_TIME 30'
    || v_verificacion
    || ' CONTAINER = ALL';
END;
/

CREATE USER c##auditor_iso IDENTIFIED BY "&clave_auditor_instancia"
  PROFILE c##perfil_auditor_iso
  ACCOUNT UNLOCK
  CONTAINER = ALL;

-- Solo en CDB$ROOT: el usuario no puede iniciar sesion en las PDBs.
GRANT CREATE SESSION      TO c##auditor_iso CONTAINER = CURRENT;
GRANT SELECT_CATALOG_ROLE TO c##auditor_iso CONTAINER = CURRENT;

PROMPT Privilegios efectivos de C##AUDITOR_ISO en CDB$ROOT:
SELECT 'ROL' AS tipo, granted_role AS privilegio FROM dba_role_privs WHERE grantee = 'C##AUDITOR_ISO'
UNION ALL
SELECT 'SISTEMA', privilege FROM dba_sys_privs WHERE grantee = 'C##AUDITOR_ISO'
ORDER BY 1, 2;

UNDEFINE clave_auditor_instancia
