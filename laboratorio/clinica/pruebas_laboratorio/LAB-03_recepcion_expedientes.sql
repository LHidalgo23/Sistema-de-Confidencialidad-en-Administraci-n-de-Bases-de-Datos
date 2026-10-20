-- LAB-03 | A8.3 | Recepcion no debe poder leer expedientes clinicos
-- Conectado como RECEPCION_01 (SQL*Plus):
--   CONNECT recepcion_01@localhost:1521/pdb_clinica
-- Esperado: ORA-00942 (la tabla no es visible: el usuario no tiene ningun grant
-- sobre EXPEDIENTES, ni directo ni por rol).
SELECT * FROM clinica.expedientes;
