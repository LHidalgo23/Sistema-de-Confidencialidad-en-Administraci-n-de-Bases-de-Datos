-- OBS-08 | A5.33 Proteccion de registros
-- (1) AUDIT_ADMIN otorgado fuera de las cuentas autorizadas.
-- (2) No existe un trabajo de purga habilitado para la pista de auditoria
--     unificada (la retencion se gestiona con DBMS_AUDIT_MGMT, no con un
--     parametro de "dias de retencion").
-- Alcance: PDB | Version minima: 19
-- Binds: :cuentas_audit_admin_autorizadas (JSON: ["DBA_X", ...])
-- Regla: cada fila es un hallazgo.
SELECT 'AUDIT_ADMIN'      AS tipo,
       rp.grantee         AS grantee
FROM   dba_role_privs rp
WHERE  rp.granted_role = 'AUDIT_ADMIN'
AND    NOT EXISTS (SELECT 1 FROM dba_users u
                   WHERE  u.username = rp.grantee AND u.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1 FROM dba_roles r
                   WHERE  r.role = rp.grantee AND r.oracle_maintained = 'Y')
AND    NOT EXISTS (SELECT 1
                   FROM   JSON_TABLE(TO_CLOB(:cuentas_audit_admin_autorizadas), '$[*]'
                            COLUMNS (cuenta VARCHAR2(128) PATH '$')) a
                   WHERE  a.cuenta = rp.grantee)
UNION ALL
SELECT 'RETENCION'        AS tipo,
       CAST(NULL AS VARCHAR2(128)) AS grantee
FROM   dual
WHERE  NOT EXISTS (SELECT 1
                   FROM   dba_audit_mgmt_cleanup_jobs j
                   WHERE  j.job_status = 'ENABLED'
                   AND   (j.audit_trail LIKE '%UNIFIED%' OR j.audit_trail LIKE 'ALL%'))
