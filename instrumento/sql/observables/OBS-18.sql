-- OBS-18 | A8.15 Registro
-- Tablas con columnas sensibles descubiertas que no estan cubiertas por una
-- politica de auditoria unificada habilitada sobre acciones del objeto.
-- Alcance: PDB | Version minima: 19
-- Binds: :columnas_sensibles (JSON: [{esquema,tabla,columna,nivel}])
-- Regla: cada fila es un hallazgo.
SELECT DISTINCT s.esquema,
                s.tabla
FROM   JSON_TABLE(TO_CLOB(:columnas_sensibles), '$[*]'
         COLUMNS (esquema VARCHAR2(128) PATH '$.esquema',
                  tabla   VARCHAR2(128) PATH '$.tabla')) s
WHERE  NOT EXISTS (SELECT 1
                   FROM   audit_unified_policies ap
                   JOIN   audit_unified_enabled_policies ep
                          ON ep.policy_name = ap.policy_name
                   WHERE  ap.object_schema     = s.esquema
                   AND    ap.object_name       = s.tabla
                   AND    ap.audit_option_type = 'OBJECT ACTION')
ORDER  BY s.esquema, s.tabla
