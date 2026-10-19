-- ============================================================================
-- 01_crear_esquema_clinica.sql
-- Fase: 1.3 (Caso ficticio) — Plan de acción
-- Objetivo: crear el esquema CLINICA (dueño de objetos, sin login de
--           aplicación) y las tablas del caso de estudio Clínica Los Robles S.A.
-- Tablas: PACIENTES, EXPEDIENTES, EMPLEADOS, CITAS,
--         CLASIFICACION_DATOS (evidencia A5.12), REVISION_ACCESOS (evidencia A5.18)
-- Conexión: SYSTEM / sys as sysdba, sobre el PDB XEPDB1.
-- Requisito: sql/00_setup/00_crear_tablespaces.sql ya ejecutado.
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE USER CLINICA ... (sin CREATE SESSION al final, ver 03_usuarios_y_auditor_app.sql)

-- TODO: CREATE TABLE CLINICA.PACIENTES (cedula, nombre, fecha_nacimiento, telefono, correo, direccion, ...) TABLESPACE TS_CLINICA_SENSIBLE
-- TODO: CREATE TABLE CLINICA.EXPEDIENTES (paciente_id, diagnostico, tratamiento, medico_asignado, ...) TABLESPACE TS_CLINICA_SENSIBLE
-- TODO: CREATE TABLE CLINICA.EMPLEADOS (cedula, nombre, salario, iban, ...) TABLESPACE TS_CLINICA_SENSIBLE
-- TODO: CREATE TABLE CLINICA.CITAS (paciente_id, medico, fecha, ...) TABLESPACE TS_CLINICA
-- TODO: CREATE TABLE CLINICA.CLASIFICACION_DATOS (tabla, columna, nivel, base_legal, ...) TABLESPACE TS_CLINICA
-- TODO: CREATE TABLE CLINICA.REVISION_ACCESOS (fecha, revisor, hallazgos, ...) TABLESPACE TS_CLINICA
