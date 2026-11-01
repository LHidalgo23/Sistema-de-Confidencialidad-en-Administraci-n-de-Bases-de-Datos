-- ============================================================================
-- bncr_01_linea_base_segura.sql       (LABORATORIO: solo para la demo en clase)
-- Deja PDB_BNCR en un estado DELIBERADAMENTE BIEN CONFIGURADO: es el estado
-- "antes" de la deriva. A diferencia de la clinica (que arranca insegura para
-- mostrar correctivos), BNCR arranca cumpliendo casi todos los controles para
-- poder demostrar como se degrada la madurez con el tiempo.
--
-- Ejecutar con SQL*Plus como SYSDBA, despues de onboarding_auditor.sql sobre
-- PDB_BNCR:
--     sqlplus / as sysdba
--     @bncr_01_linea_base_segura.sql
--
-- IMPORTANTE (leccion aprendida en esta sesion): si se le hace pipe a la clave
-- desde PowerShell (p. ej. "clave" | sqlplus ...), PowerShell antepone un BOM
-- UTF-8 invisible al primer valor que lee ACCEPT/HIDE y la contrasena real NO
-- es la que se espera. Usar SIEMPRE un archivo de texto ASCII sin BOM y
-- redirigir con cmd.exe: cmd /c "sqlplus ... < archivo.txt".
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

ALTER SESSION SET CONTAINER = pdb_bncr;

-- ---------------------------------------------------------------------------
-- 1. Perfil de contrasenas dedicado (OBS-06). DEFAULT en esta PDB viene con los
--    limites de fabrica (10 intentos, 180 dias, sin funcion de verificacion):
--    todas las cuentas de negocio (y PDBADMIN) pasan a PERFIL_BNCR.
-- ---------------------------------------------------------------------------
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
    DBMS_OUTPUT.PUT_LINE('AVISO: no existe ORA12C_VERIFY_FUNCTION; PERFIL_BNCR queda sin funcion de verificacion.');
  END IF;
  EXECUTE IMMEDIATE
    'CREATE PROFILE perfil_bncr LIMIT'
    || ' FAILED_LOGIN_ATTEMPTS 5'
    || ' PASSWORD_LIFE_TIME 90'
    || ' PASSWORD_REUSE_TIME 365'
    || ' PASSWORD_REUSE_MAX 5'
    || ' PASSWORD_LOCK_TIME 1'
    || ' IDLE_TIME 30'
    || v_verificacion;
END;
/

ALTER USER pdbadmin    PROFILE perfil_bncr;
ALTER USER dba_lhidalgo PROFILE perfil_bncr;
ALTER USER app_bncr    PROFILE perfil_bncr;
ALTER USER cajero_01   PROFILE perfil_bncr;
ALTER USER gerente_01  PROFILE perfil_bncr;
ALTER USER dev_bncr    PROFILE perfil_bncr;
-- BNCR es NO AUTHENTICATION (no inicia sesion) pero OBS-06 igual revisa el
-- perfil de cualquier cuenta no mantenida por Oracle, DEFAULT incluido.
ALTER USER bncr        PROFILE perfil_bncr;

-- ---------------------------------------------------------------------------
-- 2. Acceso a datos de negocio solo por rol (OBS-02/03/07/09/10): ningun grant
--    directo a usuarios, ningun privilegio DBA/ANY ni de sistema fuera de
--    CREATE SESSION para las cuentas de negocio.
-- ---------------------------------------------------------------------------
CREATE ROLE rol_app_bncr;
CREATE ROLE rol_cajero_bncr;
CREATE ROLE rol_gerente_bncr;

GRANT SELECT, INSERT, UPDATE ON bncr.clientes      TO rol_app_bncr;
GRANT SELECT, INSERT, UPDATE ON bncr.cuentas       TO rol_app_bncr;
GRANT SELECT, INSERT, UPDATE ON bncr.tarjetas      TO rol_app_bncr;
GRANT SELECT, INSERT, UPDATE ON bncr.transacciones TO rol_app_bncr;
GRANT SELECT, INSERT, UPDATE ON bncr.empleados     TO rol_app_bncr;

GRANT SELECT ON bncr.clientes       TO rol_cajero_bncr;
GRANT SELECT ON bncr.cuentas        TO rol_cajero_bncr;
GRANT SELECT, INSERT ON bncr.transacciones TO rol_cajero_bncr;

GRANT SELECT ON bncr.clientes       TO rol_gerente_bncr;
GRANT SELECT, UPDATE ON bncr.cuentas TO rol_gerente_bncr;
GRANT SELECT ON bncr.tarjetas        TO rol_gerente_bncr;
GRANT SELECT ON bncr.transacciones   TO rol_gerente_bncr;

GRANT rol_app_bncr     TO app_bncr;
GRANT rol_cajero_bncr  TO cajero_01;
GRANT rol_gerente_bncr TO gerente_01;
-- DEV_BNCR: cuenta nueva en incorporacion, todavia sin acceso a produccion.

-- ---------------------------------------------------------------------------
-- 3. Clasificacion registrada de columnas sensibles (OBS-01).
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN bncr.clientes.cedula           IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.clientes.telefono         IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.clientes.correo           IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.clientes.direccion        IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.clientes.fecha_nacimiento IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.cuentas.iban              IS 'CLASIFICACION: Confidencial - dato financiero';
COMMENT ON COLUMN bncr.tarjetas.numero_tarjeta   IS 'CLASIFICACION: Confidencial - dato financiero';
COMMENT ON COLUMN bncr.empleados.cedula          IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.empleados.correo          IS 'CLASIFICACION: Confidencial - dato personal';
COMMENT ON COLUMN bncr.empleados.salario         IS 'CLASIFICACION: Confidencial - dato financiero';

-- ---------------------------------------------------------------------------
-- 4. VPD (OBS-12): CAJERO_01 (cajero/teller) no ve cuentas de alto saldo
--    (reservadas a gerencia); el resto de cuentas se ve sin restriccion. La
--    politica existe y esta habilitada en las 4 tablas con datos sensibles,
--    que es lo que exige el control.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bncr.f_vpd_bncr(p_esquema VARCHAR2, p_objeto VARCHAR2) RETURN VARCHAR2 IS
BEGIN
  IF SYS_CONTEXT('USERENV', 'SESSION_USER') = 'CAJERO_01' AND p_objeto = 'CUENTAS' THEN
    RETURN 'saldo < 3000000';
  END IF;
  RETURN NULL;
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(object_schema => 'BNCR', object_name => 'CLIENTES',
    policy_name => 'pol_vpd_clientes', function_schema => 'BNCR', policy_function => 'F_VPD_BNCR',
    statement_types => 'SELECT, UPDATE, DELETE');
  DBMS_RLS.ADD_POLICY(object_schema => 'BNCR', object_name => 'CUENTAS',
    policy_name => 'pol_vpd_cuentas', function_schema => 'BNCR', policy_function => 'F_VPD_BNCR',
    statement_types => 'SELECT, UPDATE, DELETE');
  DBMS_RLS.ADD_POLICY(object_schema => 'BNCR', object_name => 'TARJETAS',
    policy_name => 'pol_vpd_tarjetas', function_schema => 'BNCR', policy_function => 'F_VPD_BNCR',
    statement_types => 'SELECT, UPDATE, DELETE');
  DBMS_RLS.ADD_POLICY(object_schema => 'BNCR', object_name => 'EMPLEADOS',
    policy_name => 'pol_vpd_empleados', function_schema => 'BNCR', policy_function => 'F_VPD_BNCR',
    statement_types => 'SELECT, UPDATE, DELETE');
END;
/

-- ---------------------------------------------------------------------------
-- 5. Data Redaction (OBS-15) sobre cada columna sensible confirmada.
-- ---------------------------------------------------------------------------
BEGIN
  DBMS_REDACT.ADD_POLICY(
    object_schema => 'BNCR', object_name => 'CLIENTES', column_name => 'cedula',
    policy_name => 'pol_redact_clientes', function_type => DBMS_REDACT.FULL,
    expression => 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') NOT IN (''APP_BNCR'',''DBA_LHIDALGO'',''AUDITOR_ISO'')');
  DBMS_REDACT.ALTER_POLICY(object_schema => 'BNCR', object_name => 'CLIENTES', policy_name => 'pol_redact_clientes',
    column_name => 'telefono', action => DBMS_REDACT.ADD_COLUMN, function_type => DBMS_REDACT.FULL);
  DBMS_REDACT.ALTER_POLICY(object_schema => 'BNCR', object_name => 'CLIENTES', policy_name => 'pol_redact_clientes',
    column_name => 'correo', action => DBMS_REDACT.ADD_COLUMN, function_type => DBMS_REDACT.FULL);
  DBMS_REDACT.ALTER_POLICY(object_schema => 'BNCR', object_name => 'CLIENTES', policy_name => 'pol_redact_clientes',
    column_name => 'direccion', action => DBMS_REDACT.ADD_COLUMN, function_type => DBMS_REDACT.FULL);
  DBMS_REDACT.ALTER_POLICY(object_schema => 'BNCR', object_name => 'CLIENTES', policy_name => 'pol_redact_clientes',
    column_name => 'fecha_nacimiento', action => DBMS_REDACT.ADD_COLUMN, function_type => DBMS_REDACT.FULL);

  DBMS_REDACT.ADD_POLICY(
    object_schema => 'BNCR', object_name => 'CUENTAS', column_name => 'iban',
    policy_name => 'pol_redact_cuentas', function_type => DBMS_REDACT.FULL,
    expression => 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') NOT IN (''APP_BNCR'',''DBA_LHIDALGO'',''AUDITOR_ISO'')');

  DBMS_REDACT.ADD_POLICY(
    object_schema => 'BNCR', object_name => 'TARJETAS', column_name => 'numero_tarjeta',
    policy_name => 'pol_redact_tarjetas', function_type => DBMS_REDACT.FULL,
    expression => 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') NOT IN (''APP_BNCR'',''DBA_LHIDALGO'',''AUDITOR_ISO'')');

  DBMS_REDACT.ADD_POLICY(
    object_schema => 'BNCR', object_name => 'EMPLEADOS', column_name => 'cedula',
    policy_name => 'pol_redact_empleados', function_type => DBMS_REDACT.FULL,
    expression => 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') NOT IN (''APP_BNCR'',''DBA_LHIDALGO'',''AUDITOR_ISO'')');
  DBMS_REDACT.ALTER_POLICY(object_schema => 'BNCR', object_name => 'EMPLEADOS', policy_name => 'pol_redact_empleados',
    column_name => 'correo', action => DBMS_REDACT.ADD_COLUMN, function_type => DBMS_REDACT.FULL);
  DBMS_REDACT.ALTER_POLICY(object_schema => 'BNCR', object_name => 'EMPLEADOS', policy_name => 'pol_redact_empleados',
    column_name => 'salario', action => DBMS_REDACT.ADD_COLUMN, function_type => DBMS_REDACT.FULL);
END;
/

-- ---------------------------------------------------------------------------
-- 6. Canales de fuga (OBS-16): sin EXECUTE a PUBLIC sobre paquetes de red o
--    archivos. No se crean directorios ni se otorgan roles de Data Pump a
--    cuentas de negocio.
-- ---------------------------------------------------------------------------
BEGIN
  FOR p IN (SELECT table_name FROM dba_tab_privs
            WHERE grantee = 'PUBLIC' AND privilege = 'EXECUTE'
            AND table_name IN ('UTL_FILE', 'UTL_HTTP', 'UTL_TCP', 'UTL_SMTP')) LOOP
    EXECUTE IMMEDIATE 'REVOKE EXECUTE ON ' || p.table_name || ' FROM PUBLIC';
  END LOOP;
END;
/

-- ---------------------------------------------------------------------------
-- 7. Auditoria (OBS-08/18/19): AUDIT_ADMIN restringido (nadie lo tiene fuera
--    de DBA_LHIDALGO, via el rol DBA), purga habilitada, politicas de
--    auditoria unificada sobre las tablas sensibles y sobre acciones
--    privilegiadas + logon fallido.
-- ---------------------------------------------------------------------------
-- INIT_CLEANUP no aplica al rastro UNIFIED en esta version (ORA-46250): el
-- job de purga se crea directo con CREATE_PURGE_JOB.
BEGIN
  DBMS_AUDIT_MGMT.CREATE_PURGE_JOB(audit_trail_type           => DBMS_AUDIT_MGMT.AUDIT_TRAIL_UNIFIED,
                                    audit_trail_purge_interval => 24,
                                    audit_trail_purge_name     => 'bncr_purga_unificada');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -46276 THEN RAISE; END IF; -- el job ya existe
END;
/

CREATE AUDIT POLICY pol_bncr_datos_sensibles
  ACTIONS SELECT, INSERT, UPDATE, DELETE ON bncr.clientes,
          SELECT, INSERT, UPDATE, DELETE ON bncr.cuentas,
          SELECT, INSERT, UPDATE, DELETE ON bncr.tarjetas,
          SELECT, INSERT, UPDATE, DELETE ON bncr.empleados;
AUDIT POLICY pol_bncr_datos_sensibles;

CREATE AUDIT POLICY pol_bncr_acciones
  ACTIONS CREATE USER, ALTER USER, DROP USER, GRANT, REVOKE;
AUDIT POLICY pol_bncr_acciones;

CREATE AUDIT POLICY pol_bncr_logon ACTIONS LOGON;
AUDIT POLICY pol_bncr_logon WHENEVER NOT SUCCESSFUL;

PROMPT Politicas de auditoria unificada habilitadas:
SELECT policy_name FROM audit_unified_enabled_policies WHERE policy_name LIKE 'POL_BNCR%';

PROMPT Politicas VPD habilitadas:
SELECT object_name, policy_name, enable FROM dba_policies WHERE object_owner = 'BNCR';

PROMPT Columnas con Data Redaction:
SELECT object_name, column_name FROM redaction_columns WHERE object_owner = 'BNCR' ORDER BY 1, 2;
