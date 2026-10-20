-- OBS-14 | A8.10 Eliminacion de la informacion
-- Objetos de esquemas de negocio que siguen en la papelera de reciclaje: un
-- DROP sin PURGE no elimina los datos, solo los renombra.
-- Alcance: PDB | Version minima: 19
-- Binds: :esquemas_negocio (JSON: ["ESQUEMA1", ...])
-- Regla: cada fila es un hallazgo.
SELECT r.owner         AS esquema,
       r.original_name AS objeto,
       r.type          AS tipo,
       r.ts_name       AS tablespace,
       TO_CHAR(r.droptime) AS eliminado
FROM   dba_recyclebin r
WHERE  EXISTS (SELECT 1
               FROM   JSON_TABLE(TO_CLOB(:esquemas_negocio), '$[*]'
                        COLUMNS (esquema VARCHAR2(128) PATH '$')) e
               WHERE  e.esquema = r.owner)
ORDER  BY r.owner, r.original_name
