-- ============================================================================
-- clinica_00_crear_pdb.sql            (LABORATORIO: solo para la demo en clase)
-- Crea la PDB de la empresa ficticia "Clinica Los Robles S.A.".
--
-- Ejecutar con SQL*Plus conectado como SYSDBA al contenedor raiz:
--     sqlplus / as sysdba
--     @clinica_00_crear_pdb.sql
--
-- Ajustar &ruta_oradata a la carpeta de datos de la instancia (en esta maquina
-- se observo C:\app\calvo\product\21c\oradata\XE). Como no hay OMF
-- (DB_CREATE_FILE_DEST vacio), FILE_NAME_CONVERT es obligatorio.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

DEFINE ruta_oradata = 'C:\app\calvo\product\21c\oradata\XE'

PROMPT Esta sesion debe estar en CDB$ROOT:
SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS contenedor FROM dual;

ACCEPT clave_pdbadmin CHAR PROMPT 'Contrasena para PDBADMIN, administrador de la PDB (oculta): ' HIDE

CREATE PLUGGABLE DATABASE pdb_clinica
  ADMIN USER pdbadmin IDENTIFIED BY "&clave_pdbadmin"
  FILE_NAME_CONVERT = ('&ruta_oradata\pdbseed\', '&ruta_oradata\pdb_clinica\');

ALTER PLUGGABLE DATABASE pdb_clinica OPEN;
-- Que la PDB se abra sola cuando la instancia reinicie.
ALTER PLUGGABLE DATABASE pdb_clinica SAVE STATE;
ALTER SYSTEM REGISTER;

UNDEFINE clave_pdbadmin

PROMPT PDBs de la instancia:
SELECT name, open_mode FROM v$pdbs ORDER BY con_id;
PROMPT Servicio para conectarse a la PDB: localhost:1521/pdb_clinica
