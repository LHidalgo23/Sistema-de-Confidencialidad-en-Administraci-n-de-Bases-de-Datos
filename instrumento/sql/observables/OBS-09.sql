-- OBS-09 | A8.2 Derechos de acceso privilegiado
-- Rol DBA otorgado fuera de las cuentas autorizadas. Se excluyen las cuentas y
-- roles mantenidos por Oracle (SYS, SYSTEM, ...). Se usa NOT EXISTS y no
-- NOT IN: un solo NULL en la lista haria que NOT IN no devolviera ninguna fila
-- y ocultaria todos los hallazgos.
-- Alcance: PDB | Version minima: 19
-- Binds: :cuentas_dba_autorizadas (JSON: ["DBA_X", ...])
-- Regla: cada fila es un hallazgo.
SELECT rp.grantee,
       rp.admin_option AS con_admin_option
FROM   dba_role_privs rp
WHERE  rp.granted_role = 'DBA'
AND    NOT EXISTS (SELECT 1 FROM dba_users u
                   WHERE  u.username = rp.grantee AND u.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1 FROM dba_roles r
                   WHERE  r.role = rp.grantee AND r.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1
                   FROM   JSON_TABLE(TO_CLOB(:cuentas_dba_autorizadas), '$[*]'
                            COLUMNS (cuenta VARCHAR2(128) PATH '$')) a
                   WHERE  a.cuenta = rp.grantee)
ORDER  BY rp.grantee
