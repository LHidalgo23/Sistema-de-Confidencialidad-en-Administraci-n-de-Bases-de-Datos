-- LAB-06 | A8.33 | El clon de desarrollo no contiene cedulas reales
-- Requiere el esquema CLINICA_DEV creado por el correctivo de OBS-23 (clon
-- enmascarado). AUDITOR_ISO solo tiene SELECT_CATALOG_ROLE: para esta prueba,
-- ejecutarla como SYSDBA o como un usuario con SELECT sobre ambos esquemas.
-- Esperado: 0 cedulas coincidentes.
SELECT COUNT(*) AS cedulas_iguales
FROM   clinica.pacientes p
JOIN   clinica_dev.pacientes d ON d.cedula = p.cedula;
