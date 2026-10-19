-- ============================================================================
-- Control: A8.2 — Derechos de acceso privilegiado
-- Riesgo(s) relacionado(s): R-CONF-01, R-CONF-05
-- Tarea(s) del DBA: T-02, T-07
-- Objetivo: revocar el rol DBA y privilegios ANY no justificados otorgados
--           en la línea base insegura; confirmar separación de funciones
--           (BACKUP_OP con SYSBACKUP, no con DBA); habilitar auditoría de
--           operaciones SYS.
-- Evidencia observable (Anexo A): DBA_ROLE_PRIVS, DBA_SYS_PRIVS,
--           V$PWFILE_USERS, V$PARAMETER (audit_sys_operations).
-- Prueba de verificación: P-09, P-10, P-11
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: REVOKE DBA FROM APP_CLINICA;
-- TODO: REVOKE SELECT ANY TABLE FROM DEV_USER;
-- TODO: confirmar que BACKUP_OP solo tiene SYSBACKUP (no DBA, no SYSDBA)

-- AUDIT_SYS_OPERATIONS requiere cambio a nivel de instancia (reinicio)
-- TODO: ALTER SYSTEM SET AUDIT_SYS_OPERATIONS = TRUE SCOPE = SPFILE;
-- (documentar en el informe que requiere reinicio de la instancia)
