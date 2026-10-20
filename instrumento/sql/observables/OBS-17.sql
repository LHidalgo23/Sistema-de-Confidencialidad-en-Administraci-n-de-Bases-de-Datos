-- OBS-17 | A8.13 Respaldo de la informacion
-- Piezas de respaldo recientes que no estan cifradas. Si no hay ninguna pieza
-- visible en la ventana, se devuelve NO_EVALUABLE: desde una PDB el catalogo de
-- RMAN puede no ser visible y reportar "sin respaldos" seria un falso hallazgo.
-- Alcance: Instancia | Version minima: 19
-- Binds: :dias_backup_reciente (numero)
-- Regla: cada fila con NO_EVALUABLE nulo es un hallazgo.
SELECT TO_CHAR(bp.recid)                                  AS pieza,
       bp.handle                                          AS manejador,
       TO_CHAR(bp.completion_time, 'YYYY-MM-DD HH24:MI')  AS finalizado,
       CAST(NULL AS VARCHAR2(200))                        AS no_evaluable
FROM   v$backup_piece bp
WHERE  bp.status = 'A'
AND    bp.completion_time > SYSDATE - :dias_backup_reciente
AND    bp.encrypted <> 'YES'
UNION ALL
SELECT CAST(NULL AS VARCHAR2(40)),
       CAST(NULL AS VARCHAR2(513)),
       CAST(NULL AS VARCHAR2(20)),
       'No se observaron respaldos recientes (o no son visibles desde este contenedor)'
FROM   dual
WHERE  NOT EXISTS (SELECT 1
                   FROM   v$backup_piece bp
                   WHERE  bp.status = 'A'
                   AND    bp.completion_time > SYSDATE - :dias_backup_reciente)
