SELECT w.status                    AS estado,
       w.wrl_parameter             AS ubicacion,
       w.wallet_type               AS tipo_wallet,
       CAST(NULL AS VARCHAR2(200)) AS no_evaluable
FROM   v$encryption_wallet w
WHERE  w.status <> 'OPEN'
UNION ALL
SELECT CAST(NULL AS VARCHAR2(30)),
       CAST(NULL AS VARCHAR2(4000)),
       CAST(NULL AS VARCHAR2(20)),
       'V$ENCRYPTION_WALLET no devolvio filas'
FROM   dual
WHERE  NOT EXISTS (SELECT 1 FROM v$encryption_wallet)
