-- ============================================================================
-- Control: A8.10 — Eliminación de la información
-- Riesgo(s) relacionado(s): R-CONF-03
-- Tarea(s) del DBA: T-10
-- Objetivo: vaciar el recyclebin de CLINICA (PURGE) y documentar el
--           procedimiento estándar de borrado seguro (DROP ... PURGE,
--           INCLUDING CONTENTS AND DATAFILES, DELETE OBSOLETE en RMAN).
-- Evidencia observable (Anexo A): DBA_RECYCLEBIN, reporte RMAN.
-- Prueba de verificación: P-15
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: PURGE RECYCLEBIN; -- o PURGE TABLE CLINICA.TMP_BORRAR; según el caso
-- TODO: documentar en el informe el procedimiento de borrado seguro:
--       DROP TABLE ... PURGE;
--       DROP TABLESPACE ... INCLUDING CONTENTS AND DATAFILES;
--       RMAN> DELETE OBSOLETE;
