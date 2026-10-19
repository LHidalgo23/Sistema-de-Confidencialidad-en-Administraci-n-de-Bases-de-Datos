-- ============================================================================
-- Control: A8.12 — Prevención de fuga de datos (DLP)
-- Riesgo(s) relacionado(s): R-CONF-03
-- Tarea(s) del DBA: T-10
-- Objetivo: revocar EXECUTE sobre paquetes de red/archivo (UTL_FILE,
--           UTL_HTTP, UTL_TCP) de PUBLIC; restringir directorios y
--           privilegios de Data Pump; auditar exportaciones.
-- Evidencia observable (Anexo A): DBA_TAB_PRIVS (paquetes), DBA_DIRECTORIES.
-- Prueba de verificación: P-17
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: REVOKE EXECUTE ON UTL_FILE FROM PUBLIC;
-- TODO: REVOKE EXECUTE ON UTL_HTTP FROM PUBLIC;
-- TODO: REVOKE EXECUTE ON UTL_TCP FROM PUBLIC;
-- (documentar si alguna revocación rompe un componente del sistema y, de ser así, revertir y registrar como hallazgo Parcial)

-- TODO: revisar DBA_DIRECTORIES y restringir READ/WRITE solo a los usuarios que lo necesiten
-- TODO: revisar privilegios EXP_FULL_DATABASE / IMP_FULL_DATABASE (Data Pump) y limitarlos
