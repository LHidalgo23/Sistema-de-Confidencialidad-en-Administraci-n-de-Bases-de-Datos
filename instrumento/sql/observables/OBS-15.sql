-- OBS-15 | A8.11 Enmascaramiento de datos
-- Columnas sensibles descubiertas sin una politica de Data Redaction habilitada.
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON: [{esquema,tabla,columna,nivel}])
-- Regla: cada fila es un hallazgo.
SELECT s.esquema,
       s.tabla,
       s.columna
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla',
                  columna VARCHAR2(128) PATH '$.columna')) s
WHERE  NOT EXISTS (SELECT 1
                   FROM   redaction_columns rc
                   JOIN   redaction_policies rp
                          ON  rp.object_owner = rc.object_owner
                          AND rp.object_name  = rc.object_name
                   WHERE  rc.object_owner = s.esquema
                   AND    rc.object_name  = s.tabla
                   AND    rc.column_name  = s.columna
                   AND    rp.enable       = 'YES')
ORDER  BY s.esquema, s.tabla, s.columna
