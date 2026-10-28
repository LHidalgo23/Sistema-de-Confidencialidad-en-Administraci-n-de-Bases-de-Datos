SELECT u.username                                   AS usuario,
       u.account_status                             AS estado,
       NVL(TO_CHAR(u.last_login, 'YYYY-MM-DD HH24:MI'), 'NUNCA') AS ultimo_acceso,
       TO_CHAR(u.created, 'YYYY-MM-DD')             AS creado
FROM   dba_users u
WHERE  u.oracle_maintained = 'N'
AND    u.account_status = 'OPEN'
AND    u.authentication_type <> 'NONE'
AND    u.common = 'NO'
AND    (   (u.last_login IS NOT NULL
            AND u.last_login < SYSTIMESTAMP - NUMTODSINTERVAL(:dias_inactividad, 'DAY'))
        OR (u.last_login IS NULL
            AND u.created < SYSDATE - :dias_inactividad))
ORDER  BY u.username
