# Presentación del proyecto SQA

**Guion de 10 diapositivas en español.** El contenido está redactado para una exposición de estudiante y sigue el orden indicado en el enunciado. Este guion todavía debe maquetarse y exportarse a PDF; las capturas marcadas como pendientes deben sustituirse por imágenes reales del repositorio.

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

## 5. Línea base

| Dato inicial documentado               | Resultado                          |
| -------------------------------------- | ---------------------------------- |
| Casos de prueba registrados            | 25                                 |
| Cobertura de líneas, ramas y funciones | No medida                          |
| Resultado histórico aprobado/fallido   | No conservado                      |
| Ejecución del pipeline inicial         | No se guardó evidencia verificable |

La información inicial disponible es incompleta. Por eso se conserva como línea base histórica y no se calculan porcentajes de mejora que no se pueden comprobar.

## 6. Resultado posterior

| Métrica                |         Resultado actual | Criterio del proyecto |
| ---------------------- | -----------------------: | --------------------: |
| Casos automatizados    | 33 aprobados, 0 fallidos |   Todos deben aprobar |
| Cobertura de líneas    |                   96.16% |                   75% |
| Cobertura de ramas     |                   81.55% |                   60% |
| Cobertura de funciones |                   92.31% |                   55% |
| Errores de TypeScript  |                        0 |                     0 |

Estos valores corresponden a la ejecución local registrada el 29 de octubre de 2026 tras integrar SQLite. Como la cobertura inicial no se midió, no se presenta como un aumento frente a la línea base. El run remoto 40599606066 es anterior y cubrió 28 casos.

## 7. Captura real del pipeline

La revisión actual pasó en el PR #1. Los runs 40969146165 (`push`) y 40969163670 (`pull_request`) aprobaron. Inserta una captura auténtica de GitHub Actions donde se vean el nombre del workflow, la rama, el ID y el resultado; no uses el run histórico 40599606066 como evidencia de la versión SQLite.

El usuario confirmó el run remoto 40599606066 en verde. Inserta una captura auténtica de GitHub Actions donde se vea el nombre del workflow, la rama, el ID y el resultado. Este run es previo a SQLite; cuando se publique la revisión actual debe reemplazarse o añadirse evidencia de su propio run.

## 8. Dashboard o reporte de calidad

**Evidencia disponible:** el artefacto del run de PR está guardado en `docs/calidad/evidencias/run-40969163670/quality-reports/` y contiene los resultados reales. Inserta aquí una captura auténtica del artefacto o del reporte generado.

SonarCloud está condicionado a configurar la organización, la clave del proyecto y el token. No hay un análisis ni dashboard SonarCloud registrado, así que no se reportan bugs, vulnerabilidades o code smells.

## 9. Conclusiones y aprendizajes

- Aprendí que se puede agregar un flujo de calidad a una aplicación existente sin reescribirla.
- Las pruebas y los umbrales permiten detectar fallos de compilación, regresiones y formato antes de integrar cambios.
- Cinco pruebas nuevas ejercitan SQLite en memoria y verifican la semilla; aprobaron en la suite local. Falta probar manualmente el arranque de Electron con una carpeta de datos temporal.
- Para cerrar la entrega faltan las capturas auténticas, resolver el requisito de protección de `main` con el plan de GitHub, exportar la presentación y grabar el video.

## 10. Referencias

- [ISO/IEC/IEEE 29119-2:2021, procesos de prueba](https://www.iso.org/standard/79428.html).
- [ISO/IEC/IEEE 29119-3:2021, documentación de pruebas](https://www.iso.org/cms/live/live/en/sites/isoorg/contents/data/standard/07/94/79429.html).
- [ISO/IEC 25010:2023, modelo de calidad del producto](https://www.iso.org/standard/78176.html).
- Repositorio del proyecto: `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad`.

## Archivos pendientes

Este documento es el guion, no el PDF/PPTX final. Para completar la presentación hay que maquetar las 10 diapositivas, insertar las capturas reales de las diapositivas 7 y 8 y exportar el archivo final. El video también requiere una grabación real de 4 a 5 minutos.
