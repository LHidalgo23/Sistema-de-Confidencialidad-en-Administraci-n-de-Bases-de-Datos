-- ============================================================================
-- clinica_00_esquema_y_datos.sql      (LABORATORIO: solo para la demo en clase)
-- Crea los tablespaces, el esquema CLINICA, los usuarios y los datos 100 %
-- ficticios de "Clinica Los Robles S.A.".
--
-- Ejecutar con SQL*Plus como SYSDBA, despues de clinica_00_crear_pdb.sql:
--     sqlplus / as sysdba
--     @clinica_00_esquema_y_datos.sql
--
-- Los nombres de columna son realistas (CEDULA, SALARIO, DIAGNOSTICO, IBAN,
-- CORREO...) para que el descubrimiento automatico los encuentre sin que se le
-- diga cuales son. Los correos usan el dominio reservado .invalid.
-- ============================================================================

WHENEVER SQLERROR EXIT FAILURE ROLLBACK

ALTER SESSION SET CONTAINER = pdb_clinica;

DEFINE ruta_oradata = 'C:\app\calvo\product\21c\oradata\XE'
ACCEPT clave_lab CHAR PROMPT 'Contrasena de laboratorio para los usuarios de la clinica (oculta): ' HIDE

-- ---------------------------------------------------------------------------
-- 1. Tablespaces. Los datos sensibles (y sus indices, que tambien contienen los
--    datos) viven en TS_SENSIBLE para poder cifrarlo luego con TDE.
-- ---------------------------------------------------------------------------
CREATE TABLESPACE ts_clinica
  DATAFILE '&ruta_oradata\pdb_clinica\ts_clinica01.dbf' SIZE 50M AUTOEXTEND ON NEXT 10M MAXSIZE 500M;
CREATE TABLESPACE ts_sensible
  DATAFILE '&ruta_oradata\pdb_clinica\ts_sensible01.dbf' SIZE 50M AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

-- ---------------------------------------------------------------------------
-- 2. Dueno del esquema: cuenta sin autenticacion (no puede iniciar sesion).
-- ---------------------------------------------------------------------------
CREATE USER clinica NO AUTHENTICATION
  DEFAULT TABLESPACE ts_clinica
  QUOTA UNLIMITED ON ts_clinica
  QUOTA UNLIMITED ON ts_sensible;

-- ---------------------------------------------------------------------------
-- 3. Tablas
-- ---------------------------------------------------------------------------
CREATE TABLE clinica.pacientes (
  id               NUMBER GENERATED ALWAYS AS IDENTITY,
  cedula           VARCHAR2(12)  NOT NULL,
  nombre           VARCHAR2(60)  NOT NULL,
  apellidos        VARCHAR2(80)  NOT NULL,
  fecha_nacimiento DATE          NOT NULL,
  telefono         VARCHAR2(15),
  correo           VARCHAR2(80),
  direccion        VARCHAR2(160),
  CONSTRAINT pk_pacientes        PRIMARY KEY (id)     USING INDEX TABLESPACE ts_sensible,
  CONSTRAINT uq_pacientes_cedula UNIQUE (cedula)      USING INDEX TABLESPACE ts_sensible
) TABLESPACE ts_sensible;

CREATE TABLE clinica.expedientes (
  id              NUMBER GENERATED ALWAYS AS IDENTITY,
  paciente_id     NUMBER        NOT NULL,
  medico_asignado VARCHAR2(30)  NOT NULL,
  fecha_apertura  DATE          NOT NULL,
  diagnostico     VARCHAR2(200) NOT NULL,
  tratamiento     VARCHAR2(300),
  CONSTRAINT pk_expedientes PRIMARY KEY (id) USING INDEX TABLESPACE ts_sensible,
  CONSTRAINT fk_expedientes_paciente FOREIGN KEY (paciente_id) REFERENCES clinica.pacientes (id)
) TABLESPACE ts_sensible;

CREATE TABLE clinica.empleados (
  id      NUMBER GENERATED ALWAYS AS IDENTITY,
  cedula  VARCHAR2(12)   NOT NULL,
  nombre  VARCHAR2(80)   NOT NULL,
  puesto  VARCHAR2(40)   NOT NULL,
  salario NUMBER(10, 2)  NOT NULL,
  iban    VARCHAR2(22)   NOT NULL,
  CONSTRAINT pk_empleados        PRIMARY KEY (id)    USING INDEX TABLESPACE ts_sensible,
  CONSTRAINT uq_empleados_cedula UNIQUE (cedula)     USING INDEX TABLESPACE ts_sensible
) TABLESPACE ts_sensible;

CREATE TABLE clinica.citas (
  id          NUMBER GENERATED ALWAYS AS IDENTITY,
  paciente_id NUMBER       NOT NULL,
  medico      VARCHAR2(30) NOT NULL,
  fecha_cita  DATE         NOT NULL,
  motivo      VARCHAR2(100),
  CONSTRAINT pk_citas PRIMARY KEY (id) USING INDEX TABLESPACE ts_clinica,
  CONSTRAINT fk_citas_paciente FOREIGN KEY (paciente_id) REFERENCES clinica.pacientes (id)
) TABLESPACE ts_clinica;

COMMENT ON TABLE clinica.citas IS 'Clasificacion: Interno';

-- ---------------------------------------------------------------------------
-- 4. Datos ficticios, reproducibles (semilla fija).
--    Cedulas unicas: 100000000 + i*3791 + aleatorio en [0, 3790], los rangos
--    de cada i no se solapan.
-- ---------------------------------------------------------------------------
DECLARE
  TYPE t_lista IS TABLE OF VARCHAR2(60);
  v_nombres   t_lista := t_lista('Maria','Jose','Ana','Luis','Carmen','Carlos','Laura','Jorge','Sofia','Andres',
                                 'Daniela','Mario','Valeria','Esteban','Paula','Diego','Gabriela','Rodrigo','Natalia','Fabian');
  v_apellidos t_lista := t_lista('Rodriguez','Mora','Jimenez','Vargas','Araya','Solano','Quesada','Castro','Rojas','Salas',
                                 'Chaves','Alvarado','Campos','Zuniga','Segura','Calderon','Brenes','Arce','Porras','Villalobos');
  v_medicos   t_lista := t_lista('MEDICO_01', 'MEDICO_02');
  v_puestos   t_lista := t_lista('Enfermero','Recepcionista','Administrador','Tecnico de laboratorio','Contador','Auxiliar');
  v_motivos   t_lista := t_lista('Control','Consulta general','Seguimiento','Examenes','Vacunacion');
  v_dx        t_lista := t_lista('Hipertension arterial','Diabetes mellitus tipo 2','Asma bronquial','Gastritis cronica',
                                 'Migrana','Lumbalgia','Hipotiroidismo','Rinitis alergica','Anemia ferropenica','Dermatitis atopica');
  v_tx        t_lista := t_lista('Control mensual y dieta','Medicacion diaria y seguimiento','Inhalador de rescate',
                                 'Inhibidor de acido por 8 semanas','Analgesico segun necesidad','Fisioterapia semanal');

  FUNCTION elegir(p_lista t_lista) RETURN VARCHAR2 IS
  BEGIN
    RETURN p_lista(TRUNC(DBMS_RANDOM.VALUE(1, p_lista.COUNT + 1)));
  END;
BEGIN
  DBMS_RANDOM.SEED(2026);

  FOR i IN 1 .. 250 LOOP
    INSERT INTO clinica.pacientes (cedula, nombre, apellidos, fecha_nacimiento, telefono, correo, direccion)
    VALUES (TO_CHAR(100000000 + i * 3791 + TRUNC(DBMS_RANDOM.VALUE(0, 3791))),
            elegir(v_nombres),
            elegir(v_apellidos) || ' ' || elegir(v_apellidos),
            DATE '1940-01-01' + TRUNC(DBMS_RANDOM.VALUE(0, 28000)),
            '8' || TO_CHAR(TRUNC(DBMS_RANDOM.VALUE(1000000, 9999999))),
            'paciente' || i || '@ejemplo.invalid',
            'Casa ' || TRUNC(DBMS_RANDOM.VALUE(1, 200)) || ', barrio ficticio ' || TRUNC(DBMS_RANDOM.VALUE(1, 40)));
  END LOOP;

  FOR p IN (SELECT id FROM clinica.pacientes) LOOP
    INSERT INTO clinica.expedientes (paciente_id, medico_asignado, fecha_apertura, diagnostico, tratamiento)
    VALUES (p.id, elegir(v_medicos), SYSDATE - TRUNC(DBMS_RANDOM.VALUE(1, 1500)), elegir(v_dx), elegir(v_tx));
    FOR c IN 1 .. 2 LOOP
      INSERT INTO clinica.citas (paciente_id, medico, fecha_cita, motivo)
      VALUES (p.id, elegir(v_medicos), SYSDATE + TRUNC(DBMS_RANDOM.VALUE(-300, 60)), elegir(v_motivos));
    END LOOP;
  END LOOP;

  FOR i IN 1 .. 50 LOOP
    INSERT INTO clinica.empleados (cedula, nombre, puesto, salario, iban)
    VALUES (TO_CHAR(200000000 + i * 3791 + TRUNC(DBMS_RANDOM.VALUE(0, 3791))),
            elegir(v_nombres) || ' ' || elegir(v_apellidos),
            elegir(v_puestos),
            TRUNC(DBMS_RANDOM.VALUE(450000, 2500000), 2),
            'CR' || LPAD(TRUNC(DBMS_RANDOM.VALUE(0, 99)), 2, '0') || '0' || LPAD(TRUNC(DBMS_RANDOM.VALUE(0, 999)), 3, '0')
                 || TO_CHAR(TRUNC(DBMS_RANDOM.VALUE(0, 1E14)), 'FM00000000000000'));
  END LOOP;

  COMMIT;
END;
/

-- ---------------------------------------------------------------------------
-- 5. Usuarios del laboratorio. Todos con el perfil DEFAULT (linea base).
-- ---------------------------------------------------------------------------
CREATE USER app_clinica   IDENTIFIED BY "&clave_lab";
CREATE USER medico_01     IDENTIFIED BY "&clave_lab";
CREATE USER medico_02     IDENTIFIED BY "&clave_lab";
CREATE USER recepcion_01  IDENTIFIED BY "&clave_lab";
CREATE USER rrhh_01       IDENTIFIED BY "&clave_lab";
CREATE USER dev_user      IDENTIFIED BY "&clave_lab";
CREATE USER exempleado_01 IDENTIFIED BY "&clave_lab";   -- cuenta inactiva: hallazgo intencional
CREATE USER dba_jsanchez  IDENTIFIED BY "&clave_lab";   -- DBA nominal

GRANT CREATE SESSION TO app_clinica, medico_01, medico_02, recepcion_01, rrhh_01, dev_user, exempleado_01, dba_jsanchez;
GRANT DBA TO dba_jsanchez;

-- ---------------------------------------------------------------------------
-- 6. Actividad reciente: DBA_USERS.LAST_LOGIN se actualiza al iniciar sesion.
--    Todos los usuarios inician sesion una vez, salvo EXEMPLEADO_01, que queda
--    abierto y sin uso. (Requiere SQL*Plus o SQL Developer; CONNECT se resuelve
--    por el servicio de la PDB.)
-- ---------------------------------------------------------------------------
CONNECT app_clinica/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT medico_01/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT medico_02/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT recepcion_01/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT rrhh_01/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT dev_user/"&clave_lab"@localhost:1521/pdb_clinica
CONNECT dba_jsanchez/"&clave_lab"@localhost:1521/pdb_clinica

CONNECT / AS SYSDBA
ALTER SESSION SET CONTAINER = pdb_clinica;
UNDEFINE clave_lab

PROMPT Filas cargadas:
SELECT 'PACIENTES' AS tabla, COUNT(*) AS filas FROM clinica.pacientes
UNION ALL SELECT 'EXPEDIENTES', COUNT(*) FROM clinica.expedientes
UNION ALL SELECT 'EMPLEADOS',   COUNT(*) FROM clinica.empleados
UNION ALL SELECT 'CITAS',       COUNT(*) FROM clinica.citas;
