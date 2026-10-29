> Este documento conserva la ejecucion historica del 27/10/2026 y agrega la verificacion local del 29/10/2026 posterior a la migracion SQLite.

# Evidencias de ejecución

## Verificación local

La siguiente ejecución del **27 de octubre de 2026**, con Node.js 22.16.0, corresponde a la revisión previa a SQLite y se conserva como evidencia histórica:

```powershell
npm run build
npm run test:coverage
npm run typecheck
npm run lint
npm run format:check
```

Resultados: build correcto; 28 pruebas aprobadas y 0 fallidas; cobertura de 95.65% de líneas, 80.60% de ramas y 90.54% de funciones; TypeScript sin errores; ESLint sin errores bloqueantes; y Prettier aprobado. La cobertura supera los umbrales configurados de 75%, 60% y 55%.

Las pruebas no iniciaron Electron. Las pruebas de consulta utilizan dobles.

## GitHub Actions

El workflow terminó en verde en GitHub el 27 de octubre de 2026. El run 40599606066 fue un `push` a `main` del commit `fix: corregir formato de documentos SQA`, anterior a SQLite. No valida los cambios locales sin publicar descritos en la sección siguiente.

El workflow creó el artefacto `quality-reports`, descargado y archivado en `docs/calidad/evidencias/run-40599606066/`.

## SonarCloud y protección de rama

SonarCloud solo se ejecuta cuando existen las variables `SONAR_ORGANIZATION` y `SONAR_PROJECT_KEY` y el secreto `SONAR_TOKEN`. No hay evidencia de un análisis remoto exitoso ni de un dashboard configurado.

La ejecución verde no demuestra por sí sola que `main` esté protegida. La regla que exige PR, aprobación y el check **Puerta de calidad** debe verificarse en la configuración del repositorio.

## Verificacion local actual (29/10/2026)

`npm test` y `npm run test:coverage` finalizaron con compilacion correcta, 33 pruebas aprobadas y 0 fallidas. La cobertura V8 fue 96,16% de lineas, 81,55% de ramas y 92,31% de funciones, por encima de 75%, 60% y 55%. `npm run typecheck`, `npm run lint` y `npm run format:check` tambien pasaron. ESLint reporto inicialmente 17 errores de estilo; se corrigieron antes de la segunda ejecucion.

## Verificacion del run remoto 40599606066 (29/10/2026)

La salida de `gh run list` compartida por el usuario identifica el run 40599606066 como exitoso (Quality Gate, rama `main`, evento `push`, titulo `fix: corregir formato de documentos SQA`, duracion 1m6s). Esta salida actualiza la nota historica que indicaba que no habia ID de ejecucion. La copia local contiene cambios sin commit; este run remoto no verifica esos cambios posteriores. Para comprobar sus pasos individuales, ejecutar `gh run view 40599606066 --repo Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad --verbose`.

### Detalle de pasos y artefacto

La salida `gh run view 40599606066 --verbose` confirma el job `Build, tests and quality checks` exitoso. Pasaron checkout, instalacion de dependencias, BUILD, pruebas, umbrales de cobertura, TypeScript, ESLint, Prettier y carga de reportes. SonarCloud se marco como condicional y no configurado; el paso de reporte de esa ausencia termino correctamente. GitHub Actions informa el artefacto `quality-reports`. La ejecucion valida la revision publicada del run, no las modificaciones sin commit de la copia local.

### Artefactos descargados y verificados

El artefacto `quality-reports` se descargó en `docs/calidad/evidencias/run-40599606066/`. `test-results.log` confirma 28 pruebas aprobadas, 0 fallidas. `coverage.txt` reporta 95,65% de líneas, 80,60% de ramas y 90,54% de funciones. Es evidencia del commit remoto de ese run. La suite local posterior a los cambios SQLite es distinta: 33 pruebas y cobertura de 96,16%, 81,55% y 92,31%, respectivamente; no deben mezclarse ambos resultados.

## Verificación remota de la revisión SQLite (29/10/2026)

Se publicó la rama `codex/cierre-requisitos-sqa` y se abrió el PR [#1](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/1), actualmente abierto y sin fusionar. Los runs [40969600668](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40969600668) (`push`) y [40969607082](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40969607082) (`pull_request`) aprobaron el job `Compilar, probar y verificar calidad`. Ambos ejecutaron build, 33 pruebas, cobertura, TypeScript, ESLint, Prettier y reporte; SonarCloud fue omitido porque no está configurado.

El artefacto `quality-reports` del run de PR se descargó en `docs/calidad/evidencias/run-40969607082/`. Confirma 33 aprobadas, 0 fallidas y 96,16% de líneas, 81,55% de ramas y 92,31% de funciones. El PR está abierto y sin fusionar.

## Verificación remota más reciente (29/10/2026)

Los runs [40973155260](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40973155260) (`push`) y [40973160326](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40973160326) (`pull_request`) aprobaron en GitHub Actions. El artefacto del PR se descargó desde GitHub y quedó archivado en `docs/calidad/evidencias/run-40973160326/quality-reports/`.

`test-results.log` registra las 33 pruebas aprobadas. `coverage.txt` informa 96,16% de líneas, 81,55% de ramas y 92,31% de funciones, por encima de los umbrales 75%, 60% y 55%. Este artefacto no incluye logs de análisis estático; el workflow se actualizó para adjuntarlos en sus próximas ejecuciones. SonarCloud se omitió porque no está configurado; el PR sigue abierto sin revisión independiente. La plantilla ahora reserva un espacio para registrar la revisión y su resultado, pero eso no equivale a una aprobación.

## Reejecución local de cierre (29/10/2026)

Se volvieron a ejecutar los comandos sobre el estado de trabajo después de actualizar la documentación. Todos terminaron con código 0:

| Verificación            | Resultado                                     | Archivo                                                    |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `npm run build`         | Aprobado                                      | `evidencias/local-reinicio-20261029/run-build.log`         |
| `npm test`              | 33 aprobadas, 0 fallidas                      | `evidencias/local-reinicio-20261029/test.log`              |
| `npm run test:coverage` | 96,16% líneas; 81,55% ramas; 92,31% funciones | `evidencias/local-reinicio-20261029/run-test-coverage.log` |
| `npm run typecheck`     | Aprobado                                      | `evidencias/local-reinicio-20261029/run-typecheck.log`     |
| `npm run lint`          | Aprobado                                      | `evidencias/local-reinicio-20261029/run-lint.log`          |
| `npm run format:check`  | Aprobado                                      | `evidencias/local-reinicio-20261029/run-format-check.log`  |

También pasó `git diff --check`. Estos resultados verifican build, pruebas y controles estáticos automatizados; no equivalen a una revisión humana independiente ni a una prueba manual de la interfaz Electron.

## Verificación local de cierre (29/10/2026)

Se repitieron las verificaciones desde la rama `codex/cierre-requisitos-sqa`, commit `bc1e1ea`:

| Comando                 | Resultado                                                         | Evidencia                                           |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| `npm run build`         | Aprobado                                                          | `evidencias/local-cierre-20261029/build.log`        |
| `npm test`              | 33 aprobadas, 0 fallidas                                          | `evidencias/local-cierre-20261029/test-results.log` |
| `npm run test:coverage` | 96,16% líneas; 81,55% ramas; 92,31% funciones; umbrales aprobados | `evidencias/local-cierre-20261029/coverage.txt`     |
| `npm run typecheck`     | Aprobado, 0 errores                                               | `evidencias/local-cierre-20261029/typecheck.log`    |
| `npm run lint`          | Aprobado, 0 errores bloqueantes                                   | `evidencias/local-cierre-20261029/lint.log`         |
| `npm run format:check`  | Aprobado                                                          | `evidencias/local-cierre-20261029/format-check.log` |

Los logs son salidas textuales reproducibles, no capturas de pantalla ni evidencia de una ejecución manual de Electron.
