# Métricas de calidad

## Medición inicial disponible

No existía una medición automatizada de cobertura ni un pipeline CI antes de este trabajo. Se identificaron 25 pruebas declaradas y no había comandos de cobertura o de análisis TypeScript sin emisión.

## Medición posterior

Medición ejecutada el 15 de octubre de 2026 con Node 22.16.0:

| Indicador              |                   Antes |                    Después | Evidencia                       |
| ---------------------- | ----------------------: | -------------------------: | ------------------------------- |
| Pruebas declaradas     |                      25 |                         28 | `node --test tests/*.test.js`   |
| Pruebas aprobadas      | Sin medición registrada |                   28 de 28 | Ejecución local verificada      |
| Cobertura de líneas    |               No medida |                     95.62% | `npm run test:coverage`         |
| Cobertura de ramas     |               No medida |                     80.60% | `npm run test:coverage`         |
| Cobertura de funciones |               No medida |                     90.54% | `npm run test:coverage`         |
| Errores TypeScript     |               No medido |                          0 | `npm run typecheck`             |
| Pipeline CI            |              No existía | GitHub Actions configurado | `.github/workflows/quality.yml` |

## Umbrales

Los umbrales de 75% de líneas, 60% de ramas y 55% de funciones se derivan de la primera medición. Quedan por debajo del resultado observado para evitar fallos arbitrarios, pero impiden una caída importante de la cobertura.

## Interpretación

La cobertura global incluye archivos de prueba. La métrica más útil para seguimiento está en los servicios cargados: `validation_service`, `pagination_service`, `export_security`, `domain_utils`, `report_query_service` y `session_store`.

## Reproducción el 26 de octubre de 2026

Se volvieron a ejecutar `npm test`, `npm run test:coverage` y `npm run typecheck` sobre el código de aplicación sin cambios. Los tres resultados coinciden con la medición posterior registrada arriba: 28/28 pruebas, 95.62% líneas, 80.60% ramas, 90.54% funciones y 0 errores TypeScript. No se verificó GitHub Actions ni SonarCloud.
