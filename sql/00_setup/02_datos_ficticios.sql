-- ============================================================================
-- 02_datos_ficticios.sql
-- Fase: 1.3 (Caso ficticio) — Plan de acción
-- Objetivo: poblar el esquema CLINICA con datos 100% inventados
--           (mínimo 200 pacientes, 50 empleados). Nunca usar datos reales.
-- Conexión: CLINICA (o SYSTEM, insertando con esquema CLINICA.<tabla>).
-- Requisito: sql/00_setup/01_crear_esquema_clinica.sql ya ejecutado.
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: generar >= 200 filas en CLINICA.PACIENTES (loop PL/SQL o DBMS_RANDOM)
-- TODO: generar expedientes asociados en CLINICA.EXPEDIENTES
-- TODO: generar >= 50 filas en CLINICA.EMPLEADOS
-- TODO: generar citas en CLINICA.CITAS
-- TODO: poblar CLINICA.CLASIFICACION_DATOS con el inventario de columnas sensibles (A5.12)

COMMIT;
