-- ============================================================================
-- Control: A8.24 — Uso de criptografía (control extra, justificado)
-- Riesgo(s) relacionado(s): R-CONF-03
-- Tarea(s) del DBA: T-04
-- Objetivo: habilitar Transparent Data Encryption (TDE) y cifrar el
--           tablespace TS_CLINICA_SENSIBLE con AES256.
-- Evidencia observable (Anexo A): V$ENCRYPTION_WALLET, V$ENCRYPTED_TABLESPACES,
--           DBA_TABLESPACES.encrypted.
-- Prueba de verificación: P-22
-- Conexión: SYSTEM / sys as sysdba, sobre CDB$ROOT y luego XEPDB1.
-- ADVERTENCIA: requiere reinicio de la instancia y respaldo previo de la
--              base. Conservar el wallet y su contraseña fuera del repo.
-- ============================================================================

-- 1) Configurar la ubicación del wallet (requiere reinicio)
-- TODO: ALTER SYSTEM SET WALLET_ROOT = '<ruta>/admin/<DB_NAME>/wallet' SCOPE = SPFILE;
-- TODO: (reiniciar la instancia)
-- TODO: ALTER SYSTEM SET TDE_CONFIGURATION = 'KEYSTORE_CONFIGURATION=FILE' SCOPE = BOTH;

-- 2) Crear y abrir el keystore en CDB$ROOT
ALTER SESSION SET CONTAINER = CDB$ROOT;
-- TODO: ADMINISTER KEY MANAGEMENT CREATE KEYSTORE '<wallet_path>' IDENTIFIED BY "<password>";
-- TODO: ADMINISTER KEY MANAGEMENT SET KEYSTORE OPEN IDENTIFIED BY "<password>";
-- TODO: ADMINISTER KEY MANAGEMENT SET KEY IDENTIFIED BY "<password>" WITH BACKUP;

-- 3) Abrir el keystore también en el PDB y crear su llave
ALTER SESSION SET CONTAINER = XEPDB1;
-- TODO: ADMINISTER KEY MANAGEMENT SET KEYSTORE OPEN IDENTIFIED BY "<password>";
-- TODO: ADMINISTER KEY MANAGEMENT SET KEY IDENTIFIED BY "<password>" WITH BACKUP;

-- 4) Cifrar el tablespace sensible
-- TODO: ALTER TABLESPACE TS_CLINICA_SENSIBLE ENCRYPTION ONLINE USING 'AES256' ENCRYPT;

-- 5) Verificación
-- SELECT * FROM V$ENCRYPTION_WALLET;
-- SELECT * FROM V$ENCRYPTED_TABLESPACES;
