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
