-- ============================================================================
-- Controles: A5.17 — Información de autenticación · A8.5 — Autenticación segura
-- Riesgo(s) relacionado(s): R-CONF-02
-- Tarea(s) del DBA: T-03
-- Objetivo: crear un perfil de seguridad (PERFIL_USUARIOS) con función de
--           verificación de contraseña, límite de intentos fallidos,
--           vigencia y tiempo de inactividad (idle_time); asignarlo a los
--           usuarios de aplicación; confirmar uso de hashes 12C únicamente.
-- Evidencia observable (Anexo A): DBA_PROFILES, DBA_USERS_WITH_DEFPWD,
--           DBA_USERS.password_versions.
-- Prueba de verificación: P-06, P-07, P-14
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE PROFILE PERFIL_USUARIOS LIMIT
--         FAILED_LOGIN_ATTEMPTS 5
--         PASSWORD_LIFE_TIME 90
--         PASSWORD_REUSE_TIME 365
--         PASSWORD_VERIFY_FUNCTION ORA12C_VERIFY_FUNCTION
--         IDLE_TIME 30;

-- TODO: ALTER USER APP_CLINICA PROFILE PERFIL_USUARIOS;
--       (repetir para MEDICO_01, MEDICO_02, RECEPCION_01, RRHH_01, DEV_USER)

-- TODO: confirmar SQLNET.ALLOWED_LOGON_VERSION_SERVER = 12 en sqlnet.ora (solo hashes 12C)

COMMIT;
