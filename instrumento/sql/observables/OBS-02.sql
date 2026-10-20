-- OBS-02 | A5.15 Control de acceso
-- Objetos de esquemas de negocio con privilegios otorgados a PUBLIC.
-- Alcance: PDB | Version minima: 19
-- Binds: :esquemas_negocio (JSON: ["ESQUEMA1", ...])
-- Regla: cada fila es un hallazgo.
SELECT p.owner      AS esquema,
       p.table_name AS objeto,
       p.privilege  AS privilegio
FROM   dba_tab_privs p
WHERE  p.grantee = 'PUBLIC'
AND    EXISTS (SELECT 1
               FROM   JSON_TABLE(TO_CLOB(:esquemas_negocio), '$[*]'
                        COLUMNS (esquema VARCHAR2(128) PATH '$')) e
               WHERE  e.esquema = p.owner)
ORDER  BY p.owner, p.table_name, p.privilege
