-- OBS-16 | A8.12 Prevencion de fuga de datos
-- (1) EXECUTE sobre paquetes de salida (UTL_FILE, UTL_HTTP, ...) otorgado a PUBLIC.
-- (2) Objetos DIRECTORY con privilegios otorgados a PUBLIC.
-- (3) Roles de Data Pump (exportacion/importacion completa) fuera de las
--     cuentas administrativas.
-- Alcance: PDB | Version minima: 19
-- Binds: :paquetes_restringidos (JSON), :cuentas_administrativas (JSON)
-- Regla: cada fila es un hallazgo.
SELECT 'PAQUETE'        AS tipo,
       p.grantee        AS grantee,
       p.table_name     AS objeto,
       p.privilege      AS privilegio
FROM   dba_tab_privs p
WHERE  p.grantee = 'PUBLIC'
AND    p.privilege = 'EXECUTE'
AND    EXISTS (SELECT 1
               FROM   JSON_TABLE(TO_CLOB(:paquetes_restringidos), '$[*]'
                        COLUMNS (paquete VARCHAR2(128) PATH '$')) m
               WHERE  m.paquete = p.table_name)
UNION ALL
SELECT 'DIRECTORIO',
       p.grantee,
       p.table_name,
       p.privilege
FROM   dba_tab_privs p
JOIN   dba_directories d ON d.directory_name = p.table_name
WHERE  p.grantee = 'PUBLIC'
UNION ALL
SELECT 'DATAPUMP',
       rp.grantee,
       rp.granted_role,
       'ROL'
FROM   dba_role_privs rp
WHERE  rp.granted_role IN ('DATAPUMP_EXP_FULL_DATABASE', 'DATAPUMP_IMP_FULL_DATABASE',
                           'EXP_FULL_DATABASE', 'IMP_FULL_DATABASE')
AND    NOT EXISTS (SELECT 1 FROM dba_users u
                   WHERE  u.username = rp.grantee AND u.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1 FROM dba_roles r
                   WHERE  r.role = rp.grantee AND r.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1
                   FROM   JSON_TABLE(TO_CLOB(:cuentas_administrativas), '$[*]'
                            COLUMNS (cuenta VARCHAR2(128) PATH '$')) a
                   WHERE  a.cuenta = rp.grantee)
ORDER  BY 1, 2, 3
