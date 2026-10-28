SELECT s.username   AS usuario,
       s.sid        AS sid,
       s.serial#    AS serial,
       s.program    AS programa,
       s.machine    AS maquina
FROM   v$session s
WHERE  s.type = 'USER'
AND    s.username IS NOT NULL
AND    NOT EXISTS (SELECT 1
                   FROM   v$session_connect_info ci
                   WHERE  ci.sid = s.sid
                   AND    ci.serial# = s.serial#
                   AND    ci.network_service_banner LIKE '%Encryption service adapter%')
ORDER  BY s.username, s.sid
