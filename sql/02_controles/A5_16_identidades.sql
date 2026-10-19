-- ============================================================================
-- Control: A5.16 — Gestión de identidades
-- Riesgo(s) relacionado(s): R-CONF-02
-- Tarea(s) del DBA: T-01
-- Objetivo: asegurar cuentas nominales (una por persona), bloquear cuentas
--           inactivas y cuentas por defecto que no deban usarse.
-- Evidencia observable (Anexo A): DBA_USERS (account_status, last_login).
-- Prueba de verificación: P-04, P-05
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: ALTER USER EXEMPLEADO_01 ACCOUNT LOCK; -- cuenta inactiva (> 90 días sin uso)
-- TODO: revisar y bloquear cuentas de muestra/por defecto que no se usen (ej. HR, SCOTT si existieran)
-- TODO: confirmar que no existen contraseñas iguales al nombre de usuario (ver DBA_USERS_WITH_DEFPWD)

COMMIT;
