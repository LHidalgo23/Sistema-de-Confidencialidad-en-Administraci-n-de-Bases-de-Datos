-- OBS-12 | A8.3 Restriccion del acceso a la informacion
-- Tablas con columnas sensibles descubiertas que no tienen una politica VPD
-- (DBMS_RLS) habilitada.
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON: [{esquema,tabla,columna,nivel}])
-- Regla: cada fila es un hallazgo.
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
