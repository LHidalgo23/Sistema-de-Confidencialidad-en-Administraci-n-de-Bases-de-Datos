-- OBS-04 | A5.16 Gestion de identidades
-- Cuentas abiertas sin uso en mas de :dias_inactividad dias. Una cuenta que
-- nunca ha iniciado sesion se mide desde su fecha de creacion. Se excluyen las
-- cuentas sin autenticacion (NO AUTHENTICATION, duenos de esquema): no pueden
-- iniciar sesion, asi que "sin uso" no es un riesgo en ellas. Tampoco se evaluan las
-- cuentas comunes (C##...): se administran desde CDB$ROOT y su actividad en una PDB
-- no es una senal de abandono (es el caso del usuario de instancia del propio auditor).
-- Alcance: PDB | Version minima: 19
-- Binds: :dias_inactividad (numero)
-- Regla: cada fila es un hallazgo.
SELECT u.username                                   AS usuario,
       u.account_status                             AS estado,
       NVL(TO_CHAR(u.last_login, 'YYYY-MM-DD HH24:MI'), 'NUNCA') AS ultimo_acceso,
       TO_CHAR(u.created, 'YYYY-MM-DD')             AS creado
FROM   dba_users u
WHERE  u.oracle_maintained = 'N'
AND    u.account_status = 'OPEN'
AND    u.authentication_type <> 'NONE'
AND    u.common = 'NO'
AND    (   (u.last_login IS NOT NULL
            AND u.last_login < SYSTIMESTAMP - NUMTODSINTERVAL(:dias_inactividad, 'DAY'))
        OR (u.last_login IS NULL
            AND u.created < SYSDATE - :dias_inactividad))
ORDER  BY u.username
