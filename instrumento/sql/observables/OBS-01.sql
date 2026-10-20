-- OBS-01 | A5.12 Clasificacion de la informacion
-- Columnas sensibles descubiertas que no tienen clasificacion registrada.
-- La clasificacion se registra como comentario de columna que contiene el
-- marcador configurado (parametro marcador_clasificacion).
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON: [{esquema,tabla,columna,nivel}]), :marcador_clasificacion
-- Regla: cada fila es un hallazgo.
SELECT s.esquema,
       s.tabla,
       s.columna,
       s.nivel,
       :marcador_clasificacion        AS marcador,
       NVL(c.comments, '')            AS comentario_actual
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla',
                  columna VARCHAR2(128) PATH '$.columna',
                  nivel   VARCHAR2(64)  PATH '$.nivel')) s
LEFT JOIN dba_col_comments c
       ON c.owner = s.esquema
      AND c.table_name = s.tabla
      AND c.column_name = s.columna
WHERE  c.comments IS NULL
   OR  INSTR(UPPER(c.comments), UPPER(:marcador_clasificacion)) = 0
ORDER  BY s.esquema, s.tabla, s.columna
