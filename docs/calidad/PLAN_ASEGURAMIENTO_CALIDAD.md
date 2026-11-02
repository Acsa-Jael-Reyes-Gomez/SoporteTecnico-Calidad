# Plan de aseguramiento de la calidad

El plan vigente y completo está en [`../SQA-Plan.md`](../SQA-Plan.md). Este archivo se conserva como acceso desde la carpeta de calidad para facilitar la consulta en el paquete de evidencias.

## Controles actuales

| Control              | Herramienta/comando                    | Criterio                                       |
| -------------------- | -------------------------------------- | ---------------------------------------------- |
| Compilación          | `npm run build`                        | Código de salida 0                             |
| Pruebas              | `npm test`                             | Todas aprobadas                                |
| Cobertura            | `npm run test:coverage`                | Líneas >= 75%, ramas >= 60%, funciones >= 55%  |
| Tipos                | `npm run typecheck`                    | 0 errores TypeScript                           |
| Análisis estático    | `npm run lint`                         | Sin errores bloqueantes de ESLint              |
| Formato              | `npm run format:check`                 | Todos los archivos configurados pasan Prettier |
| Integración continua | GitHub Actions, workflow `quality.yml` | Etapas aprobadas en `push` y `pull_request`    |

## Límites

Las pruebas de consulta usan dobles y no se conectan a una base MySQL/ODBC. No hay pruebas E2E ni resultados SonarCloud registrados. La protección de `main` debe configurarse aparte en GitHub. La ejecución y métricas actuales se documentan en `EVIDENCIAS_EJECUCION.md` y `METRICAS_CALIDAD.md`.
