# Resumen de métricas para exponer

## Comparación de la línea base con el estado actual

| Indicador                 | Antes de aplicar SQA                       | Estado actual (29/10/2026)                     | Interpretación                                               |
| ------------------------- | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Casos de prueba anotados  | 25 registrados; sin resultado de ejecución | 33 aprobados, 0 fallidos                       | La suite creció; se desconoce la tasa inicial de aprobación  |
| Cobertura de líneas       | No medida                                  | 96.16% (umbral 75%)                            | No se calcula variación porcentual sin medición inicial      |
| Cobertura de ramas        | No medida                                  | 81.55% (umbral 60%)                            | No se calcula variación porcentual sin medición inicial      |
| Cobertura de funciones    | No medida                                  | 92.31% (umbral 55%)                            | No se calcula variación porcentual sin medición inicial      |
| Build y análisis estático | No se conserva evidencia inicial           | Build, TypeScript, ESLint y Prettier aprobados | Controles actuales ejecutados localmente y en GitHub Actions |
| Integración continua      | No había pipeline documentado              | Quality gate en `push` y `pull_request`        | Ejecuciones enlazadas abajo                                  |

El historial Git disponible no contiene una revisión ejecutable del producto anterior al pipeline. Los datos iniciales proceden del registro histórico; no se reconstruyen resultados inexistentes. El run 40599606066 es anterior a SQLite, pero ya corresponde a una revisión que tenía el pipeline y por eso no representa el estado pre-SQA.

## Estado inicial documentado

- 25 casos de prueba anotados en el registro histórico.
- No se registró la tasa de pruebas aprobadas.
- No se medía cobertura ni había una puerta CI documentada.
- No había verificación ESLint documentada.

## Evidencia remota histórica anterior a SQLite

El run [40599606066](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40599606066) registra 28/28 pruebas y cobertura de 95.65% de líneas, 80.60% de ramas y 90.54% de funciones. Es una medición histórica de una revisión con pipeline, no la línea base pre-SQA.

## Evidencia actual

Los runs [40974922468](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40974922468) (`push`) y [40974928285](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40974928285) (`pull_request`) pasaron. El artefacto con cobertura y logs de análisis estático está en `docs/calidad/evidencias/run-40974928285/quality-reports/`.

## Límites de interpretación

- No se midió cobertura antes de SQA; por eso no se afirma una mejora porcentual desde la línea base.
- SonarCloud está conectado al pipeline y el Quality Gate más reciente tiene estado `OK`.
- La rama `main` está protegida y exige PR, revisión y el check de calidad.
