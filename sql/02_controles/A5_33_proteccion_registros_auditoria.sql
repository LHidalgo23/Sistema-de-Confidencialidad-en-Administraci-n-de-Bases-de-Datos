-- ============================================================================
-- Control: A5.33 — Protección de registros
-- Riesgo(s) relacionado(s): R-CONF-05
-- Tarea(s) del DBA: T-07, T-11
-- Objetivo: restringir la administración de la auditoría (AUDIT_ADMIN) solo
--           al DBA nominal, dar a AUDITOR_APP exclusivamente AUDIT_VIEWER,
--           y configurar una política de retención de los registros.
-- Evidencia observable (Anexo A): DBA_ROLE_PRIVS, DBA_AUDIT_MGMT_CONFIG_PARAMS.
-- Prueba de verificación: P-20
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: GRANT AUDIT_ADMIN TO DBA_JSANCHEZ;
-- TODO: GRANT AUDIT_VIEWER TO AUDITOR_APP; (confirmar que no tiene AUDIT_ADMIN)
-- TODO: BEGIN
--         DBMS_AUDIT_MGMT.SET_AUDIT_TRAIL_PROPERTY(
--           AUDIT_TRAIL_TYPE   => DBMS_AUDIT_MGMT.AUDIT_TRAIL_UNIFIED,
--           AUDIT_TRAIL_PROPERTY => DBMS_AUDIT_MGMT.AUDIT_TRAIL_RETENTION,
--           AUDIT_TRAIL_PROPERTY_VALUE => 90);
--       END;
--       /

COMMIT;
