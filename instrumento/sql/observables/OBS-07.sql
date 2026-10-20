-- OBS-07 | A5.18 Derechos de acceso
-- Privilegios de sistema otorgados directamente a cuentas de negocio, mas alla
-- de la lista permitida por la empresa (por defecto solo CREATE SESSION).
-- Los privilegios de sistema deben llegar por roles funcionales revisables.
-- Alcance: PDB | Version minima: 19
-- Binds: :privilegios_sistema_permitidos (JSON: ["CREATE SESSION", ...])
-- Regla: cada fila es un hallazgo.
SELECT sp.grantee,
       sp.privilege    AS privilegio,
       sp.admin_option AS con_admin_option
FROM   dba_sys_privs sp
JOIN   dba_users u ON u.username = sp.grantee
WHERE  u.oracle_maintained = 'N'
AND    NOT EXISTS (SELECT 1
                   FROM   JSON_TABLE(TO_CLOB(:privilegios_sistema_permitidos), '$[*]'
                            COLUMNS (privilegio VARCHAR2(128) PATH '$')) a
                   WHERE  a.privilegio = sp.privilege)
ORDER  BY sp.grantee, sp.privilege
