-- ============================================================================
-- Control: A8.15 — Registro (logging)
-- Riesgo(s) relacionado(s): R-CONF-05
-- Tarea(s) del DBA: T-07, T-11
-- Objetivo: crear políticas de auditoría unificada sobre las tablas
--           sensibles de CLINICA, los logons fallidos y las acciones
--           privilegiadas; activarlas.
-- Evidencia observable (Anexo A): AUDIT_UNIFIED_ENABLED_POLICIES,
--           UNIFIED_AUDIT_TRAIL.
-- Prueba de verificación: P-19
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE AUDIT POLICY POL_AUDIT_CLINICA
--         ACTIONS SELECT ON CLINICA.PACIENTES,
--                 SELECT ON CLINICA.EXPEDIENTES,
--                 SELECT ON CLINICA.EMPLEADOS;
--       AUDIT POLICY POL_AUDIT_CLINICA;

-- TODO: CREATE AUDIT POLICY POL_AUDIT_LOGON_FALLIDO
--         ACTIONS LOGON;
--       (o usar ORA_LOGON_FAILURES, la política predefinida de Oracle)
--       AUDIT POLICY ORA_LOGON_FAILURES;

-- TODO: AUDIT POLICY ORA_ACCOUNT_MGMT; -- gestión de cuentas/privilegios (acciones privilegiadas)

COMMIT;
