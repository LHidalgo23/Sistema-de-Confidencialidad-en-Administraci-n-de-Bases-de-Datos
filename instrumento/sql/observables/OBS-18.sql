WITH habilitadas AS (
  SELECT /*+ MATERIALIZE */ policy_name
  FROM   audit_unified_enabled_policies
),
auditadas AS (
  SELECT /*+ MATERIALIZE */ ap.object_schema,
         ap.object_name
  FROM   audit_unified_policies ap
  WHERE  ap.audit_option_type = 'OBJECT ACTION'
  AND    ap.policy_name IN (SELECT policy_name FROM habilitadas)
)
SELECT DISTINCT s.esquema,
                s.tabla
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla')) s
WHERE  NOT EXISTS (SELECT 1
                   FROM   auditadas a
                   WHERE  a.object_schema = s.esquema
                   AND    a.object_name   = s.tabla)
ORDER  BY s.esquema, s.tabla
