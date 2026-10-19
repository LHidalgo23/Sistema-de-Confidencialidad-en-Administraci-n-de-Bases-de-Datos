-- ============================================================================
-- Control: A5.12 — Clasificación de la información
-- Riesgo(s) relacionado(s): R-CONF-01, R-CONF-04
-- Tarea(s) del DBA: T-01
-- Objetivo: inventariar y documentar el nivel de confidencialidad de cada
--           columna sensible del esquema CLINICA (Confidencial / Restringido)
--           y su base legal (Ley 8968), como evidencia auditable.
-- Evidencia observable (Anexo A): SELECT sobre CLASIFICACION_DATOS;
--           DBA_COL_COMMENTS para los COMMENT ON COLUMN aplicados.
-- Prueba de verificación: P-01
-- Conexión: CLINICA / SYSTEM
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: INSERT INTO CLINICA.CLASIFICACION_DATOS (tabla, columna, nivel, base_legal) VALUES (...);
--       una fila por columna sensible de PACIENTES, EXPEDIENTES y EMPLEADOS.
-- TODO: COMMENT ON COLUMN CLINICA.PACIENTES.CEDULA IS 'Confidencial - dato personal (Ley 8968)';
-- TODO: repetir COMMENT ON COLUMN para el resto de columnas sensibles.

COMMIT;
