## Vigencia despues del cambio a SQLite

La tabla inicial conserva la fotografía histórica del 27/10/2026, anterior al adaptador SQLite. La medición local actual del 29/10/2026 aparece en una sección separada y se acompaña de su log de cobertura.

# Métricas de calidad

## Línea base

El registro histórico del proyecto indica 25 casos automatizados antes de la intervención. En ese momento no había medición de cobertura, comandos de verificación TypeScript ni pipeline CI. No se registró el resultado aprobado/fallido de aquellos 25 casos; por eso no se compara su tasa de aprobación con la actual.

## Medición posterior reproducida

Ejecución local del **27 de octubre de 2026**, Node.js 22.16.0, después de compilar el código. El comando `npm run test:coverage` produjo:

| Indicador              |                              Resultado |     Umbral del pipeline | Estado   |
| ---------------------- | -------------------------------------: | ----------------------: | -------- |
| Casos aprobados        |                               28 de 28 |                28 de 28 | Aprobado |
| Cobertura de líneas    |                                 95.65% |                     75% | Aprobado |
| Cobertura de ramas     |                                 80.60% |                     60% | Aprobado |
| Cobertura de funciones |                                 90.54% |                     55% | Aprobado |
| TypeScript             |                              0 errores |                       0 | Aprobado |
| ESLint                 |                Sin errores bloqueantes | Sin errores bloqueantes | Aprobado |
| Prettier               | Todos los archivos indicados coinciden |         Sin diferencias | Aprobado |
| Build                  |                 Finalizó correctamente |      Código de salida 0 | Aprobado |

La cobertura la informa Node.js con instrumentación V8. No se configuró LCOV y no se envió cobertura a SonarCloud.

## Ejecución remota

El propietario confirmó el run remoto **40599606066**, workflow Quality Gate, en verde en GitHub el 27 de octubre de 2026. El run fue un `push` a `main` para el commit `fix: corregir formato de documentos SQA`; no valida las modificaciones SQLite locales que aún no estaban en ese commit. Se archivó la salida del artefacto en `docs/calidad/evidencias/run-40599606066/`.

## Interpretación y límites

- El aumento de 25 a 28 casos procede del registro histórico frente al conteo actual. No se atribuye una mejora de cobertura porque la cobertura inicial no se midió.
- Las pruebas cubren principalmente servicios cargados desde `dist`, dobles de consulta, regresiones estáticas y SQLite aislado.
- Existe una prueba E2E de Electron que valida inicio, login, navegación y creación de un ticket. SonarCloud está conectado y la rama `main` cuenta con protección.
- Los umbrales se fijaron por debajo del resultado observado para detectar caídas futuras sin hacer que un cambio pequeño falle de forma arbitraria.

Consulte `docs/Linea-Base-Calidad.md` para la comparación y `docs/Matriz-Pruebas.md` para los casos.

## Medicion actual (29 de octubre de 2026)

Despues de compilar con `npm test`, la suite registro 33 de 33 casos aprobados. `npm run test:coverage` midio 96,16% de lineas, 81,55% de ramas y 92,31% de funciones. Los tres indicadores superan los umbrales del pipeline (75%, 60% y 55%). TypeScript, ESLint y Prettier finalizaron correctamente. La medicion inicial de cobertura no existe, asi que no se calcula una mejora porcentual antes/despues.

## Diferencia entre evidencia histórica y actual

El artefacto histórico `40599606066` confirma 28/28 pruebas antes de SQLite. La medición actual corresponde a 33/33 pruebas y 96,16% / 81,55% / 92,31% de cobertura. SonarCloud registró un Quality Gate `OK`.
