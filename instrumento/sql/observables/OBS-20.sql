-- OBS-20 | A8.20 Seguridad de redes
-- Sesiones de usuario sin evidencia del adaptador de cifrado nativo de Oracle
-- Net en V$SESSION_CONNECT_INFO.
-- Limitacion conocida: una sesion TLS (protocolo tcps) no muestra el adaptador
-- de cifrado nativo y aparecera aqui; el auditor debe confirmarla con
-- SYS_CONTEXT('USERENV','NETWORK_PROTOCOL') desde la propia sesion.
-- Alcance: Instancia | Version minima: 19
-- Binds: (ninguno)
-- Regla: cada fila es un hallazgo.
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
