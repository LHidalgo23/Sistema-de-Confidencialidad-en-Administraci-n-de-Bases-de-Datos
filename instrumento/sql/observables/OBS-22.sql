-- OBS-22 | A8.24 Uso de criptografia
-- Columnas sensibles ubicadas en tablespaces sin cifrar y sin cifrado TDE a
-- nivel de columna. La ubicacion se obtiene de DBA_TABLES y, para tablas
-- particionadas, de DBA_TAB_PARTITIONS.
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON: [{esquema,tabla,columna,nivel}])
-- Regla: cada fila es un hallazgo.
WITH ubicacion AS (
  SELECT t.owner AS esquema, t.table_name AS tabla, t.tablespace_name AS tablespace
  FROM   dba_tables t
  WHERE  t.tablespace_name IS NOT NULL
  UNION
  SELECT p.table_owner, p.table_name, p.tablespace_name
  FROM   dba_tab_partitions p
  WHERE  p.tablespace_name IS NOT NULL
)
SELECT DISTINCT
       s.esquema,
       s.tabla,
       s.columna,
       u.tablespace
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla',
                  columna VARCHAR2(128) PATH '$.columna')) s
JOIN   ubicacion u
       ON u.esquema = s.esquema AND u.tabla = s.tabla
JOIN   dba_tablespaces ts
       ON ts.tablespace_name = u.tablespace
WHERE  ts.encrypted <> 'YES'
AND    NOT EXISTS (SELECT 1
                   FROM   dba_encrypted_columns ec
                   WHERE  ec.owner       = s.esquema
                   AND    ec.table_name  = s.tabla
                   AND    ec.column_name = s.columna)
ORDER  BY s.esquema, s.tabla, s.columna
