SELECT u.username          AS usuario,
       TRIM(u.password_versions) AS versiones
FROM   dba_users u
WHERE  u.oracle_maintained = 'N'
AND    u.authentication_type = 'PASSWORD'
AND    (u.password_versions IS NULL
        OR INSTR(u.password_versions, '10G') > 0
        OR INSTR(u.password_versions, '11G') > 0)
ORDER  BY u.username
