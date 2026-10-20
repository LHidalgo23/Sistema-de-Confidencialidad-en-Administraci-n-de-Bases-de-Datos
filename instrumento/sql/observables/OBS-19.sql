-- OBS-19 | A8.15 Registro
-- Eventos criticos sin una politica de auditoria unificada habilitada:
-- inicios de sesion fallidos y acciones de gestion de cuentas y privilegios.
-- Oracle trae habilitadas por defecto ORA_LOGON_FAILURES y ORA_SECURECONFIG: lo que
-- suele faltar es auditar GRANT y REVOKE. Las politicas habilitadas se materializan
-- una sola vez (AUDIT_UNIFIED_POLICIES es una vista costosa).
-- Alcance: PDB | Version minima: 19
-- Binds: (ninguno)
-- Regla: cada fila es un hallazgo (evento requerido que nadie audita).
WITH habilitadas AS (
  SELECT /*+ MATERIALIZE */ ap.audit_option,
         ep.failure
  FROM   audit_unified_policies ap
  JOIN   audit_unified_enabled_policies ep
         ON ep.policy_name = ap.policy_name
  WHERE  ap.policy_name IN (SELECT policy_name FROM audit_unified_enabled_policies)
),
requeridas AS (
  SELECT 'LOGON_FALLIDO'       AS tipo, 'LOGON'       AS accion FROM dual UNION ALL
  SELECT 'ACCION_PRIVILEGIADA',         'CREATE USER'           FROM dual UNION ALL
  SELECT 'ACCION_PRIVILEGIADA',         'ALTER USER'            FROM dual UNION ALL
  SELECT 'ACCION_PRIVILEGIADA',         'DROP USER'             FROM dual UNION ALL
  SELECT 'ACCION_PRIVILEGIADA',         'GRANT'                 FROM dual UNION ALL
  SELECT 'ACCION_PRIVILEGIADA',         'REVOKE'                FROM dual
)
SELECT r.tipo,
       r.accion
FROM   requeridas r
WHERE  NOT EXISTS (SELECT 1
                   FROM   habilitadas h
                   WHERE  h.audit_option = r.accion
                   AND   (r.tipo <> 'LOGON_FALLIDO' OR h.failure = 'YES'))
ORDER  BY r.tipo, r.accion
