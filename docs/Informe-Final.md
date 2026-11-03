# Informe final — Pipeline CI/CD con aseguramiento de calidad integrado

**Sistema:** Soporte Técnico (Electron, Renderer JavaScript/CSS, Preload y Main TypeScript, SQLite)
**Corte de evidencia:** 2 de noviembre de 2026 (Guatemala); las marcas UTC de GitHub figuran el 3 de noviembre.
**Repositorio:** https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad

## 1. Objetivo y alcance

Aplicar aseguramiento de calidad a una aplicación existente, sin reconstruirla desde cero. El workflow `.github/workflows/quality.yml` ejecuta compilación, pruebas unitarias/de integración/de regresión, prueba E2E controlada, cobertura, análisis estático y publicación de evidencias. La aplicación no usa React/Express/MySQL: se conserva la arquitectura Electron original, variante permitida en el enunciado con justificación.

## 2. Resultados finales verificados

| Aspecto                     | Resultado                                                                             | Evidencia                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pruebas automatizadas       | **140 aprobadas; 0 fallidas**                                                         | [Run 41560908801](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801)                        |
| Prueba E2E                  | Electron, Preload/IPC, autenticación, Tickets, inserción persistida en SQLite aislado | Misma ejecución, paso E2E                                                                                                          |
| Pipeline de PR              | **completed / success**                                                               | [GitHub Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801)                         |
| SonarQube: Quality Gate     | **PASSED**                                                                            | [Dashboard del PR #7](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7)               |
| Cobertura de código nuevo   | **80,1 %**; mínimo del Quality Gate: 80 %                                             | Mismo dashboard                                                                                                                    |
| Hallazgos nuevos            | 0 problemas nuevos y 0 hotspots de seguridad nuevos                                   | Mismo dashboard                                                                                                                    |
| Duplicación de código nuevo | 0,5 %                                                                                 | Mismo dashboard                                                                                                                    |
| Revisión manual             | 2 eventos de aprobación registrados                                                   | [PR #7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7)                                                    |
| Integración a main          | PR #7 fusionado; commit `76977452bddfd4b204a51057f84e76eb9e6cc34a`                    | [Commit de merge](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/commit/76977452bddfd4b204a51057f84e76eb9e6cc34a) |

**Precisión de métricas:** el 80,1 % corresponde a la cobertura de _código nuevo del PR_ en SonarQube, no a la cobertura total de la aplicación. El comando `npm run test:coverage` conserva umbrales de 75 % de líneas, 60 % de ramas y 55 % de funciones para el conjunto instrumentado por c8.

## 3. Línea base y comparación

El expediente histórico registra **25 casos de prueba**, pero no conserva el número de aprobados/fallidos ni una medición inicial de cobertura. Por ello no se atribuye a la intervención una ganancia porcentual de cobertura desde el origen.

| Indicador                     | Antes documentado                             | Resultado final verificado    |
| ----------------------------- | --------------------------------------------- | ----------------------------- |
| Casos de prueba registrados   | 25 (sin resultado histórico individual)       | 140 aprobados / 0 fallidos    |
| Cobertura inicial equivalente | No medida                                     | 80,1 % _solo de código nuevo_ |
| Automatización CI y SQA       | Sin resultado inicial reproducible comparable | Workflow de PR exitoso        |
| Análisis SonarQube            | Sin métrica inicial equivalente verificable   | Quality Gate PASSED           |
| Revisión de cambios           | Sin medición inicial comparable               | 2 aprobaciones del PR #7      |

No se deben mezclar tasas de cobertura V8 global, c8 con exclusiones y cobertura de código nuevo de SonarQube: miden universos diferentes.

## 4. Controles del pipeline

1. **CONSTRUIR:** compilar aplicación Electron/TypeScript.
2. **PROBAR:** suites automatizadas, E2E de Electron con SQLite sintético y umbrales c8.
3. **ANALIZAR:** TypeScript, ESLint, Prettier, SonarQube Cloud y su Quality Gate.
4. **REPORTAR:** artefacto `quality-reports`, resultados y LCOV.

La ejecución de PR contiene evidencia de la respuesta de los controles. Para verificar la condición de que **no se pueda omitir el pipeline en main**, hay que confirmar además un ruleset o branch protection habilitado; una aprobación voluntaria no equivale a política obligatoria.

## 5. Requisitos faltantes o pendientes de corroborar

- **Protección de main:** la propietaria comprobó en **Settings → Branches** una regla para `main` con Pull Request obligatorio, aprobación y check `Compilar, probar y verificar calidad`. La captura de configuración no está guardada; confirmar que la regla bloquee cambios en un PR posterior.
- **Pipeline tras la fusión:** el resultado del PR está aprobado, pero la ejecución _push_ específica del merge a `main` no está confirmada en este informe. Verificar en Actions sobre el SHA `7697745`.
- **Acceso del docente:** invitar al docente con permiso de lectura, o publicar el repositorio solo tras auditar secretos y datos.
- **Presentación:** se preparó un PowerPoint de 10 diapositivas con capturas auténticas del pipeline, pruebas, cobertura, SonarQube y PR #7, acompañado de anexo de evidencias y guion con pronunciación. Adjuntar los archivos PDF finales a la entrega.
- **Video obligatorio:** entregar MP4 de 4–5 min, al menos 720p, con narración y demostración del flujo (rama, cambio, PR, pipeline, Quality Gate, dashboard, comparativa y conclusiones). El guion no sustituye la grabación.
- **Matriz de pruebas:** su inventario histórico de 33 casos no es la enumeración completa de los 140 casos del run final. Consultar los nombres de pruebas del artefacto `test-results.log`.

## 6. Evidencias para anexar

- GitHub Actions: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801
- PR fusionado y aprobaciones: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7
- SonarQube: https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7
- Commit fusionado: https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/commit/76977452bddfd4b204a51057f84e76eb9e6cc34a

## 7. Conclusión

El flujo SQA del PR terminó aprobado, con 140 pruebas automatizadas, recorrido E2E y Quality Gate superado. La regla de protección de `main` fue revisada por la propietaria. En PR #8 se reforzó el workflow para que el trabajo falle si SonarQube reporta un Quality Gate fallido. Falta comprobar esa nueva ejecución, fusionar la documentación y entregar el video MP4.
