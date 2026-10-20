-- OBS-23 | A8.33 Informacion de prueba (relacionado con A8.31)
-- Columnas sensibles en esquemas no productivos (por convencion de sufijo,
-- p. ej. _DEV, _TEST) sin politica de redaction y sin el marcador de
-- enmascarado en el comentario de la columna.
-- Limitacion: sin leer datos no se puede probar que un enmascarado fisico se
-- haya aplicado; el marcador es una convencion que el DBA registra al
-- enmascarar. La comparacion con la base de produccion es una prueba de
-- laboratorio opcional.
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON), :sufijos_no_productivos (JSON), :marcador_enmascarado
-- Regla: cada fila es un hallazgo.
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
