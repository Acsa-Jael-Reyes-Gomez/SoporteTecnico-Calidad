# Reporte de mejora del sistema de soporte técnico — cierre SQA

## Alcance

Se aplicaron controles automatizados sobre una aplicación Electron existente. El resultado final corresponde al [PR #7 fusionado](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7), validado con [GitHub Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801) y [SonarQube](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7).

## Comparación sustentada

| Indicador              | Línea base histórica                        | Cierre final verificado                                       |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Casos registrados      | 25; sin resultados individuales conservados | 140/140 aprobados en el run final                             |
| Cobertura              | No medida en la línea base inicial          | 80,1 % sobre código nuevo del PR; sin base homogénea anterior |
| CI/CD verificable      | No existe resultado inicial comparable      | Pipeline del PR `success`                                     |
| Análisis estático      | Sin resultado inicial comparable            | TypeScript, ESLint, Prettier y Quality Gate aprobados         |
| Revisión independiente | Sin métrica inicial comparable              | Dos aprobaciones registradas en PR #7                         |
| Fusión                 | No aplica a línea base                      | PR #7 integrado a `main` (SHA `7697745`)                      |

**La ganancia comprobable** es la incorporación de un proceso repetible de controles, 140 pruebas y revisión antes del merge; no es correcto restar porcentajes de cobertura medidos sobre archivos o períodos distintos.

## Calidad y riesgos

SonarQube reportó 0 problemas nuevos, 0 nuevos hotspots de seguridad y 0,5 % de duplicación en código nuevo. La cobertura de código nuevo fue 80,1 %, superando el mínimo del Quality Gate (80 %).

La propietaria revisó una regla de protección de `main` que obliga a usar Pull Request, aprobación y el check del trabajo de calidad. En PR #8 se reforzó además el workflow con `sonar.qualitygate.wait=true` y fallo ante ausencia de `SONAR_TOKEN`; se debe comprobar una nueva ejecución antes de fusionar. Continúan pendientes el acceso del docente y el video MP4 obligatorio.

## Evidencias

- [PR #7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7).
- [GitHub Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801).
- [SonarQube](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7).
- [Informe final](Informe-Final.md) y [métricas](calidad/METRICAS_CALIDAD.md).
\n## Evidencia de control negativo\n\nUna captura histórica de PR #7 muestra **Quality Gate FAILED** por cobertura de código nuevo **70,7 %**, inferior al **80 %** requerido. Después, el panel final de SonarQube muestra **Quality Gate PASSED** con **80,1 % de cobertura de código nuevo**. La captura negativa demuestra que SonarQube detectó y reportó la condición, pero no permite por sí sola afirmar que el job de GitHub Actions falló; por eso se fortaleció el workflow del PR #8 con espera explícita de Quality Gate.\n