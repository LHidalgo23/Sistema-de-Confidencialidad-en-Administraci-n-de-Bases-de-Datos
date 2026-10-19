-- ============================================================================
-- Control: A8.8 — Gestión de vulnerabilidades técnicas (control extra, justificado)
-- Riesgo(s) relacionado(s): R-CONF-03
-- Tarea(s) del DBA: T-08
-- Objetivo: documentar la versión exacta del motor y el estado de parches
--           aplicados, como evidencia del proceso de gestión de
--           vulnerabilidades. Oracle XE no recibe Release Update Revisions
--           trimestrales como Enterprise Edition: se declara honestamente
--           como hallazgo "Parcial" con un plan de mitigación (monitoreo de
--           CVEs, actualización a una edición con soporte de parches).
-- Evidencia observable (Anexo A): V$VERSION, DBA_REGISTRY_SQLPATCH.
-- Prueba de verificación: P-24
-- Conexión: AUDITOR_APP
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: SELECT * FROM V$VERSION;
-- TODO: SELECT * FROM DBA_REGISTRY_SQLPATCH ORDER BY ACTION_TIME DESC;
-- TODO: redactar en el informe el hallazgo y el plan de mitigación (Actuar)
