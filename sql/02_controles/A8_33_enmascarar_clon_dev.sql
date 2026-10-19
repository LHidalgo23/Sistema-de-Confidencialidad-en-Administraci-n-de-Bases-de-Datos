-- ============================================================================
-- Controles: A8.33 — Información de prueba · A8.31 — Separación de ambientes
-- (controles extra, justificados)
-- Riesgo(s) relacionado(s): R-CONF-04
-- Tarea(s) del DBA: T-12
-- Objetivo: crear un esquema CLINICA_DEV como clon de CLINICA pero con los
--           datos personales enmascarados (DBMS_RANDOM), de forma que un
--           desarrollador nunca vea cédulas/datos reales en el ambiente
--           de pruebas.
-- Evidencia observable (Anexo A): comparación PROD vs. DEV (0 cédulas iguales).
-- Prueba de verificación: P-23
-- Conexión: SYSTEM / sys as sysdba
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE USER CLINICA_DEV IDENTIFIED BY ... ;
-- TODO: CREATE TABLE CLINICA_DEV.PACIENTES AS SELECT * FROM CLINICA.PACIENTES WHERE 1=0;
--       (crear estructura; poblar con datos enmascarados, no con INSERT ... SELECT directo)

-- TODO: generar cédulas, nombres, teléfonos, correos ficticios con DBMS_RANDOM
--       para cada fila clonada de PACIENTES/EMPLEADOS hacia CLINICA_DEV.

-- TODO: GRANT acceso de CLINICA_DEV a DEV_USER (solo sobre el esquema DEV)

COMMIT;
