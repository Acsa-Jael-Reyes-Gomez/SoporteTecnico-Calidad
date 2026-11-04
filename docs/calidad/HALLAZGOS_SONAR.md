# Hallazgos de SonarQube

La consulta inicial de `main` del 3 de noviembre de 2026 registró **36 hallazgos**: 20 bugs, 15 code smells y 1 vulnerabilidad. Por severidad clásica, eran 25 MAJOR y 11 BLOCKER. El [registro CSV](HALLAZGOS_SONAR.csv) conserva las claves, archivos y seguimiento de cada caso.

## Qué se revisó

| Regla            | Casos iniciales | Trabajo realizado en el PR técnico                                                                                                              |
| ---------------- | --------------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| typescript:S8786 |               4 | Se simplificaron expresiones de SQL y exportación para evitar procesamiento costoso. Se añadieron regresiones con entradas largas.              |
| typescript:S3923 |               1 | Se simplificó el cálculo de filas fijas, conservando los valores 5, 3 y 2 según el diseño.                                                      |
| Web:S7039        |               1 | Quedó pendiente la migración de estilos dinámicos; el riesgo se explica abajo.                                                                  |
| javascript:S2703 |              11 | Se documentaron las variables compartidas de `compartido.js` y se probó el orden de carga. Se consideraron posibles falsos positivos.           |
| javascript:S9383 |              14 | Se agregó manejo de errores en cargas de segundo plano, con mensajes y pruebas de recuperación.                                                 |
| javascript:S3403 |               2 | Se aclararon los tipos del paginador y de valores opcionales. Las pruebas conservan números y texto; se consideraron posibles falsos positivos. |
| javascript:S1764 |               1 | Se eliminó una condición repetida sin cambiar su resultado.                                                                                     |
| css:S4656        |               2 | Se quitaron declaraciones `box-shadow` anuladas por otra declaración y se regeneró el CSS.                                                      |

Las pruebas de estas correcciones están en [sqa-closeout.test.js](../../tests/sqa-closeout.test.js) y en las suites de exportación e interfaz. Los comentarios sobre variables compartidas describen las declaraciones existentes; no crean variables ni desactivan reglas.

## Estilos pendientes

`index.html` conserva `script-src 'self'` y `style-src 'self' 'unsafe-inline'`. La interfaz utiliza estilos dinámicos para menús, columnas y modales. El hallazgo Web:S7039 sigue registrado: una inyección de HTML o CSS podría alterar la presentación. Migrar esos estilos a clases requiere revisar las pantallas y queda como mejora futura.

## Resultado del PR técnico

La [ejecución 41690348592](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) aprobó las **146 pruebas**, el E2E y los controles de calidad. SonarQube respondió **Quality Gate aprobado**, con **86,5 % de cobertura nueva**, **0,0 % de duplicación nueva** y cero bugs, vulnerabilidades o code smells nuevos. La API del PR tampoco devolvió issues nuevos abiertos.

Las [evidencias JSON](evidencias/cierre-final-20261103/) conservan ese resultado del PR #8. Aprobar el código nuevo no demuestra que todos los hallazgos históricos estén resueltos. El CSV describe su tratamiento en esa revisión y no una consulta actual de `main`.

La cobertura c8 fue **83,30 % de líneas, 70,41 % de ramas y 94,66 % de funciones**. Sus mínimos siguen en **75 %, 60 % y 55 %**, respectivamente. Esa medición usa el alcance configurado, con los módulos Renderer excluidos; el LCOV de SonarQube se genera por separado. Los detalles están en [Métricas de calidad](METRICAS_CALIDAD.md).
