-- ============================================================================
-- clinica_99_reiniciar_laboratorio.sql   (LABORATORIO: solo para la demo en clase)
-- Deja la PDB_CLINICA sin los objetos del laboratorio (esquema, usuarios y
-- tablespaces de la clinica) para repetir la demostracion desde cero. NO borra la
-- PDB ni el usuario AUDITOR_ISO del instrumento.
--
-- Ejecutar con SQL*Plus como SYSDBA:
--     sqlplus / as sysdba
--     @clinica_99_reiniciar_laboratorio.sql
-- ============================================================================

-- Los objetos que no existan simplemente se omiten.
WHENEVER SQLERROR CONTINUE

ALTER SESSION SET CONTAINER = pdb_clinica;

DROP USER app_clinica   CASCADE;
DROP USER medico_01     CASCADE;
DROP USER medico_02     CASCADE;
DROP USER recepcion_01  CASCADE;
DROP USER rrhh_01       CASCADE;
DROP USER dev_user      CASCADE;
DROP USER exempleado_01 CASCADE;
DROP USER dba_jsanchez  CASCADE;
DROP USER clinica_dev   CASCADE;
DROP USER clinica       CASCADE;

PURGE DBA_RECYCLEBIN;

DROP TABLESPACE ts_clinica   INCLUDING CONTENTS AND DATAFILES;
DROP TABLESPACE ts_sensible  INCLUDING CONTENTS AND DATAFILES;

PROMPT Usuarios y tablespaces restantes de la clinica (debe salir vacio):
SELECT username FROM dba_users
 WHERE username IN ('APP_CLINICA','MEDICO_01','MEDICO_02','RECEPCION_01','RRHH_01','DEV_USER','EXEMPLEADO_01','DBA_JSANCHEZ','CLINICA_DEV','CLINICA');
SELECT tablespace_name FROM dba_tablespaces WHERE tablespace_name IN ('TS_CLINICA','TS_SENSIBLE');
