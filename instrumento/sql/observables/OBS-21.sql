-- OBS-21 | A8.24 Uso de criptografia
-- El keystore (wallet) de TDE no esta abierto. 'OPEN_NO_MASTER_KEY' tambien es
-- hallazgo: el keystore esta abierto pero no hay llave maestra para cifrar.
-- Alcance: Instancia/PDB | Version minima: 19
-- Binds: (ninguno)
-- Regla: cada fila con NO_EVALUABLE nulo es un hallazgo.
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
