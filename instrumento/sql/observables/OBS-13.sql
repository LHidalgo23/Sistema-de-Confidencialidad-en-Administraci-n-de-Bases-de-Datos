-- OBS-13 | A8.5 Autenticacion segura
-- Cuentas de negocio con contrasena almacenada con versiones de hash antiguas
-- (10G/11G). Las cuentas con autenticacion externa o global no tienen hash.
-- Alcance: PDB | Version minima: 19
-- Binds: (ninguno)
-- Regla: cada fila es un hallazgo.
SELECT u.username          AS usuario,
       TRIM(u.password_versions) AS versiones
FROM   dba_users u
WHERE  u.oracle_maintained = 'N'
AND    u.authentication_type = 'PASSWORD'
AND    (u.password_versions IS NULL
        OR INSTR(u.password_versions, '10G') > 0
        OR INSTR(u.password_versions, '11G') > 0)
ORDER  BY u.username
