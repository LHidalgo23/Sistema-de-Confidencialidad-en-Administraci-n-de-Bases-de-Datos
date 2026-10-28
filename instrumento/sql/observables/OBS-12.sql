SELECT DISTINCT s.esquema,
                s.tabla
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla')) s
WHERE  NOT EXISTS (SELECT 1
                   FROM   dba_policies pol
                   WHERE  pol.object_owner = s.esquema
                   AND    pol.object_name  = s.tabla
                   AND    pol.enable       = 'YES')
ORDER  BY s.esquema, s.tabla
