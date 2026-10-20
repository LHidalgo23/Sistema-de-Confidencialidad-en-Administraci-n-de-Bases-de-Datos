-- OBS-24 | A8.8 Gestion de vulnerabilidades tecnicas
-- Version del motor y antiguedad del ultimo parche SQL aplicado con exito.
-- Es hallazgo si no hay parches registrados o el ultimo supera
-- :dias_max_sin_parche. La antiguedad se mide desde que se aplico, no desde que
-- Oracle publico el parche: es una aproximacion documentada.
-- En Oracle XE no se distribuyen Release Updates trimestrales: el hallazgo se
-- gestiona como aceptacion de riesgo documentada (estado Parcial justificado).
-- Alcance: Instancia | Version minima: 19
-- Binds: :dias_max_sin_parche (numero)
-- Regla: cada fila es un hallazgo.
SELECT v.banner                                               AS version,
       NVL(TO_CHAR(MAX(r.action_time), 'YYYY-MM-DD'), 'SIN REGISTRO') AS ultimo_parche,
       NVL(TO_CHAR(TRUNC(SYSDATE - CAST(MAX(r.action_time) AS DATE))), 'N/D') AS dias
FROM  (SELECT banner FROM v$version WHERE ROWNUM = 1) v
LEFT JOIN dba_registry_sqlpatch r
       ON r.action = 'APPLY'
      AND r.status = 'SUCCESS'
GROUP BY v.banner
HAVING MAX(r.action_time) IS NULL
    OR MAX(r.action_time) < SYSTIMESTAMP - NUMTODSINTERVAL(:dias_max_sin_parche, 'DAY')
