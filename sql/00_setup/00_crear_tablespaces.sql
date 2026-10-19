-- ============================================================================
-- 00_crear_tablespaces.sql
-- Fase: 1.3 (Caso ficticio) — Plan de acción
-- Objetivo: crear los tablespaces del esquema CLINICA, separando el que
--           contendrá datos sensibles (PACIENTES, EXPEDIENTES, EMPLEADOS)
--           para poder cifrarlo luego con TDE (control A8.24).
-- Conexión: SYSTEM / sys as sysdba, sobre el PDB XEPDB1.
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE TABLESPACE TS_CLINICA ... (datos no sensibles: CITAS, control)
-- TODO: CREATE TABLESPACE TS_CLINICA_SENSIBLE ... (PACIENTES, EXPEDIENTES, EMPLEADOS)
--       Este tablespace se cifrará en sql/02_controles/A8_24_tde.sql
