-- OBS-10 | A8.2 Derechos de acceso privilegiado
-- Privilegios de sistema "ANY" (SELECT ANY TABLE, DROP ANY ..., etc.) otorgados
-- a usuarios o roles no administrativos y no mantenidos por Oracle.
-- Limitacion: se observan los grantees directos; un rol propio de la empresa
-- con privilegios ANY aparece como hallazgo en si mismo.
-- Alcance: PDB | Version minima: 19
-- Binds: :cuentas_administrativas (JSON: ["DBA_X", ...])
-- Regla: cada fila es un hallazgo.
SELECT sp.grantee,
       sp.privilege    AS privilegio,
       sp.admin_option AS con_admin_option
FROM   dba_sys_privs sp
WHERE  REGEXP_LIKE(sp.privilege, '(^| )ANY( |$)')
AND    NOT EXISTS (SELECT 1 FROM dba_users u
                   WHERE  u.username = sp.grantee AND u.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1 FROM dba_roles r
                   WHERE  r.role = sp.grantee AND r.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1
                   FROM   JSON_TABLE(TO_CLOB(:cuentas_administrativas), '$[*]'
                            COLUMNS (cuenta VARCHAR2(128) PATH '$')) a
                   WHERE  a.cuenta = sp.grantee)
ORDER  BY sp.grantee, sp.privilege
