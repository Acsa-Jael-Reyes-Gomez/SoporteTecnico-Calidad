# Reporte de mejora del sistema de soporte técnico — cierre SQA

## Alcance

Se aplicaron controles automatizados sobre una aplicación Electron existente. El resultado final corresponde al [PR #7 fusionado](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7), validado con [GitHub Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801) y [SonarQube](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7).

## Comparación sustentada

| Indicador | Línea base histórica | Cierre final verificado |
| --- | --- | --- |
| Casos registrados | 25; sin resultados individuales conservados | 140/140 aprobados en el run final |
| Cobertura | No medida en la línea base inicial | 80,1 % sobre código nuevo del PR; sin base homogénea anterior |
| CI/CD verificable | No existe resultado inicial comparable | Pipeline del PR `success` |
| Análisis estático | Sin resultado inicial comparable | TypeScript, ESLint, Prettier y Quality Gate aprobados |
| Revisión independiente | Sin métrica inicial comparable | Dos aprobaciones registradas en PR #7 |
| Fusión | No aplica a línea base | PR #7 integrado a `main` (SHA `7697745`) |

**La ganancia comprobable** es la incorporación de un proceso repetible de controles, 140 pruebas y revisión antes del merge; no es correcto restar porcentajes de cobertura medidos sobre archivos o períodos distintos.

## Calidad y riesgos

SonarQube reportó 0 problemas nuevos, 0 nuevos hotspots de seguridad y 0,5 % de duplicación en código nuevo. La cobertura de código nuevo fue 80,1 %, superando el mínimo del Quality Gate (80 %).

La protección obligatoria de `main` continúa pendiente de evidencia; también deben verificarse el acceso del docente, la ejecución `push` posterior al merge y el video obligatorio.

## Evidencias

- [PR #7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7).
- [GitHub Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801).
- [SonarQube](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7).
- [Informe final](Informe-Final.md) y [métricas](calidad/METRICAS_CALIDAD.md).
