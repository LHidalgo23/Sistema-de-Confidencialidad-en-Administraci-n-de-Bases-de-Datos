-- LAB-02 | A8.3 | VPD: cada medico solo ve a sus pacientes
-- Conectado como MEDICO_01 (SQL*Plus):
--   CONNECT medico_01@localhost:1521/pdb_clinica
-- Antes de la politica VPD: devuelve filas de MEDICO_02 (fuga).
-- Despues: 0 filas, porque la politica filtra por medico_asignado.
SELECT COUNT(*) AS expedientes_de_otros_medicos
FROM   clinica.expedientes
WHERE  medico_asignado <> 'MEDICO_01';

SELECT COUNT(*) AS expedientes_visibles FROM clinica.expedientes;
