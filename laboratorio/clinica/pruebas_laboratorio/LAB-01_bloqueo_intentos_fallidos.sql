-- LAB-01 | A5.17 | Bloqueo tras intentos fallidos
-- Ejecutar con SQL*Plus. El numero de intentos que bloquea la cuenta lo define
-- FAILED_LOGIN_ATTEMPTS del perfil: en el perfil DEFAULT de 21c son 10; tras el
-- correctivo de OBS-06 deben ser 5.
-- Esperado despues de los correctivos: la cuenta queda LOCKED(TIMED).
CONNECT medico_02/clave_incorrecta@localhost:1521/pdb_clinica
CONNECT medico_02/clave_incorrecta@localhost:1521/pdb_clinica
CONNECT medico_02/clave_incorrecta@localhost:1521/pdb_clinica
CONNECT medico_02/clave_incorrecta@localhost:1521/pdb_clinica
CONNECT medico_02/clave_incorrecta@localhost:1521/pdb_clinica
CONNECT medico_02/clave_incorrecta@localhost:1521/pdb_clinica

CONNECT / AS SYSDBA
ALTER SESSION SET CONTAINER = pdb_clinica;
SELECT username, account_status, lock_date FROM dba_users WHERE username = 'MEDICO_02';

-- Restaurar la cuenta para continuar con la demostracion:
-- ALTER USER medico_02 ACCOUNT UNLOCK;
