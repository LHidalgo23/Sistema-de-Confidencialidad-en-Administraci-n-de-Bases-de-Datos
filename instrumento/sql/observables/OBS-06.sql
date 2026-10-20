-- OBS-06 | A5.17 Informacion de autenticacion
-- Perfiles en uso por cuentas de negocio sin funcion de verificacion de
-- contrasena o con limites mas debiles que el umbral de la empresa.
-- Un limite 'DEFAULT' se resuelve contra el perfil DEFAULT (herencia).
-- UNLIMITED, NULL o un valor no numerico cuentan como limite debil.
-- Alcance: PDB | Version minima: 19 (TO_NUMBER ... DEFAULT ON CONVERSION ERROR requiere 12.2+)
-- Binds: :max_intentos_fallidos, :max_vigencia_password_dias, :max_idle_time_min, :funcion_verificacion
-- Regla: cada fila (perfil, parametro) es un hallazgo.
WITH recursos AS (
  SELECT 'FAILED_LOGIN_ATTEMPTS' AS recurso FROM dual UNION ALL
  SELECT 'PASSWORD_LIFE_TIME'                FROM dual UNION ALL
  SELECT 'PASSWORD_VERIFY_FUNCTION'          FROM dual UNION ALL
  SELECT 'IDLE_TIME'                         FROM dual
),
perfiles_en_uso AS (
  SELECT DISTINCT profile
  FROM   dba_users
  WHERE  oracle_maintained = 'N'
),
efectivo AS (
  SELECT pu.profile AS perfil,
         r.recurso,
         CASE WHEN p.limit = 'DEFAULT' THEN d.limit ELSE p.limit END AS actual
  FROM   perfiles_en_uso pu
  CROSS  JOIN recursos r
  JOIN   dba_profiles p ON p.profile = pu.profile AND p.resource_name = r.recurso
  JOIN   dba_profiles d ON d.profile = 'DEFAULT'  AND d.resource_name = r.recurso
)
SELECT e.perfil,
       e.recurso AS parametro,
       e.actual,
       CASE e.recurso
         WHEN 'FAILED_LOGIN_ATTEMPTS' THEN TO_CHAR(:max_intentos_fallidos)
         WHEN 'PASSWORD_LIFE_TIME'    THEN TO_CHAR(:max_vigencia_password_dias)
         WHEN 'IDLE_TIME'             THEN TO_CHAR(:max_idle_time_min)
         ELSE :funcion_verificacion
       END AS recomendado
FROM   efectivo e
WHERE  (e.recurso = 'FAILED_LOGIN_ATTEMPTS'
        AND (TO_NUMBER(e.actual DEFAULT NULL ON CONVERSION ERROR) IS NULL
             OR TO_NUMBER(e.actual DEFAULT NULL ON CONVERSION ERROR) > :max_intentos_fallidos))
OR     (e.recurso = 'PASSWORD_LIFE_TIME'
        AND (TO_NUMBER(e.actual DEFAULT NULL ON CONVERSION ERROR) IS NULL
             OR TO_NUMBER(e.actual DEFAULT NULL ON CONVERSION ERROR) > :max_vigencia_password_dias))
OR     (e.recurso = 'IDLE_TIME'
        AND (TO_NUMBER(e.actual DEFAULT NULL ON CONVERSION ERROR) IS NULL
             OR TO_NUMBER(e.actual DEFAULT NULL ON CONVERSION ERROR) > :max_idle_time_min))
OR     (e.recurso = 'PASSWORD_VERIFY_FUNCTION'
        AND (e.actual IS NULL OR e.actual = 'NULL'))
ORDER  BY e.perfil, e.recurso
