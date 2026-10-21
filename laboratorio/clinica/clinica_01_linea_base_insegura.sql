-- ============================================================================
-- clinica_01_linea_base_insegura.sql  (LABORATORIO: solo para la demo en clase)
-- Introduce, a proposito, las fallas de configuracion que el instrumento debe
-- OBSERVAR. Es el estado "antes" de la demostracion.
--
-- Ejecutar con SQL*Plus como SYSDBA, despues de clinica_00_esquema_y_datos.sql
-- y de instrumento/onboarding_auditor.sql:
--     sqlplus / as sysdba
--     @clinica_01_linea_base_insegura.sql
--
-- ADVERTENCIA: solo para la PDB_CLINICA de laboratorio. Nunca contra una base
-- real. Hacer respaldo antes de continuar con los correctivos de TDE y sqlnet.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

ALTER SESSION SET CONTAINER = pdb_clinica;

-- OBS-09 | A8.2  Rol DBA en una cuenta de aplicacion
GRANT DBA TO app_clinica;

-- OBS-10 | A8.2  Privilegio ANY para un desarrollador
GRANT SELECT ANY TABLE TO dev_user;

-- OBS-02 | A5.15 Objeto sensible abierto a PUBLIC
GRANT SELECT ON clinica.pacientes TO PUBLIC;

-- OBS-03 | A5.15 Grants directos a usuarios (sin roles)
GRANT SELECT, INSERT, UPDATE ON clinica.pacientes   TO app_clinica;
GRANT SELECT, INSERT, UPDATE ON clinica.expedientes TO app_clinica;
GRANT SELECT, INSERT, UPDATE ON clinica.citas       TO app_clinica;
GRANT SELECT ON clinica.pacientes   TO medico_01;
GRANT SELECT ON clinica.expedientes TO medico_01;
GRANT SELECT ON clinica.citas       TO medico_01;
GRANT SELECT ON clinica.pacientes   TO medico_02;
GRANT SELECT ON clinica.expedientes TO medico_02;
GRANT SELECT ON clinica.citas       TO medico_02;
GRANT SELECT ON clinica.pacientes   TO recepcion_01;
GRANT SELECT, INSERT, UPDATE ON clinica.citas TO recepcion_01;
GRANT SELECT, UPDATE ON clinica.empleados TO rrhh_01;

-- OBS-06 | A5.17 Perfil DEFAULT sin funcion de verificacion (todos los usuarios
--                lo usan: no se crea ningun perfil dedicado).
-- OBS-04 | A5.16 EXEMPLEADO_01 abierto y sin uso (creado en el script anterior).
-- OBS-12/15/18 | Sin VPD, sin Data Redaction y sin politicas de auditoria: se
--                logra con no crearlas.
-- OBS-22 | A8.24 TS_SENSIBLE sin cifrar (por defecto).

-- OBS-05 | A5.16 y A5.17  Cuenta de ejemplo olvidada con la contrasena por defecto de Oracle.
-- (Se mantiene ABIERTA y sin uso: tambien la veran OBS-04 y OBS-13.)
CREATE USER scott IDENTIFIED BY tiger;
GRANT CREATE SESSION TO scott;

-- OBS-23 | A8.33 y A8.31  Clon de desarrollo con datos reales sin enmascarar (R-CONF-04).
-- Vive en TS_SENSIBLE: un clon de datos reales tiene la misma sensibilidad que el original.
CREATE USER clinica_dev NO AUTHENTICATION
  DEFAULT TABLESPACE ts_sensible
  QUOTA UNLIMITED ON ts_sensible;
CREATE TABLE clinica_dev.pacientes TABLESPACE ts_sensible
  AS SELECT * FROM clinica.pacientes;

-- OBS-14 | A8.10 Tabla eliminada sin PURGE: queda en la papelera de reciclaje.
-- Requiere que el parametro RECYCLEBIN este en ON (valor por defecto).
CREATE TABLE clinica.tmp_exportacion TABLESPACE ts_sensible
  AS SELECT * FROM clinica.pacientes WHERE ROWNUM <= 20;
-- Sin PURGE, a proposito:
DROP TABLE clinica.tmp_exportacion;

-- OBS-16 | A8.12 EXECUTE sobre UTL_FILE/UTL_HTTP/UTL_TCP/UTL_SMTP a PUBLIC.
-- En Oracle 21c esos grants vienen por defecto: no hay que crear nada. Verificar:
SELECT table_name, privilege FROM dba_tab_privs
 WHERE grantee = 'PUBLIC' AND privilege = 'EXECUTE'
   AND table_name IN ('UTL_FILE', 'UTL_HTTP', 'UTL_TCP', 'UTL_SMTP');

-- OBS-17 | A8.13 Respaldo RMAN sin cifrar: ejecutar un respaldo sin configurar
--                cifrado (desde RMAN, no desde SQL*Plus).
--   rman target /
--   RMAN> BACKUP DATABASE;
-- OBS-20 | A8.20 sqlnet.ora sin cifrado ni validacion de nodos: guardar una copia
--                del archivo original (ver sqlnet_cambios.md).

PROMPT Papelera de CLINICA (debe mostrar la tabla eliminada):
SELECT original_name, type, droptime FROM dba_recyclebin WHERE owner = 'CLINICA';
