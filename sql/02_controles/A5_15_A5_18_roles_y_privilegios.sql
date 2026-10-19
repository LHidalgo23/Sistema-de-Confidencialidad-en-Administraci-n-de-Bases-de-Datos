-- ============================================================================
-- Controles: A5.15 — Control de acceso · A5.18 — Derechos de acceso
-- Riesgo(s) relacionado(s): R-CONF-01
-- Tarea(s) del DBA: T-02
-- Objetivo: crear roles funcionales (mínimo privilegio), mover todos los
--           grants directos de usuario a roles, revocar grants a PUBLIC
--           y dejar registro de una revisión periódica de accesos.
-- Evidencia observable (Anexo A): DBA_TAB_PRIVS, DBA_ROLE_PRIVS;
--           REVISION_ACCESOS para A5.18.
-- Prueba de verificación: P-02, P-03, P-08
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- Roles funcionales
-- TODO: CREATE ROLE ROL_APP; CREATE ROLE ROL_MEDICO; CREATE ROLE ROL_RECEPCION;
--       CREATE ROLE ROL_RRHH; CREATE ROLE ROL_DESARROLLO;

-- TODO: GRANT <privilegios mínimos sobre objetos CLINICA> TO ROL_APP;
-- TODO: GRANT ROL_APP TO APP_CLINICA;
-- (repetir patrón grant-a-rol / rol-a-usuario para cada rol)

-- Revocar grants directos y a PUBLIC introducidos en la línea base insegura
-- TODO: REVOKE SELECT ON CLINICA.PACIENTES FROM PUBLIC;
-- TODO: REVOKE SELECT, INSERT, UPDATE ON CLINICA.CITAS FROM RECEPCION_01;

-- A5.18: registrar la revisión de accesos (evidencia auditable y repetible)
-- TODO: INSERT INTO CLINICA.REVISION_ACCESOS (fecha, revisor, hallazgos) VALUES (SYSDATE, 'DBA_JSANCHEZ', '...');

COMMIT;
