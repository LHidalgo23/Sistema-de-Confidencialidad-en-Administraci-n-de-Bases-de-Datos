-- ============================================================================
-- 01_linea_base_insegura.sql
-- Fase: 2.4 (Línea base insegura) — Plan de acción
-- Objetivo: introducir intencionalmente las fallas de configuración que las
--           pruebas de sql/03_verificacion/ deben detectar como "No cumple".
--           Es el estado "antes" del sistema de auditoría en vivo.
-- Conexión: SYSTEM / sys as sysdba, sobre el PDB XEPDB1.
-- ADVERTENCIA: ejecutar solo sobre el esquema de este proyecto (CLINICA) y
--              nunca contra un ambiente productivo. Tomar respaldo antes.
-- ============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- P-09: rol DBA otorgado a una cuenta de aplicación
-- TODO: GRANT DBA TO APP_CLINICA;

-- P-10: privilegio ANY otorgado a un desarrollador
-- TODO: GRANT SELECT ANY TABLE TO DEV_USER;

-- P-02: grant a PUBLIC sobre una tabla sensible
-- TODO: GRANT SELECT ON CLINICA.PACIENTES TO PUBLIC;

-- P-03: grants directos a usuarios en lugar de a través de roles
-- TODO: GRANT SELECT, INSERT, UPDATE ON CLINICA.CITAS TO RECEPCION_01;

-- P-06 / P-07: perfil DEFAULT sin límites y contraseñas débiles
-- TODO: verificar que los usuarios de prueba usan PROFILE DEFAULT (sin perfil dedicado)

-- P-04: cuenta inactiva con estado OPEN
-- TODO: confirmar que EXEMPLEADO_01 (creado en 03_usuarios_y_auditor_app.sql) queda ACCOUNT_STATUS = OPEN

-- P-12 / P-16 / P-19: ausencia de VPD, Data Redaction y políticas de auditoría unificada
-- TODO: documentar (no requiere SQL) que a esta altura no existen políticas DBMS_RLS,
--       DBMS_REDACT ni AUDIT POLICY sobre las tablas de CLINICA.

-- P-22: tablespace sensible sin cifrar
-- TODO: confirmar DBA_TABLESPACES.ENCRYPTED = 'NO' para TS_CLINICA_SENSIBLE

-- P-15: objeto eliminado sin PURGE (queda en recyclebin)
-- TODO: CREATE TABLE CLINICA.TMP_BORRAR AS SELECT * FROM CLINICA.CITAS WHERE 1=0;
-- TODO: DROP TABLE CLINICA.TMP_BORRAR; -- sin PURGE, a propósito

-- P-17: EXECUTE sobre paquetes de red/archivo otorgado a PUBLIC
-- TODO: verificar estado por defecto de UTL_FILE / UTL_HTTP en DBA_TAB_PRIVS y documentarlo
--       (en instalaciones recientes de XE puede venir ya restringido; declarar el hallazgo)

-- P-18: backup RMAN sin cifrar
-- TODO: documentar que CONFIGURE ENCRYPTION FOR DATABASE aún no está en ON

-- P-21: sqlnet.ora sin cifrado de red ni validación de nodos
-- TODO: documentar el contenido original de sqlnet.ora (sin SQLNET.ENCRYPTION_SERVER,
--       sin TCP.VALIDNODE_CHECKING) antes de modificarlo en 02_controles/
