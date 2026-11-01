-- ============================================================================
-- bncr_00_crear_pdb.sql               (LABORATORIO: solo para la demo en clase)
-- Crea la PDB de la empresa ficticia "BNCR" (banco de demostracion).
--
-- Ejecutar con SQL*Plus conectado como SYSDBA al contenedor raiz:
--     sqlplus / as sysdba
--     @bncr_00_crear_pdb.sql
--
-- Ajustar &ruta_oradata a la carpeta de datos de la instancia, con las mayusculas
-- exactas de V$DATAFILE (en esta maquina C:\APP\CALVO\PRODUCT\21C\ORADATA\XE;
-- se consulta con SELECT name FROM v$datafile WHERE con_id = 2). Como no hay OMF
-- (DB_CREATE_FILE_DEST vacio), FILE_NAME_CONVERT es obligatorio.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

DEFINE ruta_oradata = 'C:\APP\CALVO\PRODUCT\21C\ORADATA\XE'

PROMPT Esta sesion debe estar en CDB$ROOT:
SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS contenedor FROM dual;

ACCEPT clave_pdbadmin CHAR PROMPT 'Contrasena para PDBADMIN, administrador de la PDB (oculta): ' HIDE

CREATE PLUGGABLE DATABASE pdb_bncr
  ADMIN USER pdbadmin IDENTIFIED BY "&clave_pdbadmin"
  FILE_NAME_CONVERT = ('&ruta_oradata\pdbseed\', '&ruta_oradata\pdb_bncr\');

ALTER PLUGGABLE DATABASE pdb_bncr OPEN;
-- Que la PDB se abra sola cuando la instancia reinicie.
ALTER PLUGGABLE DATABASE pdb_bncr SAVE STATE;
ALTER SYSTEM REGISTER;

UNDEFINE clave_pdbadmin

PROMPT PDBs de la instancia:
SELECT name, open_mode FROM v$pdbs ORDER BY con_id;
PROMPT Servicio para conectarse a la PDB: localhost:1521/pdb_bncr
