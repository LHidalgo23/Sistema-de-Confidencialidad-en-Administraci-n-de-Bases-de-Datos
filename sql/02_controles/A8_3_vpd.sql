-- ============================================================================
-- Control: A8.3 — Restricción de acceso a la información
-- Riesgo(s) relacionado(s): R-CONF-01
-- Tarea(s) del DBA: T-02
-- Objetivo: aplicar Virtual Private Database (VPD) sobre CLINICA.EXPEDIENTES
--           para que cada médico solo pueda ver los expedientes de sus
--           propios pacientes; confirmar que RECEPCION_01 no tiene acceso.
-- Evidencia observable (Anexo A): DBA_POLICIES + prueba de acceso por usuario.
-- Prueba de verificación: P-12, P-13
-- Conexión: SYSTEM / sys as sysdba (creación); MEDICO_01/RECEPCION_01 (prueba)
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE OR REPLACE FUNCTION CLINICA.FN_VPD_EXPEDIENTES (p_schema VARCHAR2, p_obj VARCHAR2)
--       RETURN VARCHAR2 AS
--       BEGIN
--         RETURN 'medico_asignado = SYS_CONTEXT(''USERENV'', ''SESSION_USER'')';
--       END;
--       /

-- TODO: BEGIN
--         DBMS_RLS.ADD_POLICY(
--           object_schema   => 'CLINICA',
--           object_name     => 'EXPEDIENTES',
--           policy_name     => 'POL_EXPEDIENTES_MEDICO',
--           function_schema => 'CLINICA',
--           policy_function => 'FN_VPD_EXPEDIENTES',
--           statement_types => 'SELECT,UPDATE,DELETE');
--       END;
--       /

-- TODO: confirmar que RECEPCION_01 no tiene GRANT SELECT sobre CLINICA.EXPEDIENTES (ver A5_15_A5_18)
