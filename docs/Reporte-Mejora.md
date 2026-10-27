# Reporte de mejora de calidad

## Criterio de comparación

Se toma como línea base el código fuente encontrado el 26 de octubre de 2026, antes de modificar la documentación y el workflow. No hubo cambios al código de la aplicación ni a sus pruebas en esta sesión; las mediciones reproducidas describen ese mismo estado funcional.

| Métrica                               | Inicial                                      | Final disponible                                        | Diferencia             | Herramienta / evidencia                                       | Interpretación                            |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------- | ---------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Casos declarados                      | 28                                           | 28                                                      | 0                      | Conteo de `test()` en los dos archivos                        | No se añadieron ni quitaron pruebas       |
| Pruebas aprobadas                     | 28/28 declaradas, resultado anterior anotado | 28/28                                                   | Reproducido            | npm test, Node 22.16.0                                        | Ambas suites pasaron                      |
| Cobertura de líneas                   | 95.62% anotado históricamente                | 95.62%                                                  | 0.00 pp                | npm run test:coverage                                         | Supera 75%                                |
| Cobertura de ramas                    | 80.60% anotado históricamente                | 80.60%                                                  | 0.00 pp                | npm run test:coverage                                         | Supera 60%                                |
| Cobertura de funciones                | 90.54% anotado históricamente                | 90.54%                                                  | 0.00 pp                | npm run test:coverage                                         | Supera 55%                                |
| Errores de TypeScript                 | 0 anotados históricamente                    | 0                                                       | 0                      | npm run typecheck                                             | Ejecución final correcta                  |
| Errores ESLint                        | No disponible                                | No disponible                                           | No calculable          | ESLint no está instalado                                      | Lint pendiente de dependencia y política  |
| Bugs / vulnerabilidades / code smells | No disponible                                | No disponible                                           | No calculable          | Sin escáner local ni SonarCloud configurado                   | No se cuantifican                         |
| Pipeline CI                           | Workflow existente en ramas principales      | BUILD/TEST/ANALYZE/REPORT en push y PR a cualquier rama | Configuración ampliada | .github/workflows/quality.yml; ejecución remota no verificada | Su eficacia debe comprobarse en GitHub    |
| Estado Git                            | No disponible                                | No disponible                                           | No calculable          | `.git` vacío; ejecutable ausente                              | Historial y cambios previos sin verificar |

## Cambios realizados

- Se aclaró en README y manuales que la arquitectura real es Electron/TypeScript/JavaScript con MySQL/ODBC.
- Se agregaron diagnóstico, plan SQA, línea base, manual técnico/usuario y este reporte.
- Se amplió el workflow para distinguir BUILD, TEST, ANALYZE y REPORT; se guarda la salida de pruebas y cobertura como artefactos.
- Se dejó SonarCloud opcional, condicionado a variables y secreto del repositorio.

## Evidencia histórica separada

El documento METRICAS_CALIDAD.md preexistente registra un resultado del 15 de octubre de 2026. Las métricas de pruebas, cobertura y TypeScript se reprodujeron el 26 de octubre con el código de aplicación sin cambios.

## Acciones para cerrar la medición

Quedan pendientes la ejecución remota del workflow, el análisis SonarCloud y la configuración de ESLint. La cobertura refleja principalmente servicios y regresiones estáticas; no representa cobertura E2E ni pruebas con una base MySQL.
