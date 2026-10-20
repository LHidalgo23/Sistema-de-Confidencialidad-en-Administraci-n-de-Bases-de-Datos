# Pruebas de laboratorio (opcionales, específicas de la clínica)

Las pruebas **negativas** dependen de usuarios concretos de cada empresa (por ejemplo, "RECEPCION_01 no puede leer EXPEDIENTES"), así que no pueden vivir en el catálogo genérico. Se ejecutan a mano con SQL*Plus o SQL Developer conectando como el usuario indicado, y sirven para la demostración en vivo.

| Archivo | Usuario | Control | Resultado esperado después de los correctivos |
|---|---|---|---|
| `LAB-01_bloqueo_intentos_fallidos.sql` | `MEDICO_02` | A5.17 | Tras los intentos fallidos configurados, la cuenta queda `LOCKED(TIMED)` |
| `LAB-02_vpd_medico.sql` | `MEDICO_01` | A8.3 | Solo ve los expedientes de sus propios pacientes |
| `LAB-03_recepcion_expedientes.sql` | `RECEPCION_01` | A8.3 | `ORA-00942` al leer `EXPEDIENTES` |
| `LAB-04_redaction_dev.sql` | `DEV_USER` | A8.11 | Cédula, salario e IBAN redactados |
| `LAB-05_auditoria_select.sql` | `APP_CLINICA` + `AUDITOR_ISO` | A8.15 | El `SELECT` sobre una tabla sensible aparece en `UNIFIED_AUDIT_TRAIL` |
| `LAB-06_comparacion_prod_dev.sql` | `AUDITOR_ISO` | A8.33 | 0 cédulas iguales entre `CLINICA` y `CLINICA_DEV` |
