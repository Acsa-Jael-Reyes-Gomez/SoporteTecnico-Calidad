> Actualizado el 29/10/2026: los resultados locales actuales incluyen la integración SQLite. El run remoto 40599606066 es histórico y pertenece al commit publicado anterior.

# Reporte de mejora de calidad

## Resumen

Se añadió una puerta de calidad automatizada al sistema Electron existente. El cambio conserva las funciones del producto y permite comprobar compilación, pruebas, cobertura, tipos, estilo y calidad del código antes de integrar una modificación.

## Comparación antes y después

| Métrica                        |                       Antes |                                   Después | Cambio comprobable                                                           |
| ------------------------------ | --------------------------: | ----------------------------------------: | ---------------------------------------------------------------------------- |
| Casos automatizados declarados |     25 (registro histórico) |                                        33 | 8 más que el conteo inicial documentado; el resultado inicial no se conserva |
| Pruebas aprobadas              |                Sin registro |                                     33/33 | Suite local completa, 29/10/2026                                             |
| Cobertura de líneas            |                   No medida |                                    96.16% | Medición local; supera el umbral de 75%                                      |
| Cobertura de ramas             |                   No medida |                                    81.55% | Medición local; supera el umbral de 60%                                      |
| Cobertura de funciones         |                   No medida |                                    92.31% | Medición local; supera el umbral de 55%                                      |
| Verificación TypeScript        |                   No medida |                                 0 errores | `npm run typecheck` aprobado localmente                                      |
| Análisis ESLint                |              No configurado |                    Configurado y aprobado | `npm run lint` aprobado localmente                                           |
| Verificación de formato        |               No registrada |                                  Aprobada | `npm run format:check` aprobado localmente                                   |
| Integración continua           |                  No existía | GitHub Actions en `push` y `pull_request` | Workflow activo; ejecuciones verificadas en `cierre-requisitos-sqa`          |
| Análisis SonarCloud            |                   No medido |                         Quality Gate `OK` | Proyecto conectado a GitHub Actions                                          |
| Protección de `main`           | No configurada inicialmente |                                 Protegida | Se exige PR, revisión y check antes de fusionar                              |

## Cambios realizados

- Se añadieron controles automáticos de compilación, pruebas, umbrales de cobertura, TypeScript, ESLint y Prettier.
- Se guardan los informes de pruebas y cobertura como artefacto de GitHub Actions.
- Se documentaron estrategia, límites, deuda técnica, línea base y los 33 casos automatizados.
- Se fijaron finales de línea LF mediante `.gitattributes` para que Prettier valide igual en los equipos Windows y en Actions.
- Se conectó SonarCloud al pipeline y su Quality Gate aprobado se conserva como referencia de calidad.

## Limitaciones y acciones posteriores

Las consultas de negocio se prueban con dobles; el adaptador se cubre con SQLite en memoria y la semilla. También existe una prueba automática que inicia Electron con una base temporal, inicia sesión, navega a Tickets y crea un ticket. La comparación de cobertura inicial no es posible porque no se midió antes; las métricas actuales se usan como resultado posterior comprobable.

El resultado exacto de cobertura y las condiciones de ejecución están en `docs/Linea-Base-Calidad.md` y `docs/calidad/EVIDENCIAS_EJECUCION.md`.
