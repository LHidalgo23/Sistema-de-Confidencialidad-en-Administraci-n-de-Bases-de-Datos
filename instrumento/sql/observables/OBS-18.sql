-- OBS-18 | A8.15 Registro
-- Tablas con columnas sensibles descubiertas que no estan cubiertas por una
-- politica de auditoria unificada habilitada sobre acciones del objeto.
-- Rendimiento: AUDIT_UNIFIED_POLICIES es una vista costosa. Se materializan una
-- sola vez las politicas habilitadas y, de ellas, las que auditan objetos; sin eso
-- la vista se evaluaba una vez por tabla (de 2 s a 9 s en una instancia pequena).
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON: [{esquema,tabla,columna,nivel}])
-- Regla: cada fila es un hallazgo.
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
