-- ======================================================================
-- Script correctivo generado por el instrumento de auditoría ISO/IEC 27001
-- Empresa: Clínica Los Robles S.A. (laboratorio) | Ejecución #1 (antes)
-- Generado: 2026-10-20T23:57:01+00:00
--
-- IMPORTANTE: el instrumento NO ejecuta este script. Debe revisarlo y aplicarlo
-- el DBA de la empresa bajo su gestión de cambios: primero en un ambiente de
-- prueba y con respaldo previo. Después, volver a observar para verificar.
-- ======================================================================
SET DEFINE OFF
SET SQLBLANKLINES ON

-- ----------------------------------------------------------------------
-- OBS-02 | A5.15 | Objetos de negocio con privilegios para PUBLIC
-- Severidad: alta | Hallazgos: 1
-- Nota: Antes de revocar, identificar qué cuentas dependen del acceso vía PUBLIC y otorgarles el acceso mediante un rol funcional.

REVOKE SELECT ON CLINICA.PACIENTES FROM PUBLIC;

-- Preventivo: Política de cambios que prohíba GRANT a PUBLIC sobre esquemas de negocio y auditoría unificada de las sentencias GRANT (A8.15).

-- ----------------------------------------------------------------------
-- OBS-05 | A5.17 | Cuentas abiertas con contraseña por defecto
-- Severidad: alta | Hallazgos: 1
-- Nota: PASSWORD EXPIRE obliga a definir una contraseña nueva en el siguiente inicio de sesión, de modo que el script nunca contiene secretos. Si la cuenta no se usa, bloquearla (ACCOUNT LOCK).

ALTER USER SCOTT PASSWORD EXPIRE;

-- Preventivo: Verificación de contraseñas por defecto en el procedimiento de entrega de cualquier base nueva y función de verificación de contraseñas en el perfil (A5.17).

-- ----------------------------------------------------------------------
-- OBS-08 | A5.33 | AUDIT_ADMIN indebido o sin purga de la pista de auditoría
-- Severidad: alta | Hallazgos: 1
-- Nota: La retención de la auditoría unificada se gestiona con DBMS_AUDIT_MGMT (marca de tiempo de archivo y trabajo de purga); no existe un parámetro de 'días de retención'. Respaldar o exportar la pista antes de purgar si la normativa lo exige.

-- Purga programada de la pista unificada (definir primero la política de retención de la empresa):
-- BEGIN
--   DBMS_AUDIT_MGMT.SET_LAST_ARCHIVE_TIMESTAMP(
--     audit_trail_type => DBMS_AUDIT_MGMT.AUDIT_TRAIL_UNIFIED,
--     last_archive_time => SYSTIMESTAMP - INTERVAL '<DIAS_RETENCION>' DAY);
--   DBMS_AUDIT_MGMT.CREATE_PURGE_JOB(
--     audit_trail_type => DBMS_AUDIT_MGMT.AUDIT_TRAIL_UNIFIED,
--     audit_trail_purge_interval => 24,
--     audit_trail_purge_name => 'PURGA_AUDITORIA_UNIFICADA',
--     use_last_arch_timestamp => TRUE);
-- END;
-- /

-- Preventivo: Separación de funciones: quien administra la auditoría no administra los datos ni el sistema, y la pista se exporta a un repositorio inmutable o SIEM antes de purgarse (A5.33, A8.15).

-- ----------------------------------------------------------------------
-- OBS-09 | A8.2 | Rol DBA fuera de las cuentas autorizadas
-- Severidad: alta | Hallazgos: 1
-- Nota: Una cuenta de aplicación nunca debería tener el rol DBA. Probar la aplicación en un ambiente no productivo tras la revocación.

-- Antes de revocar, identificar los privilegios realmente requeridos por la cuenta y otorgarlos mediante un rol funcional.
REVOKE DBA FROM APP_CLINICA;

-- Preventivo: Revisión trimestral de privilegios (A5.18) y política de auditoría unificada sobre GRANT/REVOKE (A8.15).

-- ----------------------------------------------------------------------
-- OBS-10 | A8.2 | Privilegios ANY a cuentas no administrativas
-- Severidad: alta | Hallazgos: 1
-- Nota: Un privilegio ANY da acceso a todos los esquemas, incluidos los de otras aplicaciones. Identificar qué objetos usa realmente la cuenta antes de revocar.

-- Reemplazar por grants explícitos sobre los objetos necesarios, mediante un rol funcional.
REVOKE SELECT ANY TABLE FROM DEV_USER;

-- Preventivo: Principio de mínimo privilegio en el alta de cuentas y auditoría de las sentencias GRANT (A8.2, A8.15).

-- ----------------------------------------------------------------------
-- OBS-12 | A8.3 | Tablas sensibles sin política VPD
-- Severidad: alta | Hallazgos: 4
-- Nota: El esquema de seguridad que aloja la función de predicado debe ser distinto del dueño de la tabla. Los usuarios con EXEMPT ACCESS POLICY (incluido SYS) no están sujetos a VPD.

-- La regla de acceso depende del negocio: el instrumento no puede inventarla. Completar y descomentar.
-- 1) CREATE OR REPLACE FUNCTION <ESQUEMA_SEGURIDAD>.FN_VPD_EMPLEADOS(p_esquema VARCHAR2, p_objeto VARCHAR2) RETURN VARCHAR2 AS
--    BEGIN RETURN '<predicado: por ejemplo, columna_responsable = SYS_CONTEXT(''USERENV'',''SESSION_USER'')>'; END;
--    /
-- 2) BEGIN
--      DBMS_RLS.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
--        policy_name => 'POL_EMPLEADOS', function_schema => '<ESQUEMA_SEGURIDAD>',
--        policy_function => 'FN_VPD_EMPLEADOS', statement_types => 'SELECT,INSERT,UPDATE,DELETE', update_check => TRUE);
--    END;
--    /

-- La regla de acceso depende del negocio: el instrumento no puede inventarla. Completar y descomentar.
-- 1) CREATE OR REPLACE FUNCTION <ESQUEMA_SEGURIDAD>.FN_VPD_EXPEDIENTES(p_esquema VARCHAR2, p_objeto VARCHAR2) RETURN VARCHAR2 AS
--    BEGIN RETURN '<predicado: por ejemplo, columna_responsable = SYS_CONTEXT(''USERENV'',''SESSION_USER'')>'; END;
--    /
-- 2) BEGIN
--      DBMS_RLS.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EXPEDIENTES',
--        policy_name => 'POL_EXPEDIENTES', function_schema => '<ESQUEMA_SEGURIDAD>',
--        policy_function => 'FN_VPD_EXPEDIENTES', statement_types => 'SELECT,INSERT,UPDATE,DELETE', update_check => TRUE);
--    END;
--    /

-- La regla de acceso depende del negocio: el instrumento no puede inventarla. Completar y descomentar.
-- 1) CREATE OR REPLACE FUNCTION <ESQUEMA_SEGURIDAD>.FN_VPD_PACIENTES(p_esquema VARCHAR2, p_objeto VARCHAR2) RETURN VARCHAR2 AS
--    BEGIN RETURN '<predicado: por ejemplo, columna_responsable = SYS_CONTEXT(''USERENV'',''SESSION_USER'')>'; END;
--    /
-- 2) BEGIN
--      DBMS_RLS.ADD_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
--        policy_name => 'POL_PACIENTES', function_schema => '<ESQUEMA_SEGURIDAD>',
--        policy_function => 'FN_VPD_PACIENTES', statement_types => 'SELECT,INSERT,UPDATE,DELETE', update_check => TRUE);
--    END;
--    /

-- La regla de acceso depende del negocio: el instrumento no puede inventarla. Completar y descomentar.
-- 1) CREATE OR REPLACE FUNCTION <ESQUEMA_SEGURIDAD>.FN_VPD_PACIENTES(p_esquema VARCHAR2, p_objeto VARCHAR2) RETURN VARCHAR2 AS
--    BEGIN RETURN '<predicado: por ejemplo, columna_responsable = SYS_CONTEXT(''USERENV'',''SESSION_USER'')>'; END;
--    /
-- 2) BEGIN
--      DBMS_RLS.ADD_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
--        policy_name => 'POL_PACIENTES', function_schema => '<ESQUEMA_SEGURIDAD>',
--        policy_function => 'FN_VPD_PACIENTES', statement_types => 'SELECT,INSERT,UPDATE,DELETE', update_check => TRUE);
--    END;
--    /

-- Preventivo: Definir en el diseño de cada tabla sensible quién puede ver qué filas (A8.3) y probar la política con usuarios reales de cada rol.

-- ----------------------------------------------------------------------
-- OBS-15 | A8.11 | Columnas sensibles sin política de Data Redaction
-- Severidad: alta | Hallazgos: 15
-- Nota: Una tabla admite una sola política de redaction: la primera columna crea la política y las siguientes la amplían. La expresión 1=1 redacta para todos los usuarios salvo los que tengan EXEMPT REDACTION POLICY; ajustarla (por rol o usuario) y elegir PARTIAL/REGEXP donde convenga conservar parte del dato.

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'EMPLEADOS';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'CEDULA', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
      policy_name => 'POL_REDACT_EMPLEADOS', column_name => 'CEDULA',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'EMPLEADOS';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'IBAN', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
      policy_name => 'POL_REDACT_EMPLEADOS', column_name => 'IBAN',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'EMPLEADOS';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'SALARIO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EMPLEADOS',
      policy_name => 'POL_REDACT_EMPLEADOS', column_name => 'SALARIO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'EXPEDIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'EXPEDIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'DIAGNOSTICO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EXPEDIENTES',
      policy_name => 'POL_REDACT_EXPEDIENTES', column_name => 'DIAGNOSTICO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'EXPEDIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'EXPEDIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'TRATAMIENTO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'EXPEDIENTES',
      policy_name => 'POL_REDACT_EXPEDIENTES', column_name => 'TRATAMIENTO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'CEDULA', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'CEDULA',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'CORREO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'CORREO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'DIRECCION', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'DIRECCION',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'FECHA_NACIMIENTO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'FECHA_NACIMIENTO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'TELEFONO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'TELEFONO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA_DEV' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'CEDULA', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'CEDULA',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA_DEV' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'CORREO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'CORREO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA_DEV' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'DIRECCION', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'DIRECCION',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA_DEV' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'FECHA_NACIMIENTO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'FECHA_NACIMIENTO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

DECLARE
  v_politica redaction_policies.policy_name%TYPE;
BEGIN
  BEGIN
    SELECT policy_name INTO v_politica FROM redaction_policies
     WHERE object_owner = 'CLINICA_DEV' AND object_name = 'PACIENTES';
    DBMS_REDACT.ALTER_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => v_politica, action => DBMS_REDACT.ADD_COLUMN,
      column_name => 'TELEFONO', function_type => DBMS_REDACT.FULL);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    DBMS_REDACT.ADD_POLICY(object_schema => 'CLINICA_DEV', object_name => 'PACIENTES',
      policy_name => 'POL_REDACT_PACIENTES', column_name => 'TELEFONO',
      function_type => DBMS_REDACT.FULL, expression => '1=1');
  END;
END;
/

-- Preventivo: Incluir la redacción de datos sensibles en el diseño de las vistas y consultas de soporte y desarrollo (A8.11) y revisar quién tiene EXEMPT REDACTION POLICY.

-- ----------------------------------------------------------------------
-- OBS-16 | A8.12 | Canales de fuga: paquetes, directorios y Data Pump
-- Severidad: alta | Hallazgos: 4
-- Nota: Revocar EXECUTE de UTL_* a PUBLIC puede afectar componentes que los usan: probar en un ambiente no productivo y, si algo falla, otorgar el privilegio solo a la cuenta que lo necesite.

REVOKE EXECUTE ON SYS.UTL_FILE FROM PUBLIC;

REVOKE EXECUTE ON SYS.UTL_HTTP FROM PUBLIC;

REVOKE EXECUTE ON SYS.UTL_SMTP FROM PUBLIC;

REVOKE EXECUTE ON SYS.UTL_TCP FROM PUBLIC;

-- Preventivo: Listas de control de acceso de red (ACL) para UTL_HTTP/UTL_TCP, directorios con acceso por cuenta y auditoría de las exportaciones Data Pump (A8.12, A8.15).

-- ----------------------------------------------------------------------
-- OBS-17 | A8.13 | Respaldos recientes sin cifrar
-- Severidad: alta | Hallazgos: 4
-- Nota: El cifrado transparente de RMAN usa la llave maestra de TDE: el keystore debe estar abierto durante el respaldo. Conservar el keystore y su contraseña fuera del servidor, o los respaldos serán irrecuperables.

-- Ejecutar en RMAN (rman target /). El respaldo 2 se reemplaza por uno cifrado:
-- CONFIGURE ENCRYPTION FOR DATABASE ON;
-- CONFIGURE ENCRYPTION ALGORITHM 'AES256';
-- BACKUP DATABASE PLUS ARCHIVELOG;
-- DELETE OBSOLETE;
-- Los respaldos anteriores sin cifrar que ya no se necesiten deben eliminarse (DELETE BACKUP): siguen siendo una copia legible de la base.

-- Ejecutar en RMAN (rman target /). El respaldo 3 se reemplaza por uno cifrado:
-- CONFIGURE ENCRYPTION FOR DATABASE ON;
-- CONFIGURE ENCRYPTION ALGORITHM 'AES256';
-- BACKUP DATABASE PLUS ARCHIVELOG;
-- DELETE OBSOLETE;
-- Los respaldos anteriores sin cifrar que ya no se necesiten deben eliminarse (DELETE BACKUP): siguen siendo una copia legible de la base.

-- Ejecutar en RMAN (rman target /). El respaldo 4 se reemplaza por uno cifrado:
-- CONFIGURE ENCRYPTION FOR DATABASE ON;
-- CONFIGURE ENCRYPTION ALGORITHM 'AES256';
-- BACKUP DATABASE PLUS ARCHIVELOG;
-- DELETE OBSOLETE;
-- Los respaldos anteriores sin cifrar que ya no se necesiten deben eliminarse (DELETE BACKUP): siguen siendo una copia legible de la base.

-- Ejecutar en RMAN (rman target /). El respaldo 5 se reemplaza por uno cifrado:
-- CONFIGURE ENCRYPTION FOR DATABASE ON;
-- CONFIGURE ENCRYPTION ALGORITHM 'AES256';
-- BACKUP DATABASE PLUS ARCHIVELOG;
-- DELETE OBSOLETE;
-- Los respaldos anteriores sin cifrar que ya no se necesiten deben eliminarse (DELETE BACKUP): siguen siendo una copia legible de la base.

-- Preventivo: Cifrado AES de todos los respaldos como configuración permanente de RMAN y prueba periódica de restauración (A8.13).

-- ----------------------------------------------------------------------
-- OBS-18 | A8.15 | Tablas sensibles sin política de auditoría unificada
-- Severidad: alta | Hallazgos: 4
-- Nota: Auditar SELECT en tablas muy consultadas genera volumen: acotar con WHEN/EVALUATE PER o auditar solo a los roles de riesgo, y dimensionar el espacio de la pista de auditoría.

CREATE AUDIT POLICY POL_ISO_CLINICA_EMPLEADOS
  ACTIONS SELECT ON CLINICA.EMPLEADOS,
          INSERT ON CLINICA.EMPLEADOS,
          UPDATE ON CLINICA.EMPLEADOS,
          DELETE ON CLINICA.EMPLEADOS;
AUDIT POLICY POL_ISO_CLINICA_EMPLEADOS;

CREATE AUDIT POLICY POL_ISO_CLINICA_EXPEDIENTES
  ACTIONS SELECT ON CLINICA.EXPEDIENTES,
          INSERT ON CLINICA.EXPEDIENTES,
          UPDATE ON CLINICA.EXPEDIENTES,
          DELETE ON CLINICA.EXPEDIENTES;
AUDIT POLICY POL_ISO_CLINICA_EXPEDIENTES;

CREATE AUDIT POLICY POL_ISO_CLINICA_PACIENTES
  ACTIONS SELECT ON CLINICA.PACIENTES,
          INSERT ON CLINICA.PACIENTES,
          UPDATE ON CLINICA.PACIENTES,
          DELETE ON CLINICA.PACIENTES;
AUDIT POLICY POL_ISO_CLINICA_PACIENTES;

CREATE AUDIT POLICY POL_ISO_CLINICA_DEV_PACIENTES
  ACTIONS SELECT ON CLINICA_DEV.PACIENTES,
          INSERT ON CLINICA_DEV.PACIENTES,
          UPDATE ON CLINICA_DEV.PACIENTES,
          DELETE ON CLINICA_DEV.PACIENTES;
AUDIT POLICY POL_ISO_CLINICA_DEV_PACIENTES;

-- Preventivo: Estándar de auditoría para tablas sensibles definido en el diseño y revisión periódica de las alertas generadas (A8.15).

-- ----------------------------------------------------------------------
-- OBS-19 | A8.15 | Logons fallidos y acciones privilegiadas sin auditar
-- Severidad: alta | Hallazgos: 2
-- Nota: Verificar los nombres de acción disponibles en la versión instalada (consultar AUDIT_UNIFIED_POLICIES / documentación de CREATE AUDIT POLICY) antes de aplicar.

CREATE AUDIT POLICY POL_ISO_ACCIONES_PRIVILEGIADAS
  ACTIONS CREATE USER, ALTER USER, DROP USER, GRANT, REVOKE, CREATE ROLE, ALTER ROLE, DROP ROLE;
AUDIT POLICY POL_ISO_ACCIONES_PRIVILEGIADAS;

-- Preventivo: Centralizar la pista de auditoría en un SIEM con alertas sobre intentos fallidos repetidos y cambios de privilegios (A8.15, A8.16).

-- ----------------------------------------------------------------------
-- OBS-20 | A8.20 | Sesiones sin cifrado de red
-- Severidad: alta | Hallazgos: 1
-- Nota: Con ENCRYPTION_SERVER=REQUIRED los clientes que no soporten cifrado dejan de conectar: empezar en REQUESTED durante la transición y pasar a REQUIRED cuando todos los clientes estén listos.

-- La sesión de C##AUDITOR_ISO (SID 495) viaja sin cifrado nativo. El cambio se aplica en sqlnet.ora del servidor (no es SQL):
-- SQLNET.ENCRYPTION_SERVER = REQUIRED
-- SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)
-- SQLNET.CRYPTO_CHECKSUM_SERVER = REQUIRED
-- TCP.VALIDNODE_CHECKING = YES
-- TCP.INVITED_NODES = (<hosts autorizados>)
-- Guardar copia del sqlnet.ora original, reiniciar el listener y probar la conexión tras el cambio.

-- Preventivo: Cifrado en tránsito obligatorio (nativo o TLS) y lista de nodos autorizados como estándar del listener (A8.20, A8.21).

-- ----------------------------------------------------------------------
-- OBS-21 | A8.24 | Keystore de TDE no abierto
-- Severidad: alta | Hallazgos: 1
-- Nota: Hacer respaldo del keystore y registrar su contraseña en un gestor de secretos antes de crear llaves: perder el keystore deja los datos cifrados ilegibles. Considerar un wallet de auto-login para que la base abra sola tras un reinicio.

-- Estado actual del keystore: NOT_AVAILABLE. Según el estado:
-- NOT_AVAILABLE : configurar WALLET_ROOT y TDE_CONFIGURATION (requiere reinicio) y crear el keystore.
-- CLOSED        : ADMINISTER KEY MANAGEMENT SET KEYSTORE OPEN IDENTIFIED BY "<clave_del_keystore>";
-- OPEN_NO_MASTER_KEY : ADMINISTER KEY MANAGEMENT SET KEY IDENTIFIED BY "<clave_del_keystore>" WITH BACKUP;

-- Preventivo: Procedimiento de custodia del keystore (copias, doble control, rotación de llaves) y monitoreo de su estado (A8.24).

-- ----------------------------------------------------------------------
-- OBS-22 | A8.24 | Columnas sensibles en tablespaces sin cifrar
-- Severidad: alta | Hallazgos: 15
-- Nota: No se pueden cifrar in situ SYSTEM, SYSAUX, UNDO ni TEMP; para esas estructuras el control es el cifrado de respaldos y del almacenamiento. Alternativa: crear un tablespace nuevo con ENCRYPTION y mover las tablas con ALTER TABLE ... MOVE.

-- Cifrar el tablespace TS_SENSIBLE (requiere keystore abierto con llave maestra, ver OBS-21).
-- Opción sin conexión (requiere ventana de mantenimiento):
-- ALTER TABLESPACE TS_SENSIBLE OFFLINE NORMAL;
-- ALTER TABLESPACE TS_SENSIBLE ENCRYPTION OFFLINE USING 'AES256' ENCRYPT;
-- ALTER TABLESPACE TS_SENSIBLE ONLINE;
-- Opción en línea (genera copias de los archivos de datos):
-- ALTER TABLESPACE TS_SENSIBLE ENCRYPTION ONLINE USING 'AES256' ENCRYPT FILE_NAME_CONVERT = ('<archivo_origen>', '<archivo_destino>');

-- Preventivo: Crear los tablespaces de datos sensibles con cifrado desde el diseño (A8.24) y verificar V$ENCRYPTED_TABLESPACES tras cada alta.

-- ----------------------------------------------------------------------
-- OBS-23 | A8.33 | Esquemas de desarrollo o prueba con datos sensibles sin enmascarar
-- Severidad: alta | Hallazgos: 5
-- Nota: El marcador es una convención: solo debe registrarse cuando el enmascarado ya se aplicó. Los ambientes de prueba no deberían recibir copias de producción sin enmascarar (A8.33).

-- Enmascarar los datos de CLINICA_DEV.PACIENTES.CEDULA (por ejemplo con DBMS_RANDOM o un UPDATE con valores ficticios) y, una vez enmascarados, registrar el marcador:
-- UPDATE CLINICA_DEV.PACIENTES SET CEDULA = <expresion_de_enmascarado>;
-- COMMENT ON COLUMN CLINICA_DEV.PACIENTES.CEDULA IS 'ENMASCARADO';

-- Enmascarar los datos de CLINICA_DEV.PACIENTES.CORREO (por ejemplo con DBMS_RANDOM o un UPDATE con valores ficticios) y, una vez enmascarados, registrar el marcador:
-- UPDATE CLINICA_DEV.PACIENTES SET CORREO = <expresion_de_enmascarado>;
-- COMMENT ON COLUMN CLINICA_DEV.PACIENTES.CORREO IS 'ENMASCARADO';

-- Enmascarar los datos de CLINICA_DEV.PACIENTES.DIRECCION (por ejemplo con DBMS_RANDOM o un UPDATE con valores ficticios) y, una vez enmascarados, registrar el marcador:
-- UPDATE CLINICA_DEV.PACIENTES SET DIRECCION = <expresion_de_enmascarado>;
-- COMMENT ON COLUMN CLINICA_DEV.PACIENTES.DIRECCION IS 'ENMASCARADO';

-- Enmascarar los datos de CLINICA_DEV.PACIENTES.FECHA_NACIMIENTO (por ejemplo con DBMS_RANDOM o un UPDATE con valores ficticios) y, una vez enmascarados, registrar el marcador:
-- UPDATE CLINICA_DEV.PACIENTES SET FECHA_NACIMIENTO = <expresion_de_enmascarado>;
-- COMMENT ON COLUMN CLINICA_DEV.PACIENTES.FECHA_NACIMIENTO IS 'ENMASCARADO';

-- Enmascarar los datos de CLINICA_DEV.PACIENTES.TELEFONO (por ejemplo con DBMS_RANDOM o un UPDATE con valores ficticios) y, una vez enmascarados, registrar el marcador:
-- UPDATE CLINICA_DEV.PACIENTES SET TELEFONO = <expresion_de_enmascarado>;
-- COMMENT ON COLUMN CLINICA_DEV.PACIENTES.TELEFONO IS 'ENMASCARADO';

-- Preventivo: Procedimiento de refresco de ambientes que enmascare los datos en el mismo flujo de la copia, y separación de ambientes de desarrollo, prueba y producción (A8.31, A8.33).

-- ----------------------------------------------------------------------
-- OBS-01 | A5.12 | Columnas sensibles sin clasificación registrada
-- Severidad: media | Hallazgos: 15
-- Nota: Confirmar el nivel de clasificación con el dueño del dato antes de registrarlo. El comentario actual de la columna se conserva al final.

COMMENT ON COLUMN CLINICA.EMPLEADOS.CEDULA IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA.EMPLEADOS.IBAN IS 'CLASIFICACION: Confidencial - dato financiero. ';

COMMENT ON COLUMN CLINICA.EMPLEADOS.SALARIO IS 'CLASIFICACION: Confidencial - dato financiero. ';

COMMENT ON COLUMN CLINICA.EXPEDIENTES.DIAGNOSTICO IS 'CLASIFICACION: Restringido - dato sensible (salud). ';

COMMENT ON COLUMN CLINICA.EXPEDIENTES.TRATAMIENTO IS 'CLASIFICACION: Restringido - dato sensible (salud). ';

COMMENT ON COLUMN CLINICA.PACIENTES.CEDULA IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA.PACIENTES.CORREO IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA.PACIENTES.DIRECCION IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA.PACIENTES.FECHA_NACIMIENTO IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA.PACIENTES.TELEFONO IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA_DEV.PACIENTES.CEDULA IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA_DEV.PACIENTES.CORREO IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA_DEV.PACIENTES.DIRECCION IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA_DEV.PACIENTES.FECHA_NACIMIENTO IS 'CLASIFICACION: Confidencial - dato personal. ';

COMMENT ON COLUMN CLINICA_DEV.PACIENTES.TELEFONO IS 'CLASIFICACION: Confidencial - dato personal. ';

-- Preventivo: Procedimiento de alta de columnas que exija clasificar el dato antes de pasar a producción (A5.12) y revisión anual del inventario de datos sensibles.

-- ----------------------------------------------------------------------
-- OBS-03 | A5.15 | Privilegios sobre objetos otorgados directo a usuarios
-- Severidad: media | Hallazgos: 21
-- Nota: El rol funcional debe definirse según la función del puesto, no según la persona. Descomentar los GRANT una vez definido el rol.

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT INSERT ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE INSERT ON CLINICA.CITAS FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE SELECT ON CLINICA.CITAS FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT UPDATE ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE UPDATE ON CLINICA.CITAS FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT INSERT ON CLINICA.EXPEDIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE INSERT ON CLINICA.EXPEDIENTES FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.EXPEDIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE SELECT ON CLINICA.EXPEDIENTES FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT UPDATE ON CLINICA.EXPEDIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE UPDATE ON CLINICA.EXPEDIENTES FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT INSERT ON CLINICA.PACIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE INSERT ON CLINICA.PACIENTES FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.PACIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE SELECT ON CLINICA.PACIENTES FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT UPDATE ON CLINICA.PACIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO APP_CLINICA;
REVOKE UPDATE ON CLINICA.PACIENTES FROM APP_CLINICA;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO MEDICO_01;
REVOKE SELECT ON CLINICA.CITAS FROM MEDICO_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.EXPEDIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO MEDICO_01;
REVOKE SELECT ON CLINICA.EXPEDIENTES FROM MEDICO_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.PACIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO MEDICO_01;
REVOKE SELECT ON CLINICA.PACIENTES FROM MEDICO_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO MEDICO_02;
REVOKE SELECT ON CLINICA.CITAS FROM MEDICO_02;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.EXPEDIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO MEDICO_02;
REVOKE SELECT ON CLINICA.EXPEDIENTES FROM MEDICO_02;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.PACIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO MEDICO_02;
REVOKE SELECT ON CLINICA.PACIENTES FROM MEDICO_02;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT INSERT ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO RECEPCION_01;
REVOKE INSERT ON CLINICA.CITAS FROM RECEPCION_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO RECEPCION_01;
REVOKE SELECT ON CLINICA.CITAS FROM RECEPCION_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT UPDATE ON CLINICA.CITAS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO RECEPCION_01;
REVOKE UPDATE ON CLINICA.CITAS FROM RECEPCION_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.PACIENTES TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO RECEPCION_01;
REVOKE SELECT ON CLINICA.PACIENTES FROM RECEPCION_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT SELECT ON CLINICA.EMPLEADOS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO RRHH_01;
REVOKE SELECT ON CLINICA.EMPLEADOS FROM RRHH_01;

-- Crear (si no existe) un rol funcional y otorgar el privilegio al rol antes de revocar:
-- GRANT UPDATE ON CLINICA.EMPLEADOS TO <ROL_FUNCIONAL>;
-- GRANT <ROL_FUNCIONAL> TO RRHH_01;
REVOKE UPDATE ON CLINICA.EMPLEADOS FROM RRHH_01;

-- Preventivo: Gestión de accesos basada en roles: toda solicitud de acceso se resuelve asignando un rol, nunca un grant directo (A5.15, A5.18).

-- ----------------------------------------------------------------------
-- OBS-06 | A5.17 | Perfiles sin función de verificación o con límites débiles
-- Severidad: media | Hallazgos: 4
-- Nota: Si el parámetro es PASSWORD_VERIFY_FUNCTION, verificar que la función exista (script utlpwdmg.sql). Aplicar IDLE_TIME y los límites de contraseña a cuentas de servicio solo tras confirmar que la aplicación tolera la política.

ALTER PROFILE DEFAULT LIMIT FAILED_LOGIN_ATTEMPTS 5;

ALTER PROFILE DEFAULT LIMIT IDLE_TIME 30;

ALTER PROFILE DEFAULT LIMIT PASSWORD_LIFE_TIME 90;

ALTER PROFILE DEFAULT LIMIT PASSWORD_VERIFY_FUNCTION ORA12C_VERIFY_FUNCTION;

-- Preventivo: Perfiles de seguridad dedicados por tipo de cuenta (personas, servicio) y revisión anual de los límites frente a la política de contraseñas (A5.17, A8.5).

-- ----------------------------------------------------------------------
-- OBS-07 | A5.18 | Privilegios de sistema directos no justificados
-- Severidad: media | Hallazgos: 2
-- Nota: Antes de revocar, otorgar el privilegio realmente necesario mediante un rol funcional que quede sujeto a la revisión periódica de derechos.

REVOKE UNLIMITED TABLESPACE FROM APP_CLINICA;

REVOKE SELECT ANY TABLE FROM DEV_USER;

-- Preventivo: Revisión trimestral de derechos de acceso con registro del revisor y la fecha (A5.18).

-- ----------------------------------------------------------------------
-- OBS-13 | A8.5 | Cuentas con hashes de contraseña antiguos
-- Severidad: media | Hallazgos: 12
-- Nota: Primero configurar SQLNET.ALLOWED_LOGON_VERSION_SERVER = 12 (o superior) en sqlnet.ora; así, al renovar la contraseña, solo se almacena el hash 12C. Verificar que los clientes antiguos soporten esa versión.

ALTER USER APP_CLINICA PASSWORD EXPIRE;

ALTER USER AUDITOR_ISO PASSWORD EXPIRE;

ALTER USER C##AUDITOR_ISO PASSWORD EXPIRE;

ALTER USER DBA_JSANCHEZ PASSWORD EXPIRE;

ALTER USER DEV_USER PASSWORD EXPIRE;

ALTER USER EXEMPLEADO_01 PASSWORD EXPIRE;

ALTER USER MEDICO_01 PASSWORD EXPIRE;

ALTER USER MEDICO_02 PASSWORD EXPIRE;

ALTER USER PDBADMIN PASSWORD EXPIRE;

ALTER USER RECEPCION_01 PASSWORD EXPIRE;

ALTER USER RRHH_01 PASSWORD EXPIRE;

-- Preventivo: Fijar SQLNET.ALLOWED_LOGON_VERSION_SERVER como parte del estándar de configuración del servidor (A8.5).

-- ----------------------------------------------------------------------
-- OBS-14 | A8.10 | Objetos de negocio en la papelera de reciclaje
-- Severidad: media | Hallazgos: 2
-- Nota: PURGE es irreversible: confirmar que los objetos eliminados no deben recuperarse con FLASHBACK TABLE ... TO BEFORE DROP.

PURGE TABLESPACE TS_SENSIBLE USER CLINICA;

-- Preventivo: Procedimiento estándar de eliminación segura: DROP ... PURGE, y DELETE OBSOLETE en RMAN para los respaldos que ya no se requieren (A8.10).

-- ----------------------------------------------------------------------
-- OBS-24 | A8.8 | Versión y parches del motor
-- Severidad: media | Hallazgos: 1
-- Nota: Probar el parche en un ambiente no productivo, respaldar la base y ejecutar datapatch al terminar.

-- Versión instalada: Oracle Database 21c Express Edition Release 21.0.0.0.0 - Production. Último parche aplicado: SIN REGISTRO (hace N/D días).
-- Aplicar el Release Update vigente con OPatch y datapatch (descarga desde Oracle Support).
-- Oracle XE no recibe Release Updates trimestrales: documentar el hallazgo como aceptación de riesgo
-- en el perfil de la empresa y planificar la migración a una edición con soporte de parches.

-- Preventivo: Calendario trimestral de revisión de Critical Patch Updates y suscripción a los avisos de seguridad de Oracle (A8.8).
