# Guion de exposición y notas del presentador

## 1. Portada

Buenos días. Mi nombre es Acsa Jael Reyes Gómez, estudiante de Ingeniería en Sistemas de la Universidad Mariano Gálvez de Guatemala. Presento el proyecto Pipeline CI/CD con Aseguramiento de Calidad Integrado. Trabajé sobre el Sistema de Soporte Técnico existente: conservé su arquitectura Electron y SQLite e incorporé un proceso para comprobar los cambios antes de integrarlos. La exposición distingue los resultados históricos de las verificaciones finales. El video se entrega por separado y continúa pendiente.

**Pronunciación:** CI/CD: ce-i, ce-de; pipeline: páip-lain; SQA: es-kiu-ei.

**¿Creaste la aplicación desde cero?**

No. Reutilicé una aplicación existente, como exige el enunciado, y trabajé sobre sus controles de calidad.

**¿El proyecto ya está integrado por completo?**

La versión final está en el PR #8. La aprobación independiente y la fusión requieren intervención autorizada; no presento esa integración como realizada.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 2. Objetivo y alcance

El objetivo es detectar regresiones antes de incorporar cambios a main. El alcance incluye compilación, pruebas unitarias, integración con SQLite aislado, regresiones, un recorrido E2E, cobertura, análisis estático y revisión humana. No todas las pantallas tienen un recorrido E2E: ese caso comprueba inicio, autenticación y creación persistida de un ticket. Los otros módulos conservan las verificaciones específicas indicadas en la matriz. La protección de main obliga a pasar las verificaciones y obtener una aprobación.

**Pronunciación:** E2E: i-tu-i; main: mein; pull request: pul ri-kuést.

**¿Qué significa regresión?**

Que una modificación no debe romper un comportamiento previamente esperado; por eso conservé los casos existentes.

**¿El E2E prueba toda la aplicación?**

No. Comprueba un flujo real completo de Tickets; no equivale a cobertura funcional de todos los módulos.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 3. Tecnologías y arquitectura

La aplicación utiliza Renderer con JavaScript y CSS, un puente Preload y lógica Main en TypeScript. La interfaz envía solicitudes por IPC y Main valida sesión, permisos y datos antes de consultar SQLite. No fue necesario migrar a React, Express ni MySQL porque el enunciado acepta proyectos previos y variantes justificadas. Las pruebas usan datos sintéticos en memoria o en directorios temporales, de forma que no modifican información operativa.

**Pronunciación:** Electron: e-lec-tron; TypeScript: táip-skript; SQLite: es-kiu-el-áit; IPC: i-pe-ce; Preload: prí-loud.

**¿Por qué SQLite?**

Conserva la arquitectura de escritorio y permite ejecutar una copia sin instalar un servidor de base de datos.

**¿Para qué sirve Preload?**

Expone las operaciones permitidas a la interfaz mediante un puente controlado; la pantalla no accede directamente a la base.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 4. Pipeline CI/CD

El flujo se organiza en construir, probar, analizar y reportar. La compilación y los controles locales se ejecutan en todos los push y pull requests. SonarQube se ejecuta en los pull requests y en los push de main; esta condición evita la restricción del plan para ramas secundarias sin retirar las otras comprobaciones. El job exige el token y espera el Quality Gate. Los reportes se guardan como artefactos incluso si una etapa anterior falla. Main exige un PR revisado y checks actualizados. El diagrama presenta las etapas conceptuales; en el workflow el artefacto se publica antes del análisis remoto final.

**Pronunciación:** Build: bild; test: test; analyze: á-na-laiz; report: ri-pórt; quality gate: kuóliti gueit.

**¿Por qué no corre Sonar en todos los push?**

El plan no permite ese análisis de ramas; los PR y main sí lo ejecutan obligatoriamente, y las otras verificaciones continúan en todo push.

**¿Cómo se bloquea un cambio defectuoso?**

Los comandos propagan su código de error, el gate de cobertura conserva sus umbrales y el scanner espera el resultado de Sonar. La protección exige el check aprobado.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 5. Línea base

La línea base histórica registra veinticinco casos, pero no conserva una medición inicial completa de cobertura ni todos los resultados individuales. Por eso no afirmo que la cobertura haya crecido desde un porcentaje desconocido. Los antecedentes de 28 y 33 pruebas pertenecen a revisiones posteriores que ya tenían controles. La evolución demostrable es la ampliación del inventario, el uso de pruebas aisladas, el pipeline obligatorio y la revisión. La comparación debe mantener el mismo alcance para ser válida.

**Pronunciación:** Baseline: béis-lain; coverage: có-ve-rich; métricas: valores medidos con alcance y fecha.

**¿Por qué no hay porcentaje de mejora inicial?**

Porque no existe una medición anterior equivalente; inventarla o restar porcentajes de alcances distintos sería incorrecto.

**¿Qué mejora sí puedes demostrar?**

La implantación del proceso y el conjunto de casos aprobados, además de los defectos concretos y regresiones documentados.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 6. Resultados y cobertura

El cierre conserva las ciento cuarenta pruebas originales y agrega seis regresiones justificadas: ahora son ciento cuarenta y seis aprobadas, sin fallos ni omitidas. El gate de c8 mide código de aplicación cargado por la suite, excluye los archivos de pruebas y conserva la exclusión previa del Renderer. La cobertura final es ochenta y tres coma treinta por ciento de líneas, setenta coma cuarenta y uno por ciento de ramas y noventa y cuatro coma sesenta y seis por ciento de funciones. Las dos capturas originales de abajo son históricas: muestran las ciento cuarenta pruebas y el porcentaje previo al ajuste del denominador. No las presento como el resultado final ni como cobertura de toda la aplicación. Los mínimos se conservan en 75, 60 y 55 por ciento.

**Pronunciación:** c8: si-éit; branches: brán-ches; functions: fánk-shons; statements: stéit-ments.

**¿Por qué cambió el porcentaje sin perder pruebas?**

Porque antes se incluía el propio código de tests en el denominador. Se corrigió el alcance y no se redujeron los umbrales.

**¿Este porcentaje cubre toda la aplicación?**

No. Describe código de aplicación cargado en ese comando. SonarQube analiza otro universo y publica además una cobertura global distinta.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 7. Pipeline y E2E

Estas capturas originales muestran una ejecución real de GitHub Actions y el recorrido E2E. Se conservan como antecedente verificable, sin modificar los valores visibles. El cierre posterior vuelve a ejecutar la misma secuencia: abre Electron, comprueba Preload e IPC, inicia sesión, navega a Tickets, crea un registro y confirma su persistencia en una base SQLite temporal. La evidencia actual está enlazada en las notas y en los reportes de la entrega. El E2E es un paso adicional a los ciento cuarenta y seis casos del runner.

**Pronunciación:** GitHub Actions: guít-jab ák-shons; E2E: i-tu-i; IPC: i-pe-ce.

**¿Cómo sabes que se guardó y no solo apareció en pantalla?**

La prueba consulta el archivo SQLite temporal después del envío y comprueba el registro persistido.

**¿Se utilizaron datos reales?**

No. El caso prepara esquema y usuarios ficticios y fija una ruta temporal aislada para Electron.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 8. SonarQube y hallazgos

La captura grande conserva el resultado histórico de main: 80,1 por ciento de cobertura nueva y 0,48 por ciento de duplicación. La captura pequeña muestra un check Sonar fallido anterior; no demuestra por sí sola un fallo del job con la nueva espera. El PR número ocho aprobó con ochenta y seis coma cinco por ciento de cobertura de código nuevo, cero por ciento de duplicación nueva y cero hallazgos nuevos. La cobertura global histórica es 30,2 por ciento y no equivale a las otras cifras. Se revisaron los 36 hallazgos originales. Las variables compartidas tienen declaración y orden de carga demostrados por pruebas; no se redeclararon. El permiso de estilos inline permanece abierto y documentado porque retirarlo sin migración afectaría la interfaz.

**Pronunciación:** SonarQube: só-nar kiub; passed: past; failed: féild; duplications: diu-pli-kéi-shons; inline: in-láin.

**¿Gate aprobado significa cero defectos globales?**

No. El gate se aplica a sus condiciones y a código nuevo. El código histórico puede conservar hallazgos y la documentación los identifica.

**¿Qué hiciste con los BLOCKER?**

Revisé su regla y contexto. Son asignaciones a bindings compartidos declarados en compartido.js. Se documentan y prueban sin desactivar la regla ni cambiar el estado compartido.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 9. Conclusiones

La automatización combina resultados repetibles con revisión humana. El PR #7 tuvo dos eventos de aprobación de la misma cuenta revisora y tres checks aprobados antes de fusionarse. El PR #8 sigue sujeto a aprobación independiente y no se fusiona automáticamente. Entre los aprendizajes están controlar promesas, separar el código de pruebas del cálculo de cobertura y conservar evidencias históricas sin confundirlas con resultados actuales. La deuda residual y sus motivos están documentados; la presentación no declara el proyecto al cien por ciento mientras falten integración autorizada y video.

**Pronunciación:** Checks: cheks; merge: merch; main: mein; code smell: koud smel.

**¿Hubo dos revisores?**

No. GitHub registra dos eventos APPROVED de una misma cuenta. Esa precisión se conserva en el informe.

**¿Qué queda por hacer manualmente?**

Aprobación y fusión autorizada del PR, verificar el push posterior en main, entregar los archivos en la plataforma y grabar el video al final.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md

## 10. Referencias

Las fuentes son el enunciado del curso, el repositorio, las ejecuciones de Actions, los PR y el dashboard de SonarQube. Los enlaces del PowerPoint conducen a los registros reales. La matriz final relaciona los casos con sus archivos, líneas, preparación y aserciones, mientras que el inventario original de ciento cuarenta permanece como antecedente. El anexo amplía las capturas originales y las evidencias de cierre. El video MP4 es un entregable separado de cuatro a cinco minutos, con mínimo 720p, y todavía no se presenta como entregado. Muchas gracias.

**Pronunciación:** README: ríd-mi; workflow: uérk-flou; MP4: eme-pe-cuatro.

**¿Dónde verifico las cifras?**

En los logs y artefactos de Actions y en la API/dashboard de Sonar, respetando el commit, la fecha y el alcance de cada medición.

**¿El guion sustituye al video?**

No. Falta grabar, abrir y comprobar un MP4 real de cuatro a cinco minutos y al menos 720p.

Fuentes: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8 ; https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592 ; docs/calidad/HALLAZGOS_SONAR.md
