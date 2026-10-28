SELECT s.esquema,
       s.tabla,
       s.columna,
       :marcador_enmascarado AS marcador
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla',
                  columna VARCHAR2(128) PATH '$.columna')) s
WHERE  EXISTS (SELECT 1
               FROM   JSON_TABLE(TO_CLOB(:sufijos_no_productivos), '$[*]'
                        COLUMNS (sufijo VARCHAR2(64) PATH '$')) x
               WHERE  UPPER(SUBSTR(s.esquema, -LENGTH(x.sufijo))) = UPPER(x.sufijo))
AND    NOT EXISTS (SELECT 1
                   FROM   redaction_columns rc
                   WHERE  rc.object_owner = s.esquema
                   AND    rc.object_name  = s.tabla
                   AND    rc.column_name  = s.columna)
AND    NOT EXISTS (SELECT 1
                   FROM   dba_col_comments c
                   WHERE  c.owner       = s.esquema
                   AND    c.table_name  = s.tabla
                   AND    c.column_name = s.columna
                   AND    INSTR(UPPER(c.comments), UPPER(:marcador_enmascarado)) > 0)
ORDER  BY s.esquema, s.tabla, s.columna
