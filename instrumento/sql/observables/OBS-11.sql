SELECT 'AUDIT_SYS_OPERATIONS'  AS tipo,
       p.name                  AS objeto,
       p.value                 AS actual,
       CAST(NULL AS VARCHAR2(200)) AS no_evaluable
FROM   v$parameter p
WHERE  p.name = 'audit_sys_operations'
AND    UPPER(p.value) <> 'TRUE'
UNION ALL
SELECT 'PWFILE',
       u.username,
       'SYSDBA=' || u.sysdba || ' SYSOPER=' || u.sysoper || ' SYSBACKUP=' || u.sysbackup,
       CAST(NULL AS VARCHAR2(200))
FROM   v$pwfile_users u
WHERE  NOT EXISTS (SELECT 1
                   FROM   JSON_TABLE(TO_CLOB(:cuentas_pwfile_autorizadas), '$[*]'
                            COLUMNS (cuenta VARCHAR2(128) PATH '$')) a
                   WHERE  a.cuenta = u.username)
UNION ALL
SELECT 'AUDIT_SYS_OPERATIONS',
       CAST(NULL AS VARCHAR2(128)),
       CAST(NULL AS VARCHAR2(4000)),
       'El parametro audit_sys_operations no es visible desde este contenedor'
FROM   dual
WHERE  NOT EXISTS (SELECT 1 FROM v$parameter WHERE name = 'audit_sys_operations')
