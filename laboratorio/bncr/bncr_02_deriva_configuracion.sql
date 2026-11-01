-- ============================================================================
-- bncr_02_deriva_configuracion.sql    (LABORATORIO: solo para la demo en clase)
-- Deriva de configuracion de BNCR a lo largo de las ejecuciones trimestrales
-- #2 a #11 (la #1 es la linea base de bncr_01_linea_base_segura.sql). Cada
-- seccion es acumulativa (nunca se revierte la anterior): asi se construyo,
-- de verdad, la caida de madurez de 3.56 a 1.83 que se ve en el instrumento.
--
-- Como se uso: cada seccion se ejecuto contra PDB_BNCR y, justo despues, se
-- disparo una ejecucion del instrumento (POST /api/empresas/{id}/auditar)
-- con una etiqueta "Trimestre N - ...". A partir de la #2 nadie volvio a
-- firmar la revision trimestral (POST /ejecuciones/{id}/revision): eso por
-- si solo ya bajo la madurez de los controles con cobertura completa (de 4 a
-- 3), antes de que empezara a fallar un solo observable.
--
-- Madurez promedio real por ejecucion (instrumento, no inventada):
--   #1  3.56   #2  2.56   #3  2.50   #4  2.28   #5  2.22
--   #6  2.17   #7  2.00   #8  1.83   #9  1.83   #10 1.83   #11 1.83
-- ============================================================================

ALTER SESSION SET CONTAINER = pdb_bncr;

-- ---------------------------------------------------------------------------
-- #2 | Al desarrollador nuevo le dan acceso amplio "temporal" para terminar
--      una migracion de datos, y nadie lo revierte. (OBS-07, OBS-10)
--      Resultado real: madurez 3.56 -> 2.56.
-- ---------------------------------------------------------------------------
GRANT SELECT ANY TABLE TO dev_bncr;

-- ---------------------------------------------------------------------------
-- #3 | Un cajero pide acceso directo a TARJETAS "mientras se resuelve un
--      problema con el rol" y queda otorgado sin pasar por ROL_CAJERO_BNCR.
--      (OBS-03). Resultado real: 2.56 -> 2.50.
-- ---------------------------------------------------------------------------
GRANT SELECT ON bncr.tarjetas TO cajero_01;

-- ---------------------------------------------------------------------------
-- #4 | Se crea una cuenta de prueba para un proveedor externo con la
--      contrasena de ejemplo de siempre, "solo por un dia", y se olvida
--      abierta. Al no fijarle perfil, tambien queda en DEFAULT (debil), asi
--      que ademas reaparece el hallazgo de OBS-06. (OBS-05 y OBS-06, control
--      A5.17 completo). Resultado real: 2.50 -> 2.28.
-- ---------------------------------------------------------------------------
CREATE USER scott IDENTIFIED BY tiger;
GRANT CREATE SESSION TO scott;

-- ---------------------------------------------------------------------------
-- #5 | Para "resolver rapido" un reporte de gerencia que fallaba por falta de
--      permisos, a GERENTE_01 le otorgan el rol DBA directamente en vez de
--      revisar que privilegio especifico necesitaba. (OBS-09). Resultado
--      real: 2.28 -> 2.22.
-- ---------------------------------------------------------------------------
GRANT DBA TO gerente_01;

-- ---------------------------------------------------------------------------
-- #6 | Para "aligerar" el volumen de la bitacora de auditoria, deshabilitan
--      la politica sobre acciones privilegiadas (GRANT/REVOKE/CREATE
--      USER...). (OBS-19). Resultado real: 2.22 -> 2.17.
-- ---------------------------------------------------------------------------
NOAUDIT POLICY pol_bncr_acciones;

-- ---------------------------------------------------------------------------
-- #7 | Un analista saca una copia rapida de EMPLEADOS antes de una
--      migracion, la borra sin PURGE y queda en la papelera de reciclaje.
--      (OBS-14). Resultado real: 2.17 -> 2.00.
-- ---------------------------------------------------------------------------
CREATE TABLE bncr.tmp_export_rrhh AS SELECT * FROM bncr.empleados;
DROP TABLE bncr.tmp_export_rrhh;

-- ---------------------------------------------------------------------------
-- #8 | Para que un reporte interno "funcione sin errores raros", deshabilitan
--      la politica de Data Redaction de CUENTAS: el IBAN queda visible para
--      cualquiera con SELECT sobre la tabla. (OBS-15). Resultado real:
--      2.00 -> 1.83.
-- ---------------------------------------------------------------------------
BEGIN
  DBMS_REDACT.DISABLE_POLICY(object_schema => 'BNCR', object_name => 'CUENTAS', policy_name => 'pol_redact_cuentas');
END;
/

-- ---------------------------------------------------------------------------
-- #9, #10, #11 | No se aplica SQL nuevo: el banco no corrige nada de lo
--      anterior, pero tampoco introduce fallas nuevas en estos tres
--      trimestres. Es la deriva estabilizada: la madurez se queda plana en
--      1.83 (justo bajo el "madurez 2" que marca "Parcial") en vez de seguir
--      cayendo. Ejecutar las auditorias #9, #10 y #11 tal cual, sin tocar la
--      base entre ellas.
-- ---------------------------------------------------------------------------
