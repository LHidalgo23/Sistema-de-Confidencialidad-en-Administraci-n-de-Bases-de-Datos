-- ============================================================================
-- clinica_98_migrar_dba_lhidalgo.sql      (LABORATORIO: se ejecuta UNA sola vez)
-- Renombra el DBA nominal de la clinica, DBA_JSANCHEZ, a DBA_LHIDALGO en una
-- PDB_CLINICA que ya estaba montada. Las instalaciones nuevas no lo necesitan:
-- clinica_00_esquema_y_datos.sql ya crea DBA_LHIDALGO.
--
-- Oracle no permite renombrar usuarios, asi que el script:
--   1. crea DBA_LHIDALGO con la misma contrasena de laboratorio;
--   2. le copia todos los roles, privilegios de sistema y privilegios sobre
--      objetos que tenia DBA_JSANCHEZ (incluidos los que agregara un escenario);
--   3. borra DBA_JSANCHEZ (no posee objetos de la clinica).
-- Si se ejecuta dos veces no falla: cada paso comprueba si ya se hizo.
--
-- Ejecutar con SQL*Plus como SYSDBA (cerrar antes las sesiones de DBA_JSANCHEZ,
-- por ejemplo en SQL Developer):
--     sqlplus / as sysdba
--     @clinica_98_migrar_dba_lhidalgo.sql
-- Despues: ejecutar clinica_00_actividad_usuarios.sql (para que DBA_LHIDALGO tenga un
-- inicio de sesion y OBS-04 no lo marque como inactivo), cambiar el perfil de la
-- empresa en el Pre-vuelo y volver a observar.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK
SET SERVEROUTPUT ON

ALTER SESSION SET CONTAINER = pdb_clinica;

ACCEPT clave_lab CHAR PROMPT 'Contrasena de laboratorio de los usuarios de la clinica (oculta): ' HIDE

DECLARE
  existe NUMBER;
BEGIN
  -- 1. Crear DBA_LHIDALGO
  SELECT COUNT(*) INTO existe FROM dba_users WHERE username = 'DBA_LHIDALGO';
  IF existe = 0 THEN
    EXECUTE IMMEDIATE 'CREATE USER dba_lhidalgo IDENTIFIED BY "&clave_lab"';
    DBMS_OUTPUT.PUT_LINE('Creado DBA_LHIDALGO');
  ELSE
    DBMS_OUTPUT.PUT_LINE('DBA_LHIDALGO ya existia');
  END IF;
  EXECUTE IMMEDIATE 'GRANT CREATE SESSION TO dba_lhidalgo';

  SELECT COUNT(*) INTO existe FROM dba_users WHERE username = 'DBA_JSANCHEZ';
  IF existe = 0 THEN
    DBMS_OUTPUT.PUT_LINE('DBA_JSANCHEZ ya no existe: no hay nada que copiar');
    RETURN;
  END IF;

  -- 2. Copiar roles, privilegios de sistema y privilegios sobre objetos
  FOR r IN (SELECT granted_role, admin_option FROM dba_role_privs WHERE grantee = 'DBA_JSANCHEZ') LOOP
    EXECUTE IMMEDIATE 'GRANT "' || r.granted_role || '" TO dba_lhidalgo'
                      || CASE r.admin_option WHEN 'YES' THEN ' WITH ADMIN OPTION' END;
    DBMS_OUTPUT.PUT_LINE('Rol copiado: ' || r.granted_role);
  END LOOP;

  FOR p IN (SELECT privilege, admin_option FROM dba_sys_privs WHERE grantee = 'DBA_JSANCHEZ') LOOP
    EXECUTE IMMEDIATE 'GRANT ' || p.privilege || ' TO dba_lhidalgo'
                      || CASE p.admin_option WHEN 'YES' THEN ' WITH ADMIN OPTION' END;
    DBMS_OUTPUT.PUT_LINE('Privilegio copiado: ' || p.privilege);
  END LOOP;

  FOR o IN (SELECT owner, table_name, privilege, grantable FROM dba_tab_privs WHERE grantee = 'DBA_JSANCHEZ') LOOP
    EXECUTE IMMEDIATE 'GRANT ' || o.privilege || ' ON "' || o.owner || '"."' || o.table_name || '" TO dba_lhidalgo'
                      || CASE o.grantable WHEN 'YES' THEN ' WITH GRANT OPTION' END;
    DBMS_OUTPUT.PUT_LINE('Privilegio sobre objeto copiado: ' || o.privilege || ' ON ' || o.owner || '.' || o.table_name);
  END LOOP;

  -- 3. Borrar el usuario anterior
  EXECUTE IMMEDIATE 'DROP USER dba_jsanchez CASCADE';
  DBMS_OUTPUT.PUT_LINE('Borrado DBA_JSANCHEZ');
END;
/

UNDEFINE clave_lab

PROMPT Estado final (debe aparecer DBA_LHIDALGO con el rol DBA y ya no DBA_JSANCHEZ):
SELECT u.username, u.account_status, r.granted_role
FROM   dba_users u
LEFT   JOIN dba_role_privs r ON r.grantee = u.username
WHERE  u.username IN ('DBA_LHIDALGO', 'DBA_JSANCHEZ')
ORDER  BY u.username, r.granted_role;
