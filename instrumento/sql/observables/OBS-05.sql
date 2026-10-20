-- OBS-05 | A5.17 Informacion de autenticacion (relacionado con A5.16)
-- Cuentas abiertas que conservan la contrasena por defecto de Oracle.
-- Limitacion: DBA_USERS_WITH_DEFPWD solo detecta las contrasenas por defecto
-- conocidas; no puede detectar contrasenas debiles elegidas por la empresa.
-- Alcance: PDB | Version minima: 19
-- Binds: (ninguno)
-- Regla: cada fila es un hallazgo.
SELECT d.username       AS usuario,
       u.account_status AS estado
FROM   dba_users_with_defpwd d
JOIN   dba_users u ON u.username = d.username
WHERE  u.account_status = 'OPEN'
ORDER  BY d.username
