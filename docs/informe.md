# Informe — Instrumento escalable de auditoría de confidencialidad (ISO/IEC 27001:2022) para Oracle

> Esqueleto del informe final según el plan de acción v2. Cada sección indica de dónde sale la evidencia. Todo el contenido se redacta en palabras propias; las tablas de los planes son guía, no texto para copiar. Formato final: todo en negro, sin colores de acento.

## Portada

Título, curso, profesor, estudiante, ciclo, fecha.

## Índice

TODO (generar al cerrar el documento).

## 1. Presentación y justificación

TODO. Idea central: el DBA custodia los activos de información más críticos; el instrumento automatiza la observación de los controles de confidencialidad y deja evidencia auditable.

## 2. Objetivo general y objetivos específicos

TODO (ver la asignación, secciones 2 y 3).

## 3. Marco teórico

Ver [`marco-teorico.md`](marco-teorico.md) (resumir en 2-3 páginas).

## 4. Metodología PHVA aplicada al caso

TODO. Tabla del ciclo por empresa (registrar → pre-vuelo → descubrimiento → observar → evaluar → corregir → re-observar → prevenir y reportar) con su fase PHVA y su tipo de control (detectivo, correctivo, preventivo). Ver el README.

## 5. Diseño del instrumento

- Concepto: instrumento genérico + empresa ficticia solo para demostración. Evidencia: `instrumento/` no menciona a la empresa (lo verifica `backend/tests/test_catalogo.py`).
- Catálogo externo: agregar un control = una entrada en `catalogo_controles.json` y su `.sql`, sin tocar el código.
- Consultas parametrizadas con variables *bind*; listas como arreglo JSON con `JSON_TABLE`; `NOT EXISTS` en lugar de `NOT IN` (un `NULL` en la lista ocultaría los hallazgos).
- Descubrimiento por metadatos (`DBA_TABLES`, `DBA_TAB_COLUMNS`), sin leer datos de negocio.
- Perfil de política por empresa: umbrales ISO por defecto, ajustables.
- Compatibilidad por versión: cada control declara su versión mínima.
- Cuarto estado «No evaluable»: el control no se marca incumplido si el auditor no puede observarlo.
- Script de incorporación del auditor (`onboarding_auditor.sql`) con privilegio mínimo.
- Coherencia: el instrumento aplica los controles que audita (privilegio mínimo, perfil con límites, credenciales cifradas, correctivos que nunca se ejecutan solos).
- Limitaciones: controles de instancia desde una PDB; sesiones TLS en OBS-20; contraseñas débiles no observables; aproximaciones documentadas en `limitaciones` de cada observable.

## 6. Componentes del artefacto

### 6.1 Riesgos de confidencialidad (R-CONF)

TODO: tabla con probabilidad, impacto y nivel (escala 1-5 × 1-5; 1-6 Bajo, 8-12 Medio, 15-25 Alto). Datos en `instrumento/riesgos.json` (pantalla *Catálogo*).

### 6.2 Tareas críticas del DBA

TODO: las 12 tareas, con frecuencia y riesgos asociados. Datos en `instrumento/tareas.json`.

### 6.3 Mapeo de controles ISO

TODO: tabla Control | Riesgo(s) | Tarea(s) | Justificación del mecanismo | Implementación en Oracle | Evidencia observable. Fuente: `instrumento/catalogo_controles.json` y `controles_iso.json` (15 controles núcleo + A8.24, A8.8, A8.31 y A8.33 como extras justificados).

### 6.4 Controles observables (15 + extras)

TODO: lista de los observables OBS-01 a OBS-24 por control, con la consulta (`instrumento/sql/observables/`).

### 6.5 Matriz de evaluación

Matriz-instrumento (genérica, una sola vez) y matriz de evaluación (una por empresa y ejecución):
`Empresa | Fecha | Tarea | Riesgo | Control | Hallazgo (evidencia) | Criterio 0-4 antes | Estado antes | Correctivo aplicado | Criterio 0-4 después | Estado después`.

Escala de madurez y regla de cálculo (idéntica a `backend/app/evaluacion.py`):

| Porcentaje de observables en Cumple | Criterio |
|---|---|
| 0 % | 0 Inexistente |
| menos de 50 % | 1 Inicial |
| 50 % o más, sin llegar a 100 % | 2 Repetible |
| 100 % | 3 Definido |
| 100 % + auditoría activa + revisión registrada | 4 Gestionado |

Estados: 0-1 **No cumple**, 2 **Parcial**, 3-4 **Cumple**, y **No evaluable** si no se pudo observar.

Criterios de aplicación decididos (documentar y confirmar con el profesor):

1. Un observable «No evaluable» no cuenta a favor ni en contra: el porcentaje se calcula sobre los observables evaluables del control.
2. El nivel 4 exige además cobertura completa (todos los observables del control evaluados).
3. «Auditoría activa» significa que OBS-18 y OBS-19 están en Cumple.
4. «Revisión registrada» significa que la ejecución fue revisada y firmada en la herramienta.
5. Una aceptación de riesgo documentada (por ejemplo, OBS-24 en Oracle XE) eleva a Parcial un control cuyos únicos hallazgos están aceptados; nunca lo lleva a Cumple.

### 6.6 Batería de pruebas

Los observables y sus correctivos son los scripts de verificación (`instrumento/sql/observables/`). Las pruebas negativas, que dependen de usuarios de cada empresa, son opcionales y están en `laboratorio/clinica/pruebas_laboratorio/` (LAB-01 a LAB-06).

## 7. Aplicación a la empresa ficticia (Clínica Los Robles S.A.)

TODO: caso, relación con la Ley 8968 (dato personal y dato sensible de salud), línea base insegura, hallazgos de la auditoría «antes», correctivos generados y completados a mano, re-observación y capturas. Evidencia en `docs/evidencias/` y `laboratorio/clinica/`.

## 8. Plan de mejora (Actuar)

TODO: pendientes en Parcial, No cumple y No evaluable, con acción y control preventivo (pantalla *Plan de mejora*).

## 9. Conclusiones

TODO.

## 10. Referencias (APA 7)

Ver [`referencias-apa7.md`](referencias-apa7.md).

## 11. Uso de inteligencia artificial

Ver [`tabla-uso-ia.md`](tabla-uso-ia.md), con la declaración jurada firmada. Incluye la retroalimentación del profesor que motivó el plan v2.

## 12. Enlaces

- Repositorio: TODO
- Video (5 min): TODO
