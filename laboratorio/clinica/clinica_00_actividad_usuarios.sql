-- ============================================================================
-- clinica_00_actividad_usuarios.sql   (LABORATORIO: solo para la demo en clase)
-- Simula actividad reciente: todos los usuarios de la clinica inician sesion una
-- vez, salvo EXEMPLEADO_01, que queda abierto y sin uso.
--
-- Por que existe: DBA_USERS.LAST_LOGIN solo se actualiza al iniciar sesion y no se
-- puede falsear. El observable OBS-04 marca como inactiva toda cuenta abierta sin
-- uso en mas de :dias_inactividad dias; si los usuarios de laboratorio no inician
-- sesion, todos aparecerian como inactivos y el hallazgo intencional (EXEMPLEADO_01)
-- se perderia entre el ruido. Ejecutar este script ANTES de cada observacion.
--
-- Ejecutar con SQL*Plus como SYSDBA:
--     sqlplus / as sysdba
--     @clinica_00_actividad_usuarios.sql
-- ============================================================================

ACCEPT clave_lab CHAR PROMPT 'Contrasena de laboratorio de los usuarios de la clinica (oculta): ' HIDE
ACCEPT clave_pdbadmin CHAR PROMPT 'Contrasena de PDBADMIN, el administrador de la PDB (oculta): ' HIDE

CONNECT app_clinica/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT medico_01/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT medico_02/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT recepcion_01/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT rrhh_01/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT dev_user/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT dba_lhidalgo/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT pdbadmin/"&clave_pdbadmin"@localhost:1521/pdb_clinica

CONNECT / AS SYSDBA
ALTER SESSION SET CONTAINER = pdb_clinica;
UNDEFINE clave_lab
UNDEFINE clave_pdbadmin

PROMPT Ultimo inicio de sesion de los usuarios de la clinica (EXEMPLEADO_01 debe estar vacio):
SELECT username, TO_CHAR(last_login, 'YYYY-MM-DD HH24:MI') AS ultimo_acceso
FROM   dba_users
WHERE  username IN ('APP_CLINICA','MEDICO_01','MEDICO_02','RECEPCION_01','RRHH_01','DEV_USER','EXEMPLEADO_01','DBA_LHIDALGO','PDBADMIN')
ORDER  BY username;
