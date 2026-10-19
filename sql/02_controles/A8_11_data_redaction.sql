-- ============================================================================
-- Control: A8.11 — Enmascaramiento de datos
-- Riesgo(s) relacionado(s): R-CONF-04
-- Tarea(s) del DBA: T-05
-- Objetivo: aplicar Data Redaction sobre cédula, salario e IBAN para que
--           DEV_USER y RECEPCION_01 reciban los valores enmascarados aunque
--           tengan privilegio SELECT.
-- Evidencia observable (Anexo A): REDACTION_POLICIES, REDACTION_COLUMNS.
-- Prueba de verificación: P-16
-- Conexión: SYSTEM / sys as sysdba (creación); DEV_USER (prueba)
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: BEGIN
--         DBMS_REDACT.ADD_POLICY(
--           object_schema     => 'CLINICA',
--           object_name       => 'PACIENTES',
--           column_name       => 'CEDULA',
--           policy_name       => 'POL_REDACT_CEDULA',
--           function_type     => DBMS_REDACT.PARTIAL,
--           function_parameters => '9,9,9,9,9,9,9,9,9,*,1,9',
--           expression        => 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') IN (''DEV_USER'',''RECEPCION_01'')');
--       END;
--       /

-- TODO: repetir DBMS_REDACT.ADD_POLICY para EMPLEADOS.SALARIO y EMPLEADOS.IBAN

COMMIT;
