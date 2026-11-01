-- ============================================================================
-- bncr_00_esquema_y_datos.sql         (LABORATORIO: solo para la demo en clase)
-- Crea los tablespaces, el esquema BNCR, los usuarios y los datos 100 %
-- ficticios del banco de demostracion "BNCR".
--
-- Ejecutar con SQL*Plus como SYSDBA, despues de bncr_00_crear_pdb.sql:
--     sqlplus / as sysdba
--     @bncr_00_esquema_y_datos.sql
--
-- Los nombres de columna son realistas (CEDULA, TELEFONO, CORREO, DIRECCION,
-- FECHA_NACIMIENTO, IBAN, NUMERO_TARJETA, SALARIO) para que el descubrimiento
-- automatico los encuentre sin que se le diga cuales son. Los correos usan el
-- dominio reservado .invalid. Ningun dato es real: nombres, cedulas, cuentas,
-- tarjetas y transacciones son sinteticos con semilla fija.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

ALTER SESSION SET CONTAINER = pdb_bncr;

DEFINE ruta_oradata = 'C:\APP\CALVO\PRODUCT\21C\ORADATA\XE'
ACCEPT clave_lab CHAR PROMPT 'Contrasena de laboratorio para los usuarios de BNCR (oculta): ' HIDE

-- ---------------------------------------------------------------------------
-- 1. Tablespaces. Los datos sensibles (y sus indices) viven en TS_SENSIBLE_BNCR.
-- ---------------------------------------------------------------------------
CREATE TABLESPACE ts_bncr
  DATAFILE '&ruta_oradata\pdb_bncr\ts_bncr01.dbf' SIZE 50M AUTOEXTEND ON NEXT 10M MAXSIZE 500M;
CREATE TABLESPACE ts_sensible_bncr
  DATAFILE '&ruta_oradata\pdb_bncr\ts_sensible_bncr01.dbf' SIZE 50M AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

-- ---------------------------------------------------------------------------
-- 2. Dueno del esquema: cuenta sin autenticacion (no puede iniciar sesion).
-- ---------------------------------------------------------------------------
CREATE USER bncr NO AUTHENTICATION
  DEFAULT TABLESPACE ts_bncr
  QUOTA UNLIMITED ON ts_bncr
  QUOTA UNLIMITED ON ts_sensible_bncr;

-- ---------------------------------------------------------------------------
-- 3. Tablas
-- ---------------------------------------------------------------------------
CREATE TABLE bncr.clientes (
  id               NUMBER GENERATED ALWAYS AS IDENTITY,
  cedula           VARCHAR2(12)  NOT NULL,
  nombre           VARCHAR2(60)  NOT NULL,
  apellidos        VARCHAR2(80)  NOT NULL,
  fecha_nacimiento DATE          NOT NULL,
  telefono         VARCHAR2(15),
  correo           VARCHAR2(80),
  direccion        VARCHAR2(160),
  CONSTRAINT pk_clientes        PRIMARY KEY (id)  USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT uq_clientes_cedula UNIQUE (cedula)    USING INDEX TABLESPACE ts_sensible_bncr
) TABLESPACE ts_sensible_bncr;

CREATE TABLE bncr.cuentas (
  id             NUMBER GENERATED ALWAYS AS IDENTITY,
  cliente_id     NUMBER        NOT NULL,
  numero_cuenta  VARCHAR2(20)  NOT NULL,
  iban           VARCHAR2(22)  NOT NULL,
  tipo_cuenta    VARCHAR2(20)  NOT NULL,
  saldo          NUMBER(14, 2) NOT NULL,
  fecha_apertura DATE          NOT NULL,
  CONSTRAINT pk_cuentas            PRIMARY KEY (id)            USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT uq_cuentas_numero     UNIQUE (numero_cuenta)      USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT uq_cuentas_iban       UNIQUE (iban)               USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT fk_cuentas_cliente    FOREIGN KEY (cliente_id) REFERENCES bncr.clientes (id)
) TABLESPACE ts_sensible_bncr;

CREATE TABLE bncr.tarjetas (
  id                NUMBER GENERATED ALWAYS AS IDENTITY,
  cuenta_id         NUMBER       NOT NULL,
  numero_tarjeta    VARCHAR2(19) NOT NULL,
  fecha_vencimiento DATE         NOT NULL,
  CONSTRAINT pk_tarjetas         PRIMARY KEY (id)             USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT uq_tarjetas_numero  UNIQUE (numero_tarjeta)      USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT fk_tarjetas_cuenta  FOREIGN KEY (cuenta_id) REFERENCES bncr.cuentas (id)
) TABLESPACE ts_sensible_bncr;

CREATE TABLE bncr.transacciones (
  id         NUMBER GENERATED ALWAYS AS IDENTITY,
  cuenta_id  NUMBER        NOT NULL,
  monto      NUMBER(14, 2) NOT NULL,
  tipo       VARCHAR2(20)  NOT NULL,
  fecha      TIMESTAMP     NOT NULL,
  CONSTRAINT pk_transacciones      PRIMARY KEY (id) USING INDEX TABLESPACE ts_bncr,
  CONSTRAINT fk_transacciones_cta  FOREIGN KEY (cuenta_id) REFERENCES bncr.cuentas (id)
) TABLESPACE ts_bncr;

CREATE TABLE bncr.empleados (
  id      NUMBER GENERATED ALWAYS AS IDENTITY,
  cedula  VARCHAR2(12)  NOT NULL,
  nombre  VARCHAR2(80)  NOT NULL,
  puesto  VARCHAR2(40)  NOT NULL,
  salario NUMBER(10, 2) NOT NULL,
  correo  VARCHAR2(80),
  CONSTRAINT pk_empleados        PRIMARY KEY (id)  USING INDEX TABLESPACE ts_sensible_bncr,
  CONSTRAINT uq_empleados_cedula UNIQUE (cedula)    USING INDEX TABLESPACE ts_sensible_bncr
) TABLESPACE ts_sensible_bncr;

-- ---------------------------------------------------------------------------
-- 4. Datos ficticios, reproducibles (semilla fija).
--    Cedulas unicas: 300000000 + i*3791 + aleatorio en [0, 3790].
-- ---------------------------------------------------------------------------
DECLARE
  TYPE t_lista IS TABLE OF VARCHAR2(60);
  l_nombres   t_lista := t_lista('Maria','Jose','Ana','Luis','Carmen','Carlos','Laura','Jorge','Sofia','Andres',
                                 'Daniela','Mario','Valeria','Esteban','Paula','Diego','Gabriela','Rodrigo','Natalia','Fabian');
  l_apellidos t_lista := t_lista('Rodriguez','Mora','Jimenez','Vargas','Araya','Solano','Quesada','Castro','Rojas','Salas',
                                 'Chaves','Alvarado','Campos','Zuniga','Segura','Calderon','Brenes','Arce','Porras','Villalobos');
  l_tipo_cta  t_lista := t_lista('Ahorros','Corriente','Planilla');
  l_tipo_tx   t_lista := t_lista('Deposito','Retiro','Transferencia','Pago de servicio','Compra POS');
  l_puestos   t_lista := t_lista('Cajero','Gerente de sucursal','Oficial de credito','Analista de riesgo','Auxiliar contable','Asesor de servicio');

  v_nombre    VARCHAR2(60);
  v_apellidos VARCHAR2(80);
  v_puesto    VARCHAR2(40);
  v_tipo_cta  VARCHAR2(20);
  v_tipo_tx   VARCHAR2(20);

  -- Una funcion local no puede invocarse dentro de una sentencia SQL (PLS-00231):
  -- los valores se calculan en variables y luego se insertan.
  FUNCTION elegir(p_lista t_lista) RETURN VARCHAR2 IS
  BEGIN
    RETURN p_lista(TRUNC(DBMS_RANDOM.VALUE(1, p_lista.COUNT + 1)));
  END;
BEGIN
  DBMS_RANDOM.SEED(2026);

  FOR i IN 1 .. 120 LOOP
    v_nombre    := elegir(l_nombres);
    v_apellidos := elegir(l_apellidos) || ' ' || elegir(l_apellidos);
    INSERT INTO bncr.clientes (cedula, nombre, apellidos, fecha_nacimiento, telefono, correo, direccion)
    VALUES (TO_CHAR(300000000 + i * 3791 + TRUNC(DBMS_RANDOM.VALUE(0, 3791))),
            v_nombre,
            v_apellidos,
            DATE '1945-01-01' + TRUNC(DBMS_RANDOM.VALUE(0, 28000)),
            '8' || TO_CHAR(TRUNC(DBMS_RANDOM.VALUE(1000000, 9999999))),
            'cliente' || i || '@ejemplo.invalid',
            'Casa ' || TRUNC(DBMS_RANDOM.VALUE(1, 200)) || ', barrio ficticio ' || TRUNC(DBMS_RANDOM.VALUE(1, 40)));
  END LOOP;

  FOR c IN (SELECT id FROM bncr.clientes) LOOP
    FOR n IN 1 .. TRUNC(DBMS_RANDOM.VALUE(1, 3)) LOOP
      v_tipo_cta := elegir(l_tipo_cta);
      INSERT INTO bncr.cuentas (cliente_id, numero_cuenta, iban, tipo_cuenta, saldo, fecha_apertura)
      VALUES (c.id,
              TO_CHAR(900000000000 + c.id * 13 + n),
              'CR' || LPAD(TRUNC(DBMS_RANDOM.VALUE(0, 99)), 2, '0') || '0'
                   || LPAD(TRUNC(DBMS_RANDOM.VALUE(0, 999)), 3, '0')
                   || TO_CHAR(c.id * 1000 + n, 'FM00000000000000'),
              v_tipo_cta,
              TRUNC(DBMS_RANDOM.VALUE(0, 5000000), 2),
              SYSDATE - TRUNC(DBMS_RANDOM.VALUE(1, 3650)));
    END LOOP;
  END LOOP;

  FOR ct IN (SELECT id FROM bncr.cuentas WHERE MOD(id, 2) = 0) LOOP
    INSERT INTO bncr.tarjetas (cuenta_id, numero_tarjeta, fecha_vencimiento)
    VALUES (ct.id,
            '4' || LPAD(TO_CHAR(TRUNC(DBMS_RANDOM.VALUE(0, 1E14))), 14, '0') || LPAD(ct.id, 4, '0'),
            TRUNC(SYSDATE, 'MM') + TO_YMINTERVAL(TO_CHAR(TRUNC(DBMS_RANDOM.VALUE(1, 4)), 'FM00') || '-00'));
  END LOOP;

  FOR ct IN (SELECT id FROM bncr.cuentas) LOOP
    FOR t IN 1 .. TRUNC(DBMS_RANDOM.VALUE(2, 6)) LOOP
      v_tipo_tx := elegir(l_tipo_tx);
      INSERT INTO bncr.transacciones (cuenta_id, monto, tipo, fecha)
      VALUES (ct.id,
              TRUNC(DBMS_RANDOM.VALUE(-500000, 500000), 2),
              v_tipo_tx,
              SYSTIMESTAMP - DBMS_RANDOM.VALUE(1, 365));
    END LOOP;
  END LOOP;

  FOR i IN 1 .. 12 LOOP
    v_nombre := elegir(l_nombres) || ' ' || elegir(l_apellidos);
    v_puesto := elegir(l_puestos);
    INSERT INTO bncr.empleados (cedula, nombre, puesto, salario, correo)
    VALUES (TO_CHAR(400000000 + i * 3791 + TRUNC(DBMS_RANDOM.VALUE(0, 3791))),
            v_nombre,
            v_puesto,
            TRUNC(DBMS_RANDOM.VALUE(500000, 2800000), 2),
            'empleado' || i || '@bncr.invalid');
  END LOOP;

  COMMIT;
END;
/

-- ---------------------------------------------------------------------------
-- 5. Usuarios del laboratorio. CREATE SESSION directo unicamente: el acceso a
--    datos de negocio se otorga por rol en bncr_01_linea_base_segura.sql
--    (OBS-03 exige que no haya grants directos sobre objetos a usuarios).
-- ---------------------------------------------------------------------------
CREATE USER app_bncr    IDENTIFIED BY "&clave_lab";
CREATE USER cajero_01   IDENTIFIED BY "&clave_lab";
CREATE USER gerente_01  IDENTIFIED BY "&clave_lab";
CREATE USER dev_bncr    IDENTIFIED BY "&clave_lab";
CREATE USER dba_lhidalgo IDENTIFIED BY "&clave_lab";

GRANT CREATE SESSION TO app_bncr, cajero_01, gerente_01, dev_bncr, dba_lhidalgo;
GRANT DBA TO dba_lhidalgo;

UNDEFINE clave_lab

PROMPT Filas cargadas:
SELECT 'CLIENTES' AS tabla, COUNT(*) AS filas FROM bncr.clientes
UNION ALL SELECT 'CUENTAS',       COUNT(*) FROM bncr.cuentas
UNION ALL SELECT 'TARJETAS',      COUNT(*) FROM bncr.tarjetas
UNION ALL SELECT 'TRANSACCIONES', COUNT(*) FROM bncr.transacciones
UNION ALL SELECT 'EMPLEADOS',     COUNT(*) FROM bncr.empleados;
