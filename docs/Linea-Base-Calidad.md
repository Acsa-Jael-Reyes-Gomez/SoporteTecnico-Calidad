# Línea base de calidad

## Punto de partida

En una copia anterior del sistema se encontraron **25 casos de prueba definidos**. No se conservaron resultados suficientes para saber cuántos pasaron ni una cobertura inicial comparable.

Por esa razón, no calculé un porcentaje de mejora desde el inicio: sería una comparación incorrecta.

## Resultados del proyecto

| Indicador | Resultado final |
|---|---:|
| Pruebas | 146 de 146 aprobadas |
| Prueba E2E | Aprobada |
| Líneas c8 | 83,30 % |
| Ramas c8 | 70,41 % |
| Funciones c8 | 94,66 % |
| Quality Gate del PR técnico | Aprobado |
| Cobertura de código nuevo en SonarQube | 86,5 % |

La cobertura de c8 solo considera los archivos cargados dentro de su configuración; no representa toda la aplicación. SonarQube utiliza una medición distinta.

## Qué cambió

Ahora el proyecto tiene pruebas automáticas, medición de cobertura, análisis estático y verificaciones en GitHub Actions. Los detalles están en el [reporte de mejora](Reporte-Mejora.md) y en las [evidencias](calidad/EVIDENCIAS_EJECUCION.md).
