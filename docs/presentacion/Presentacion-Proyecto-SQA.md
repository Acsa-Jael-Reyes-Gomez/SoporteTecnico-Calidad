# Presentación del proyecto SQA

**Guion de 10 diapositivas en español.** El contenido sigue el orden indicado en el enunciado y corresponde al estado verificable de `main`.

## 1. Portada

**Pipeline CI/CD con aseguramiento de calidad integrado**  
Sistema: soporte técnico
Estudiante: Acsa Jael Reyes Gómez · Curso: Aseguramiento de la Calidad del Software · Fecha: 29 de octubre de 2026

## 2. Objetivo y alcance

- El proyecto parte de una aplicación de escritorio que ya estaba desarrollada.
- El objetivo fue agregar controles automáticos para revisar los cambios antes de integrarlos.
- El trabajo cubre compilación, pruebas, cobertura, análisis estático, documentación y flujo de CI.
- No se cambió la arquitectura funcional del sistema ni se conectaron las pruebas a datos reales.

## 3. Sistema y herramientas

- La aplicación usa Electron: Renderer para la interfaz, Preload como puente y Main para la lógica del sistema.
- La interfaz está hecha con JavaScript y CSS; el código principal usa TypeScript.
- La información se guarda en SQLite mediante node:sqlite; cada instalacion conserva una base local.
- Se usan `node:test`, cobertura V8, TypeScript, ESLint, Prettier y GitHub Actions.
- No se migró a React ni Express porque no forman parte de la aplicación existente.

## 4. Diagrama del pipeline

`push` o `pull_request` → **CONSTRUIR** → **PROBAR** → **ANALIZAR** → **REPORTAR**

- GitHub Actions ejecuta el workflow en Windows con Node.js 22.
- `npm ci` instala las dependencias fijadas en el lockfile.
- La etapa de pruebas ejecuta casos y calcula cobertura; el reporte se conserva como artefacto.
- El workflow se ejecuta en los eventos configurados. Que el check sea obligatorio para fusionar depende de la protección de rama en GitHub.
  La rama principal exige un pull request, una revisión independiente y el check `Compilar, probar y verificar calidad`.

## 5. Línea base

| Dato inicial documentado               | Resultado                          |
| -------------------------------------- | ---------------------------------- |
| Casos de prueba registrados            | 25                                 |
| Cobertura de líneas, ramas y funciones | No medida                          |
| Resultado histórico aprobado/fallido   | No conservado                      |
| Ejecución del pipeline inicial         | No se guardó evidencia verificable |

La información inicial disponible es incompleta. Por eso se conserva como línea base histórica y no se calculan porcentajes de mejora que no se pueden comprobar.

## 6. Métricas antes y después de integrar SQLite

| Métrica                | Antes (run 40599606066) | Actual (run 40974928285) |   Cambio |
| ---------------------- | ----------------------: | -----------------------: | -------: |
| Pruebas aprobadas      |                   28/28 |                    33/33 | +5 casos |
| Cobertura de líneas    |                  95.65% |                   96.16% | +0.51 pp |
| Cobertura de ramas     |                  80.60% |                   81.55% | +0.95 pp |
| Cobertura de funciones |                  90.54% |                   92.31% | +1.77 pp |

Los dos runs usaron Node 22 y los mismos umbrales. Esta comparación corresponde a la versión anterior y la actual; no se presenta como una mejora desde el inicio del proyecto SQA. La línea base original registró 25 casos, pero no conservó cobertura ni tasa de aprobación.

## 7. Captura real del pipeline

El último run de `main`, [41095687713](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41095687713), aprobó después de fusionar el PR #5. El workflow realiza compilación, pruebas, recorrido E2E, cobertura, TypeScript, ESLint, Prettier y SonarCloud.

## 8. Dashboard o reporte de calidad

SonarCloud está conectado con la organización `acsa-jael-reyes-gomez` y el proyecto `Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad`. El Quality Gate es `OK` y los informes de GitHub Actions se conservan como artefactos.

## 9. Conclusiones y aprendizajes

- Aprendí que se puede agregar un flujo de calidad a una aplicación existente sin reescribirla.
- Las pruebas y los umbrales permiten detectar fallos de compilación, regresiones y formato antes de integrar cambios.
- Cinco pruebas nuevas ejercitan SQLite en memoria y verifican la semilla; aprobaron junto al recorrido E2E.
- La entrega técnica está cerrada. Falta grabar el video explicativo real de 4 a 5 minutos.

## 10. Referencias

- [ISO/IEC/IEEE 29119-2:2021, procesos de prueba](https://www.iso.org/standard/79428.html).
- [ISO/IEC/IEEE 29119-3:2021, documentación de pruebas](https://www.iso.org/cms/live/live/en/sites/isoorg/contents/data/standard/07/94/79429.html).
- [ISO/IEC 25010:2023, modelo de calidad del producto](https://www.iso.org/standard/78176.html).
- Repositorio del proyecto: `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad`.
