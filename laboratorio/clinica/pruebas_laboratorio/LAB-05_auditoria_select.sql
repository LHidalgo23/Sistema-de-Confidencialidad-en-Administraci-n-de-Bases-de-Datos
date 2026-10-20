-- LAB-05 | A8.15 | La consulta a una tabla sensible queda registrada
-- 1) Conectado como APP_CLINICA:
--      CONNECT app_clinica@localhost:1521/pdb_clinica
SELECT COUNT(*) FROM clinica.pacientes;

-- 2) Conectado como AUDITOR_ISO (tiene AUDIT_VIEWER):
--      CONNECT auditor_iso@localhost:1521/pdb_clinica
-- Esperado despues de crear la politica de auditoria: al menos una fila.
SELECT dbusername, object_name, action_name, event_timestamp
FROM   unified_audit_trail
WHERE  dbusername = 'APP_CLINICA'
AND    object_name = 'PACIENTES'
AND    event_timestamp > SYSTIMESTAMP - INTERVAL '10' MINUTE
ORDER  BY event_timestamp DESC;
