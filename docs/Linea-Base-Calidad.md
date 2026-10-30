> Actualizado el 29/10/2026: los valores posteriores son mediciones locales de la revisión actual con SQLite. El run remoto 40599606066 es anterior y se registra como evidencia separada.

# Línea base de calidad y resultado posterior

## Criterio de comparación

La línea base representa el estado inicial documentado antes de incorporar controles de SQA. Los valores iniciales provienen del registro histórico de `docs/calidad/METRICAS_CALIDAD.md`; no se inventan resultados que no fueron medidos. El historial Git disponible no conserva una revisión ejecutable de la aplicación anterior al pipeline, así que no es posible repetir las mismas mediciones sobre ese estado. El estado posterior actual se midió localmente el **29 de octubre de 2026** con Node.js 22.16.0.

## Comparación

| Indicador                      |                Estado inicial documentado |                                                  Estado posterior medido | Evidencia y límite                                                                                                     |
| ------------------------------ | ----------------------------------------: | -----------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------- |
| Casos automatizados declarados |                                        25 |                                                                       33 | Conteo documentado inicialmente frente a la suite local actual; el resultado aprobado/fallido inicial no se conservó   |
| Pruebas aprobadas              |                   Sin medición registrada |                                                                 33 de 33 | `npm test` y GitHub Actions PR #1, 29/10/2026; 28/28 del run anterior se conserva como histórico                       |
| Cobertura de líneas            |                                 No medida |                                                                   96.16% | Cobertura local de Node; umbral 75%; evidencia en `docs/calidad/evidencias/local-20261029/npm-test-coverage.log`       |
| Cobertura de ramas             |                                 No medida |                                                                   81.55% | Cobertura local de Node; umbral 60%                                                                                    |
| Cobertura de funciones         |                                 No medida |                                                                   92.31% | Cobertura local de Node; umbral 55%                                                                                    |
| Errores de TypeScript          |                                No medidos |                                                                        0 | `npm run typecheck` terminó correctamente                                                                              |
| Linter                         |                            No configurado |                              ESLint configurado; sin errores bloqueantes | `npm run lint` terminó correctamente; las advertencias se silencian con `--quiet`                                      |
| Formato                        | Sin verificación automatizada documentada |                                                        Prettier aprobado | `npm run format:check` terminó correctamente                                                                           |
| Pipeline CI                    |                                No existía | Configurado para push y pull_request; ejecución local y remota aprobadas | Workflow activo en la rama normalizada `cierre-requisitos-sqa`                                                         |
| Análisis SonarCloud            |                                 No medido |                                             Conectado; Quality Gate `OK` | Organización, clave de proyecto y secreto configurados                                                                 |
| Protección de rama             |               No configurada inicialmente |                                               Reglas activadas en `main` | Se exigen PR, aprobación independiente, resolución de conversaciones y el check `Compilar, probar y verificar calidad` |

## Alcance de las pruebas

La suite contiene pruebas unitarias, integración controlada con dobles, pruebas del adaptador SQLite en memoria, regresiones de código fuente y una prueba E2E que inicia Electron con una base temporal. La matriz de casos está en `docs/Matriz-Pruebas.md`.

## Interpretación

La mejora demostrable es automatizar 33 casos, compilar y revisar tipos, exigir umbrales de cobertura, ejecutar ESLint/Prettier y conservar reportes. SonarCloud aporta análisis automático adicional y su última revisión aprobó el Quality Gate. La cobertura inicial no se midió; por ello no se calcula una diferencia de cobertura.
