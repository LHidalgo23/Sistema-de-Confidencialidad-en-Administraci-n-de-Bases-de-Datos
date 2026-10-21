// Ayuda de cada pantalla: qué es, cómo probarla, qué esperar y cómo defenderla ante el profesor.
// Es genérica: no nombra a ninguna empresa. Los escenarios concretos de la empresa de
// demostración viven en laboratorio/<empresa>/guia_practica.json y se ven en la pantalla Práctica.
//
// Cada guía tiene:
//   titulo, queEs, queMuestra[], comoProbar[], esperado[], siguiente[]
//   defensa: { enunciado, rubrica, argumentos[], preguntas: [[pregunta, respuesta], ...] }
//   terminos: claves de GLOSARIO que conviene tener a mano en esa pantalla

export const GLOSARIO = {
  phva: [
    "Ciclo PHVA",
    "Planificar, Hacer, Verificar, Actuar. El instrumento lo recorre por empresa: registrar, pre-vuelo y descubrimiento planifican; observar y re-observar verifican; el correctivo lo aplica el DBA (hacer) y el plan de mejora cierra el ciclo (actuar).",
  ],
  observable: [
    "Observable",
    "Una consulta SQL de solo lectura sobre el diccionario de datos. Cada fila que devuelve es un hallazgo; cero filas significa que el control se cumple. Hay 24, de OBS-01 a OBS-24.",
  ],
  hallazgo: ["Hallazgo", "Una fila devuelta por un observable: el objeto concreto (usuario, tabla, columna, parámetro) que incumple el control."],
  madurez: [
    "Madurez 0-4",
    "Porcentaje de observables del control que cumplen: 0 % es 0, menos de la mitad es 1, la mitad o más es 2, todos es 3. El 4 exige además auditoría activa (OBS-18 y OBS-19 en Cumple), cobertura completa y una revisión registrada.",
  ],
  estados: [
    "Estados",
    "Madurez 0-1 es No cumple, 2 es Parcial y 3-4 es Cumple. No evaluable significa que el auditor no pudo ver el dato: no cuenta ni a favor ni en contra.",
  ],
  noEvaluable: [
    "No evaluable",
    "El observable no se pudo ejecutar: falta un privilegio, la vista no existe en esa versión o el dato vive en la instancia. Es honestidad del instrumento, no un incumplimiento.",
  ],
  parcialJustificado: [
    "Parcial justificado",
    "Un control cuyos únicos hallazgos tienen una aceptación de riesgo escrita en el perfil de la empresa. Sube a Parcial, nunca a Cumple.",
  ],
  pdb: ["PDB y CDB$ROOT", "Oracle 21c es multitenant: la PDB tiene los datos de la empresa; CDB$ROOT, el contenedor raíz, ve la instancia completa (respaldos, parámetros, sesiones)."],
  alcance: ["Alcance", "Dónde se observa un control: en la PDB (usuarios, privilegios, datos) o en la instancia (respaldos, red, password file, parches)."],
  auditor: [
    "Usuario auditor",
    "AUDITOR_ISO, creado con instrumento/onboarding_auditor.sql. Solo tiene CREATE SESSION, SELECT_CATALOG_ROLE, AUDIT_VIEWER y lectura de dos vistas de SYS: observa configuración y metadatos, no datos de negocio.",
  ],
  perfil: ["Perfil de política", "Los umbrales de una empresa (días de inactividad, intentos fallidos, cuentas DBA autorizadas...). Solo se escribe lo que difiere del perfil por defecto."],
  correctivo: ["Correctivo", "El SQL que propone el instrumento para cerrar un hallazgo. Lo revisa y lo aplica el DBA; el instrumento nunca lo ejecuta."],
  preventivo: ["Preventivo", "La práctica que evita que el hallazgo vuelva a aparecer, por ejemplo un perfil de contraseñas o una revisión trimestral de roles."],
  detectivo: ["Detectivo", "Un control que descubre el problema después de ocurrir. Los observables son controles detectivos."],
  reobservar: ["Re-observar", "Ejecutar los mismos observables después del correctivo para demostrar con evidencia que el hallazgo se cerró."],
  rconf: ["R-CONF", "Riesgo de confidencialidad. Nivel = probabilidad (1-5) × impacto (1-5): 1-6 Bajo, 8-12 Medio, 15-25 Alto."],
  ley8968: ["Ley 8968", "Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica. Obliga a proteger los datos sensibles, como los de salud."],
  vpd: ["VPD", "Virtual Private Database: Oracle agrega un predicado a cada consulta para que cada usuario vea solo las filas que le corresponden (A8.3)."],
  redaction: ["Data Redaction", "Oracle enmascara el valor de una columna al devolverlo, sin cambiar lo almacenado (A8.11)."],
  tde: ["TDE", "Transparent Data Encryption: cifra los datos en disco con llaves guardadas en un wallet (A8.24)."],
  descubrimiento: ["Descubrimiento", "Búsqueda de columnas sensibles por nombre y tipo de dato (metadatos). No lee ningún valor de la base."],
};

export const GUIAS = {
  empresas: {
    titulo: "Empresas",
    queEs:
      "La lista de empresas, es decir, de bases Oracle, que el instrumento puede auditar. El instrumento no conoce a ninguna de antemano: cada empresa es solo una conexión más con su propia política.",
    queMuestra: [
      "Una tabla con el nombre, el sector, la conexión (host:puerto/servicio), el usuario auditor y cómo se guardan las credenciales.",
      "Un formulario para registrar una empresa nueva.",
    ],
    comoProbar: [
      "Pulsa «Abrir» en una empresa para entrar a su panel.",
      "Para registrar otra: escribe el nombre, la conexión (por ejemplo localhost:1521/pdb_clinica) y el usuario creado con instrumento/onboarding_auditor.sql.",
      "Deja el perfil vacío para usar los umbrales ISO por defecto, o escribe solo lo que cambia, por ejemplo {\"dias_inactividad\": 60}.",
    ],
    esperado: [
      "La empresa nueva aparece en la tabla y la contraseña nunca se muestra: si la guardas, queda cifrada.",
      "Una conexión mal escrita o un parámetro de perfil que no existe se rechaza con un mensaje claro.",
    ],
    siguiente: ["Abre la empresa y ejecuta el Pre-vuelo."],
    defensa: {
      enunciado: "Sección 7 (metodología PHVA, fase Planificar) y la retroalimentación del profesor: un instrumento genérico que sirve para cualquier empresa.",
      rubrica: "Presentación, video y repositorio (10 %); da contexto a Pruebas técnicas y scripts (15 %).",
      argumentos: [
        "El instrumento no trae ninguna empresa programada: la clínica es solo la demostración. Auditar otra base es registrar su conexión aquí.",
        "Mínimo privilegio: el auditor solo lee el diccionario de datos. No tiene acceso a los datos de negocio.",
        "Las contraseñas guardadas se cifran en reposo con Fernet; si no se guardan, viven solo en la memoria del navegador.",
      ],
      preguntas: [
        [
          "¿Por qué no audita con SYS o SYSTEM?",
          "Porque un auditor con privilegios de administrador rompe la separación de funciones y podría modificar lo que audita. AUDITOR_ISO solo puede leer el catálogo; el pre-vuelo comprueba que no tenga privilegios de más.",
        ],
        [
          "¿Qué cambia si audito una base que no es la clínica?",
          "Solo la conexión y, si hace falta, el perfil de política. El catálogo de 24 observables y el motor de evaluación son los mismos.",
        ],
      ],
    },
    terminos: ["auditor", "perfil", "phva"],
  },

  dashboard: {
    titulo: "Dashboard",
    queEs:
      "El resultado de observar la base. Cada tarjeta es un control de ISO 27001 con su madurez de 0 a 4 y su estado. Aquí se cierra el ciclo: observar, corregir y volver a observar.",
    queMuestra: [
      "El resumen: madurez promedio y cuántos controles Cumplen, son Parciales, No cumplen o son No evaluables.",
      "Una tarjeta por control (los 15 de la asignación y 4 extras) con enlaces a los observables que fallaron.",
      "La tabla de los 24 observables: de dónde se observó (PDB o instancia), severidad, estado y número de hallazgos.",
      "El historial de ejecuciones y, con dos o más, el gráfico de madurez antes y después.",
    ],
    comoProbar: [
      "Escribe una etiqueta («antes» antes de corregir, «despues» al volver a observar) y pulsa «Observar la base».",
      "Pulsa un observable (por ejemplo OBS-09) para abrir su evidencia y su correctivo.",
      "Con dos ejecuciones, elige cuál es «Antes» y cuál «Después» para ver el gráfico.",
      "Registra una revisión: es una de las condiciones del nivel 4 (Gestionado).",
    ],
    esperado: [
      "Un control Cumple (madurez 3) solo si todos sus observables evaluables están en Cumple.",
      "«No evaluable» no es un incumplimiento: el auditor no pudo ver el dato, y el motivo aparece en la tabla.",
      "Un control Parcial con la nota «Parcial justificado» tiene una aceptación de riesgo documentada en el perfil de la empresa.",
    ],
    siguiente: [
      "Descarga el script correctivo, aplícalo en la base (lo aplica el DBA, nunca el instrumento) y vuelve a observar para comprobar que el control mejora.",
    ],
    defensa: {
      enunciado: "Producto esperado, punto 4: la lista de 15 controles observables por un auditor externo. Fase Verificar del PHVA.",
      rubrica: "Matriz de evaluación y controles observables (20 %): criterios 0-4 bien aplicados y evidencias auditables.",
      argumentos: [
        "La madurez no es una opinión: sale de una regla fija sobre el porcentaje de observables que cumplen, y el 4 exige auditoría activa y revisión firmada.",
        "Cada estado se puede rastrear hasta las filas exactas que lo causaron: del control al observable y del observable a la evidencia.",
        "El gráfico antes y después demuestra el ciclo completo con dos ejecuciones reales, no con datos dibujados.",
      ],
      preguntas: [
        [
          "¿Por qué hay 19 controles si la asignación pide 15?",
          "Los 15 del enunciado son el núcleo. Los 4 extras (A8.24 cifrado, A8.8 vulnerabilidades técnicas, A8.31 separación de ambientes y A8.33 datos de prueba) cubren riesgos que las tareas del DBA ya mencionan, como TDE, parcheo y clones DEV/TEST.",
        ],
        [
          "¿Qué significa que un control esté en Cumple pero con madurez 3 y no 4?",
          "Que todos sus observables pasan, pero falta la auditoría activa o la revisión firmada. El 4 es «gestionado»: además de cumplir, alguien lo supervisa.",
        ],
        [
          "¿Por qué un control No evaluable no baja la nota?",
          "Porque no se observó nada. Contarlo como incumplimiento sería inventar evidencia; el instrumento lo declara y el plan de mejora pide habilitar la visibilidad.",
        ],
      ],
    },
    terminos: ["madurez", "estados", "noEvaluable", "parcialJustificado", "observable"],
  },

  prevuelo: {
    titulo: "Pre-vuelo",
    queEs:
      "Una revisión previa a auditar: comprueba que el usuario auditor puede ver lo que el catálogo necesita y avisa de los controles que no podrá evaluar.",
    queMuestra: [
      "La versión de Oracle, el contenedor al que estás conectado y el usuario auditor.",
      "Los roles y privilegios reales del auditor, con una advertencia si tiene más de los necesarios.",
      "La tabla de controles que quedarían «No evaluable», con el motivo.",
      "La conexión de instancia (opcional) y el perfil de política de la empresa.",
    ],
    comoProbar: [
      "Pulsa «Ejecutar pre-vuelo».",
      "Lee las advertencias: un auditor con privilegios de más, o una conexión que apunta a CDB$ROOT en vez de a la PDB, se avisa aquí.",
      "Configura la conexión de instancia si quieres evaluar respaldos, parámetros y sesiones.",
      "Cambia un umbral en el perfil de política (por ejemplo \"max_intentos_fallidos\": 10) y guárdalo: la política es de cada empresa.",
    ],
    esperado: [
      "Con el auditor creado por el script de incorporación no debe haber advertencias de privilegios.",
      "Si el auditor no puede ver algo, ese control aparece en la tabla con su motivo y saldrá «No evaluable» al auditar.",
      "Sin conexión de instancia, los controles de instancia se observan desde la PDB y pueden salir «No evaluable».",
    ],
    siguiente: ["Ejecuta el Descubrimiento."],
    defensa: {
      enunciado: "Fase Planificar del PHVA y principio de mínimo privilegio (sección 1 del enunciado).",
      rubrica: "Pruebas técnicas y scripts (15 %): resultados esperados realistas, porque se sabe de antemano qué no se puede observar.",
      argumentos: [
        "El pre-vuelo evita resultados falsos: antes de auditar, el instrumento dice qué puede ver y qué no.",
        "Comprueba el propio mínimo privilegio del auditor: si tiene más roles de los necesarios, lo advierte.",
        "La conexión de instancia separa lo que se ve desde la PDB de lo que solo se ve desde CDB$ROOT, con un usuario común distinto (C##AUDITOR_ISO).",
      ],
      preguntas: [
        [
          "¿Por qué hacen falta dos conexiones?",
          "En Oracle multitenant la PDB no ve los respaldos, el password file ni los parámetros de la instancia. Esos observables (OBS-11, 17, 20 y 24) se evalúan desde CDB$ROOT con un usuario común de solo lectura.",
        ],
        [
          "¿Qué pasa si el perfil tiene un parámetro mal escrito?",
          "Se rechaza: solo se aceptan claves que existen en el perfil por defecto. Así un error de digitación no cambia silenciosamente un umbral.",
        ],
      ],
    },
    terminos: ["auditor", "pdb", "alcance", "perfil", "noEvaluable"],
  },

  descubrimiento: {
    titulo: "Descubrimiento",
    queEs:
      "Encuentra dónde hay datos sensibles usando solo metadatos, es decir, el nombre y el tipo de cada columna. No lee ningún dato de la base.",
    queMuestra: [
      "Cada columna cuyo nombre coincide con un patrón sensible (CEDULA, SALARIO, IBAN, DIAGNOSTICO...), con su categoría y nivel.",
      "Tu decisión sobre cada una: pendiente, confirmada o descartada.",
    ],
    comoProbar: [
      "Pulsa «Descubrir ahora».",
      "Revisa la lista y marca como «Descartada» una columna que en realidad no sea sensible.",
      "Pulsa «Guardar decisiones».",
    ],
    esperado: [
      "Lo pendiente cuenta como sensible hasta que lo descartes: es la opción segura.",
      "Una columna descartada deja de evaluarse en los observables que dependen del descubrimiento (OBS-01, 12, 15, 18, 22 y 23).",
      "Volver a descubrir conserva tus decisiones y retira las columnas que ya no existen.",
    ],
    siguiente: ["Observa desde el Dashboard y comprueba que la columna descartada ya no aparece como hallazgo."],
    defensa: {
      enunciado: "Control A5.12 (clasificación de la información) y la Ley 8968: saber dónde están los datos personales es el primer paso para protegerlos.",
      rubrica: "Identificación de riesgos y tareas DBA (20 %) y Mapeo de controles (20 %).",
      argumentos: [
        "Es escalable: no hay que decirle al instrumento qué tablas son sensibles en cada empresa, las encuentra por patrones del perfil.",
        "Respeta la confidencialidad que audita: trabaja con DBA_TAB_COLUMNS, nunca con un SELECT sobre los datos.",
        "La decisión final es humana: el auditor confirma o descarta, y lo pendiente se trata como sensible por seguridad.",
      ],
      preguntas: [
        [
          "¿Y si una columna sensible tiene un nombre que no coincide con ningún patrón?",
          "No se detecta automáticamente. Es una limitación declarada: los patrones se amplían en el perfil de la empresa sin tocar el código.",
        ],
        [
          "¿Por qué lo pendiente cuenta como sensible?",
          "Porque el error caro es dejar sin proteger un dato personal. Tratarlo como sensible hasta que alguien lo descarte es la opción conservadora.",
        ],
      ],
    },
    terminos: ["descubrimiento", "ley8968", "redaction", "vpd", "tde"],
  },

  matriz: {
    titulo: "Matriz de evaluación",
    queEs:
      "La matriz de evaluación que pide la asignación: tarea, riesgo, control, criterio 0-4, evidencia y estado, antes y después del correctivo.",
    queMuestra: [
      "Una fila por control ISO con la tarea del DBA, el riesgo que mitiga y la evidencia (qué observable falló y sobre qué objeto).",
      "El criterio y el estado «antes» y «después», y qué correctivo se aplicó.",
    ],
    comoProbar: [
      "Con una sola ejecución solo verás las columnas «antes».",
      "Tras volver a observar, elige las ejecuciones «Antes» y «Después».",
      "Filtra por estado y pulsa «Exportar CSV» para llevar la matriz al informe.",
    ],
    esperado: [
      "«Correctivo aplicado» lista los observables que pasaron de No cumple a Cumple; si ninguno cambió, dice «No».",
      "Un control mejora solo cuando mejora el porcentaje de sus observables en Cumple.",
    ],
    siguiente: ["Abre el Plan de mejora para ver lo que sigue pendiente."],
    defensa: {
      enunciado: "Producto esperado, punto 5: Matriz de evaluación (Tarea | Riesgo | Control | Criterio 0-4 | Evidencia | Estado).",
      rubrica: "Matriz de evaluación y controles observables (20 %).",
      argumentos: [
        "Tiene exactamente las columnas que pide el enunciado y agrega el «después» para demostrar el efecto del correctivo.",
        "La evidencia no es texto libre: nombra el observable y el objeto que falló, y se puede reproducir en SQL Developer.",
        "Se exporta a CSV para el informe, con los mismos datos que se ven en pantalla.",
      ],
      preguntas: [
        [
          "¿Cómo sé que el «después» no está maquillado?",
          "Las dos columnas salen de dos ejecuciones guardadas con fecha, versión de Oracle y contenedor. Cualquiera de las dos se puede abrir en el Dashboard.",
        ],
        [
          "¿Por qué un control puede seguir Parcial después de corregir?",
          "Porque se corrigieron algunos de sus observables y no todos. La madurez sube con el porcentaje que cumple.",
        ],
      ],
    },
    terminos: ["madurez", "estados", "reobservar", "rconf"],
  },

  hallazgo: {
    titulo: "Hallazgo",
    queEs:
      "El detalle de un observable en una ejecución, de principio a fin: la consulta, la evidencia, el correctivo y la comparación con otra ejecución.",
    queMuestra: [
      "1. Observable: la consulta de solo lectura que se ejecutó.",
      "2. Evidencia: las filas que devolvió; cada una es un hallazgo.",
      "3. Correctivo generado: el SQL que propone el instrumento para cada hallazgo.",
      "4. Re-observación: la comparación con otra ejecución.",
    ],
    comoProbar: [
      "Copia el correctivo con «Copiar» y revísalo antes de ejecutarlo en la base.",
      "Después de corregir y observar de nuevo, elige esa ejecución en «Re-observación».",
    ],
    esperado: [
      "El instrumento nunca ejecuta el correctivo: lo aplica el DBA con su gestión de cambios.",
      "Si un valor no se puede incorporar con seguridad al SQL, aparece «Revisar manualmente» en lugar de un script dudoso.",
    ],
    siguiente: ["Aplica el correctivo, vuelve a observar y confirma que el hallazgo se cerró."],
    defensa: {
      enunciado: "La secuencia que pidió el profesor: observable, hallazgo, correctivo y re-observación. Cubre los tres tipos de control: detectivo, correctivo y preventivo.",
      rubrica: "Pruebas técnicas y scripts (15 %) y Matriz y controles observables (20 %): evidencias auditables.",
      argumentos: [
        "Es la cadena de evidencia completa en una sola pantalla: la consulta, las filas, el SQL que lo corrige y la prueba de que se cerró.",
        "Las consultas usan variables bind: los umbrales del perfil nunca se concatenan al SQL.",
        "Separación de funciones: el instrumento propone y el DBA aplica. Un auditor que corrige lo que audita pierde independencia.",
      ],
      preguntas: [
        [
          "¿Por qué el instrumento no aplica el correctivo directamente?",
          "Porque tendría que tener privilegios de administrador, lo que contradice el mínimo privilegio, y porque todo cambio en producción pasa por la gestión de cambios del DBA.",
        ],
        [
          "¿Cómo se genera el SQL del correctivo sin riesgo de inyección?",
          "Desde una plantilla del catálogo; los nombres de objetos se validan antes de incorporarse. Si un valor no es seguro, el instrumento pide revisarlo a mano.",
        ],
      ],
    },
    terminos: ["observable", "hallazgo", "correctivo", "preventivo", "detectivo", "reobservar"],
  },

  correctivos: {
    titulo: "Script correctivo",
    queEs:
      "El script correctivo consolidado de una ejecución, ordenado por severidad, para que el DBA lo revise y lo aplique.",
    queMuestra: [
      "Un encabezado con la empresa y la ejecución, y una sección por observable con su nota y su control preventivo.",
      "El SQL por hallazgo, sin sentencias repetidas.",
    ],
    comoProbar: [
      "Pulsa «Copiar» o «Descargar .sql».",
      "Revisa el script y complétalo donde pida decisiones propias (por ejemplo el predicado de VPD o los archivos de TDE).",
      "Pruébalo primero en un ambiente de prueba y con respaldo previo.",
    ],
    esperado: [
      "Lo que el instrumento no puede inventar (reglas de negocio, rutas de archivos) viene comentado y marcado para completar.",
      "Los controles que ya cumplen no aparecen.",
    ],
    siguiente: ["Aplica el script, vuelve a observar y compara en la Matriz."],
    defensa: {
      enunciado: "Fase Hacer del PHVA y entregable 2: scripts .sql. Es el control correctivo de cada hallazgo.",
      rubrica: "Pruebas técnicas y scripts (15 %): scripts funcionales.",
      argumentos: [
        "Ordenado por severidad: lo más grave primero, para que el DBA priorice.",
        "Honesto con sus límites: lo que depende del negocio (predicado VPD, ubicación del wallet) viene marcado para completar, no inventado.",
        "Cada sección trae también su control preventivo, para que el hallazgo no vuelva.",
      ],
      preguntas: [
        [
          "¿Qué pasa si aplico el script dos veces?",
          "Las sentencias se deduplican dentro del script; volver a aplicarlo puede dar errores inofensivos de Oracle (por ejemplo, revocar algo ya revocado). Por eso se recomienda un ambiente de prueba primero.",
        ],
      ],
    },
    terminos: ["correctivo", "preventivo", "tde", "vpd"],
  },

  planMejora: {
    titulo: "Plan de mejora",
    queEs:
      "Lo que sigue pendiente después de una ejecución, con la acción correctiva y el control preventivo, ordenado por prioridad. Es la fase «Actuar» del ciclo PHVA.",
    queMuestra: [
      "Los observables en No cumple y en No evaluable, con su prioridad (1 es la más urgente).",
      "La acción recomendada y el control preventivo de cada uno.",
    ],
    comoProbar: [
      "Abre un observable con su enlace para ver el detalle.",
      "Vuelve a observar tras corregir y comprueba que la lista se reduce.",
    ],
    esperado: [
      "Un «No evaluable» pide habilitar la visibilidad del auditor, no corregir la base.",
      "Si no queda nada pendiente, la pantalla lo indica.",
    ],
    siguiente: ["Convierte los preventivos en procedimientos de la empresa."],
    defensa: {
      enunciado: "Fase Actuar del PHVA: lo que queda pendiente se convierte en acciones con prioridad.",
      rubrica: "Matriz de evaluación y controles observables (20 %) y la sección «Plan de mejora» del informe.",
      argumentos: [
        "Distingue entre arreglar la base (No cumple) y arreglar la visibilidad del auditor (No evaluable).",
        "La prioridad sale de la severidad del observable (alta 1, media 2, baja 3); un No evaluable queda en 2. El orden se puede justificar.",
      ],
      preguntas: [
        [
          "¿Qué hace la empresa con este plan?",
          "Lo usa como lista de trabajo del DBA hasta la siguiente auditoría. Al volver a observar, lo resuelto desaparece del plan.",
        ],
      ],
    },
    terminos: ["phva", "preventivo", "noEvaluable"],
  },

  "catalogo-matriz": {
    titulo: "Matriz-instrumento",
    queEs:
      "La matriz-instrumento: la lista genérica de controles evaluables. Es el corazón del instrumento y no menciona a ninguna empresa.",
    queMuestra: [
      "Por cada observable: el control ISO, el riesgo, la tarea del DBA, el alcance y la severidad.",
      "Al desplegarlo: la consulta SQL, la plantilla del correctivo, el control preventivo y las limitaciones.",
    ],
    comoProbar: [
      "Despliega OBS-09 y lee su consulta: usa variables bind y NOT EXISTS.",
      "Compara la plantilla del correctivo con la que ves después en un hallazgo real.",
    ],
    esperado: ["Agregar un control es agregar una entrada al catálogo y su archivo .sql, sin tocar el código del sistema."],
    siguiente: ["Mira el Mapeo de controles para ver por qué cada mecanismo mitiga su riesgo."],
    defensa: {
      enunciado: "Producto esperado, punto 4: lista de controles observables por un auditor externo. Obligatorio: scripts de verificación.",
      rubrica: "Matriz de evaluación y controles observables (20 %).",
      argumentos: [
        "24 observables cubren los 15 controles del enunciado y 4 extras justificados.",
        "Es la idea central del proyecto: el conocimiento del auditor vive en datos (catálogo y archivos .sql), no en el código.",
        "Cada observable trae su correctivo y su preventivo: los tres tipos de control para el mismo riesgo.",
      ],
      preguntas: [
        [
          "¿Cómo agregaría un control nuevo?",
          "Escribo la consulta en instrumento/sql/observables/OBS-25.sql y su entrada en catalogo_controles.json con control, riesgo, tarea, regla, correctivo y preventivo. El motor lo toma sin cambios de código.",
        ],
      ],
    },
    terminos: ["observable", "alcance", "correctivo", "preventivo"],
  },

  "catalogo-mapeo": {
    titulo: "Mapeo de controles",
    queEs:
      "El mapeo de controles que pide la asignación: para cada control, qué riesgo mitiga, qué tarea lo ejecuta y por qué su mecanismo funciona en Oracle.",
    queMuestra: ["Control, riesgos, tareas del DBA, justificación del mecanismo, implementación en Oracle y evidencia observable."],
    comoProbar: [
      "Lee la justificación de A8.11: explica cómo Data Redaction evita que un desarrollador vea datos reales.",
      "Sigue un riesgo (por ejemplo R-CONF-03) por todos los controles que lo mitigan.",
    ],
    esperado: ["Cada justificación cita un riesgo real y describe un mecanismo concreto, no una frase genérica."],
    siguiente: ["Revisa la Batería de pruebas."],
    defensa: {
      enunciado: "Producto esperado, punto 3: mapeo de controles ISO con implementación sugerida y evidencia observable.",
      rubrica: "Mapeo y justificación de controles ISO (20 %): selección correcta A5/A8, justificación y evidencia.",
      argumentos: [
        "La justificación explica el mecanismo técnico, no solo repite el nombre del control.",
        "La evidencia observable es la consulta concreta (por ejemplo DBA_SYS_PRIVS o V$ENCRYPTION_WALLET), como en el ejemplo del enunciado.",
      ],
      preguntas: [
        [
          "¿Por qué A8.11 y no solo A8.24 para proteger datos sensibles?",
          "Porque cifrar en disco (TDE) no impide que un usuario con SELECT vea el dato. Data Redaction lo oculta al consultarlo; son defensas en capas distintas.",
        ],
      ],
    },
    terminos: ["redaction", "tde", "vpd", "rconf"],
  },

  "catalogo-bateria": {
    titulo: "Batería de pruebas",
    queEs:
      "La batería de pruebas que pide la asignación: ID, tipo, procedimiento, resultado esperado y herramienta de cada observable.",
    queMuestra: ["Una fila por observable con el archivo .sql a ejecutar, las variables que usa y lo que se espera."],
    comoProbar: [
      "Abre el archivo indicado en el procedimiento y ejecútalo a mano en SQL Developer; las variables son JSON, por ejemplo [\"USUARIO1\"].",
      "Compara lo que devuelve con lo que muestra el instrumento: debe coincidir.",
    ],
    esperado: [
      "Todos los resultados esperados terminan en «0 filas»: cada fila devuelta es un hallazgo.",
      "Las pruebas negativas que dependen de los usuarios de una empresa son opcionales y viven en el laboratorio de esa empresa.",
    ],
    siguiente: ["Mira los Riesgos y las Tareas."],
    defensa: {
      enunciado: "Producto esperado, punto 6: batería de pruebas (ID, Tipo, Procedimiento, Resultado esperado, Herramienta).",
      rubrica: "Pruebas técnicas y scripts (15 %): scripts funcionales y resultados esperados realistas.",
      argumentos: [
        "Cada prueba se puede reproducir fuera del instrumento, en SQL Developer, que es la herramienta que pide el enunciado.",
        "El resultado esperado es verificable: cero filas. No hay interpretación.",
      ],
      preguntas: [
        [
          "¿Qué es una prueba negativa y por qué no está aquí?",
          "Es comprobar que un usuario no puede hacer algo (por ejemplo, que recepción no lea expedientes). Depende de los usuarios de cada empresa, así que vive en su laboratorio y no en el catálogo genérico.",
        ],
      ],
    },
    terminos: ["observable", "hallazgo"],
  },

  "catalogo-riesgos": {
    titulo: "Riesgos R-CONF",
    queEs: "Los riesgos de confidencialidad (R-CONF) con su escala: probabilidad de 1 a 5 por impacto de 1 a 5.",
    queMuestra: [
      "Un mapa de calor de 5×5 con cada riesgo en su casilla.",
      "Por riesgo: descripción, causa, consecuencia, justificación de la escala y relación con la Ley 8968.",
    ],
    comoProbar: ["Despliega un riesgo y comprueba que su nivel es probabilidad × impacto.", "Ubica en el mapa el riesgo que más te preocupa."],
    esperado: ["Nivel 1-6 es Bajo, 8-12 es Medio y 15-25 es Alto."],
    siguiente: ["Revisa las Tareas del DBA que ejecutan los controles."],
    defensa: {
      enunciado: "Objetivo específico 1 y producto esperado, punto 1: tabla de riesgos R-CONF con impacto y probabilidad (mínimo 5; hay 6).",
      rubrica: "Identificación de riesgos y tareas DBA (20 %): claridad, completitud y pertinencia técnica.",
      argumentos: [
        "Cada riesgo justifica su probabilidad y su impacto, y se relaciona con la Ley 8968.",
        "Ningún riesgo queda huérfano: todos tienen al menos un control y un observable que los mide.",
      ],
      preguntas: [
        [
          "¿Por qué ese riesgo tiene impacto 5?",
          "Abre el riesgo: la justificación de la escala explica la consecuencia concreta (por ejemplo, exposición masiva de expedientes de salud, que la Ley 8968 trata como datos sensibles).",
        ],
      ],
    },
    terminos: ["rconf", "ley8968"],
  },

  "catalogo-tareas": {
    titulo: "Tareas del DBA",
    queEs: "Las 12 tareas críticas del DBA que ejecutan los controles, con su frecuencia y los riesgos que cubren.",
    queMuestra: ["Cada tarea con su descripción, su frecuencia recomendada y los riesgos asociados."],
    comoProbar: ["Elige una tarea (por ejemplo T-06 Backup) y busca qué observable la evidencia."],
    esperado: ["Todos los riesgos y todas las tareas tienen al menos un observable."],
    siguiente: ["Vuelve al Dashboard y relaciona un hallazgo con su tarea."],
    defensa: {
      enunciado: "Objetivo específico 2 y producto esperado, punto 2: al menos 12 tareas críticas del DBA.",
      rubrica: "Identificación de riesgos y tareas DBA (20 %).",
      argumentos: [
        "Las 12 tareas son las que lista el enunciado: usuarios, privilegios, autenticación, TDE, masking, backup, auditoría, parcheo, listener, eliminación segura, logs y clones DEV/TEST.",
        "Cada tarea tiene frecuencia: convierte el control en una rutina del DBA.",
      ],
      preguntas: [["¿Qué tarea ejecuta el control A8.13?", "La de respaldos (backup): OBS-17 comprueba que los respaldos recientes estén cifrados."]],
    },
    terminos: ["rconf", "preventivo"],
  },

  "catalogo-perfil": {
    titulo: "Perfil por defecto",
    queEs: "Los umbrales y patrones por defecto que usa el instrumento. Cada empresa puede sobrescribir solo lo que necesite.",
    queMuestra: ["Los parámetros (días de inactividad, intentos fallidos, vigencia, cuentas autorizadas...) y los patrones de datos sensibles."],
    comoProbar: ["Anota un parámetro y cámbialo para una empresa en el Pre-vuelo."],
    esperado: ["Las claves que no existen en este perfil se rechazan, para detectar errores de digitación."],
    siguiente: ["Cambia un umbral en una empresa y observa cómo cambia un resultado sin tocar la base."],
    defensa: {
      enunciado: "Escalabilidad pedida por el profesor: la política se separa del motor.",
      rubrica: "Mapeo y justificación de controles ISO (20 %).",
      argumentos: ["Los umbrales salen de buenas prácticas (por ejemplo, bloqueo tras pocos intentos fallidos) y cada empresa los ajusta a su política sin tocar código."],
      preguntas: [
        [
          "¿Qué pasa si una empresa tiene una política más estricta?",
          "Escribe en su perfil solo el umbral que cambia, por ejemplo {\"dias_inactividad\": 30}. El resultado cambia sin tocar la base ni el código.",
        ],
      ],
    },
    terminos: ["perfil", "descubrimiento"],
  },

  practica: {
    titulo: "Práctica",
    queEs:
      "Una guía de práctica con escenarios paso a paso para ver funcionar el instrumento: provocas un hallazgo, lo observas, lo corriges y confirmas que se cerró.",
    queMuestra: [
      "La preparación necesaria, la conexión SQL que se usa y los escenarios por nivel.",
      "En cada escenario: el SQL a ejecutar, qué hacer en el instrumento y el resultado que debes ver.",
    ],
    comoProbar: [
      "Haz primero la preparación y una ejecución «base».",
      "Despliega un escenario y sigue los pasos en orden.",
      "Al terminar, usa el bloque «Deshacer» para dejar la base como estaba.",
    ],
    esperado: ["Si lo que ves no coincide con el resultado esperado, revisa que hayas observado después del cambio y con la actividad de usuarios renovada."],
    siguiente: ["Repite el escenario cambiando el objeto afectado y predice el resultado antes de observar."],
    defensa: {
      enunciado: "Sección 7: Oracle 21c XE y SQL Developer. Sirve para el video de 5 minutos.",
      rubrica: "Pruebas técnicas y scripts (15 %) y Presentación y video (10 %).",
      argumentos: [
        "Cada escenario demuestra en vivo un ciclo completo: provocar, observar, corregir y re-observar.",
        "Los escenarios se verificaron contra Oracle: el resultado esperado es el que realmente aparece.",
      ],
      preguntas: [["¿Puede mostrar que el instrumento detecta un cambio en vivo?", "Sí: el escenario de SELECT ANY TABLE lo provoca, OBS-10 lo detecta y el bloque «Deshacer» lo revierte."]],
    },
    terminos: ["observable", "reobservar", "phva"],
  },

  documentacion: {
    titulo: "Defensa y documentación",
    queEs: "Dónde está cada pieza que pide el enunciado dentro del sistema, cómo se reparte la rúbrica, el guion del video y los documentos del proyecto.",
    queMuestra: [
      "El mapa del enunciado: cada punto del producto esperado con el enlace a la pantalla que lo cumple.",
      "La rúbrica con su peso y dónde está la evidencia de cada criterio.",
      "Los pasos para auditar una empresa nueva y la lista de documentos con su ruta.",
    ],
    comoProbar: ["Recorre el mapa del enunciado de arriba abajo antes de la presentación: cada enlace abre la evidencia."],
    esperado: ["Con una empresa nueva solo cambian la conexión y el perfil: el catálogo y el motor son los mismos."],
    siguiente: ["Abre la Práctica para ejercitar el ciclo."],
    defensa: {
      enunciado: "Secciones 6, 9 y 10 del enunciado: producto esperado, rúbrica y entregables.",
      rubrica: "Todos los criterios: es el índice de la defensa.",
      argumentos: ["Cada punto del producto esperado tiene una pantalla y un archivo en el repositorio que lo respalda."],
      preguntas: [],
    },
    terminos: ["phva", "rconf", "observable", "madurez"],
  },
};
