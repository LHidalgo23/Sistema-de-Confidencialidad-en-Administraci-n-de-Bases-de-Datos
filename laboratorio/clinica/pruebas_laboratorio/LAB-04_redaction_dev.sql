-- LAB-04 | A8.11 | Data Redaction: el desarrollador no ve datos reales
-- Conectado como DEV_USER (SQL*Plus):
--   CONNECT dev_user@localhost:1521/pdb_clinica
-- En la linea base DEV_USER tiene SELECT ANY TABLE y ve los datos en claro.
-- Despues de revocar ese privilegio, otorgarle SELECT sobre el esquema de
-- pruebas y aplicar la politica de redaction, la cedula, el salario y el IBAN
-- salen redactados (redaction FULL: espacio / 0).
SELECT cedula, correo FROM clinica.pacientes WHERE ROWNUM <= 3;
SELECT salario, iban   FROM clinica.empleados WHERE ROWNUM <= 3;
