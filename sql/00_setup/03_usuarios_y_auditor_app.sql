-- ============================================================================
-- 03_usuarios_y_auditor_app.sql
-- Fase: 2.4 (Línea base insegura) — Plan de acción
-- Objetivo: crear los usuarios del caso (ver sección 2.2 del plan de acción)
--           y el usuario de solo lectura AUDITOR_APP que usará el backend
--           (CREATE SESSION, SELECT_CATALOG_ROLE, AUDIT_VIEWER).
-- Usuarios: APP_CLINICA, MEDICO_01, MEDICO_02, RECEPCION_01, RRHH_01,
--           DEV_USER, DBA_JSANCHEZ, BACKUP_OP, AUDITOR_APP
-- Conexión: SYSTEM / sys as sysdba, sobre el PDB XEPDB1.
-- Nota: en este script los usuarios se crean con privilegios mínimos.
--       Los errores intencionales de la línea base insegura van en
--       sql/01_linea_base_insegura.sql, no aquí.
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- TODO: CREATE USER APP_CLINICA IDENTIFIED BY ... ;
-- TODO: CREATE USER MEDICO_01 IDENTIFIED BY ... ; CREATE USER MEDICO_02 IDENTIFIED BY ... ;
-- TODO: CREATE USER RECEPCION_01 IDENTIFIED BY ... ;
-- TODO: CREATE USER RRHH_01 IDENTIFIED BY ... ;
-- TODO: CREATE USER DEV_USER IDENTIFIED BY ... ;
-- TODO: CREATE USER DBA_JSANCHEZ IDENTIFIED BY ... ;
-- TODO: CREATE USER BACKUP_OP IDENTIFIED BY ... ; GRANT SYSBACKUP TO BACKUP_OP;
-- TODO: CREATE USER EXEMPLEADO_01 IDENTIFIED BY ... ; -- cuenta inactiva, usada por P-04 (ver línea base)

-- AUDITOR_APP: usuario de solo lectura consumido por backend/app/db.py
-- TODO: CREATE USER AUDITOR_APP IDENTIFIED BY ... ;
-- TODO: GRANT CREATE SESSION TO AUDITOR_APP;
-- TODO: GRANT SELECT_CATALOG_ROLE TO AUDITOR_APP;
-- TODO: GRANT AUDIT_VIEWER TO AUDITOR_APP;
