# Métricas de calidad — evidencia final y serie histórica

**Corte:** 3 de noviembre de 2026 (Guatemala). Los resultados históricos conservan su fecha original.

## Resumen de medición final

| Indicador                    |           Valor verificado | Alcance                                |
| ---------------------------- | -------------------------: | -------------------------------------- |
| Pruebas automatizadas        | 140 aprobadas / 0 fallidas | Suite final del PR #7, run 41560908801 |
| Quality Gate                 |                     PASSED | SonarQube Cloud, PR #7                 |
| Cobertura de código nuevo    |                 **80,1 %** | Solo nuevas líneas cubribles del PR    |
| Umbral de SonarQube          |                   **80 %** | Sobre código nuevo                     |
| Hallazgos nuevos             |                          0 | Quality Gate del PR                    |
| Hotspots de seguridad nuevos |                          0 | Quality Gate del PR                    |
| Duplicación en código nuevo  |                      0,5 % | Quality Gate del PR                    |
| E2E                          |                   Aprobado | Electron + SQLite sintético y aislado  |

**Fuentes:** [run del PR](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801), [SonarQube](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7), [PR #7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7).

## Línea base histórica y limitaciones

El registro más antiguo disponible reporta **25 casos automatizados** sin conservación de aprobados/fallidos ni resultados de cobertura. La ejecución del **27/10/2026** registró 28/28 y 95,65 % de líneas, 80,60 % de ramas y 90,54 % de funciones, sobre una instrumentación diferente. La revisión **29/10/2026** registró 33/33 y 96,16 % de líneas, 81,55 % de ramas y 92,31 % de funciones sobre ese universo entonces evaluado.

**No calcular 80,1 % − 96,16 % como mejora o deterioro.** La cifra de SonarQube mide nuevas líneas del PR; la anterior fue una cobertura V8/c8 con otro conjunto de archivos. No existe una serie homogénea antes/después suficiente para atribuir una mejora porcentual de cobertura inicial.

## Umbrales implementados

- Comando `npm run test:coverage`: líneas ≥75 %, ramas ≥60 %, funciones ≥55 % (con exclusiones instrumentadas).
- SonarQube Cloud: cobertura del código nuevo ≥80 %.
- TypeScript, ESLint y Prettier: no se permiten errores bloqueantes; las pruebas fallidas detienen el job.
- SonarQube informó **Quality Gate PASSED** para el PR #7 y el pipeline reportó **success**.

## Pendientes de evidencia

El push de `main` [41562455432](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41562455432) pasó: 140/140, E2E y cobertura c8 de 88,90 % líneas, 80,75 % ramas y 73,61 % funciones. La protección está verificada por API y el repositorio es público.

## Alcance global de SonarQube

La API pública consultada el 03/11/2026 reporta 30,2 % de cobertura global, 3,8 % de duplicación global, 20 bugs, 1 vulnerabilidad y 15 code smells. En código nuevo reporta 80,0989 % de cobertura, 0,4816 % de duplicación y cero bugs, vulnerabilidades y code smells nuevos. El Quality Gate es OK. Los hallazgos globales permanecen como deuda técnica; la puerta de código nuevo no los elimina. Respuestas archivadas en `evidencias/cierre-20261103/sonar-metricas.json` y `sonar-quality-gate.json`.
