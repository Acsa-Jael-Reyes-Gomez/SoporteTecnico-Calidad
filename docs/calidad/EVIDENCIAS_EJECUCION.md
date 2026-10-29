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
