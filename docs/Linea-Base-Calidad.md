# Línea base de calidad y criterios de comparación

## Registro inicial

La evidencia histórica anterior a los controles SQA registra **25 casos de prueba**, sin una medición inicial de cobertura ni un registro completo de su resultado aprobado/fallido. No se inventa ningún porcentaje inicial.

## Mediciones históricas posteriores

| Corte              | Pruebas        | Cobertura                                        | Tipo de medición              |
| ------------------ | -------------- | ------------------------------------------------ | ----------------------------- |
| Inicio documentado | 25 registradas | No medida                                        | Sin base comparativa completa |
| 27/10/2026         | 28/28          | 95,65 % líneas; 80,60 % ramas; 90,54 % funciones | V8/c8 de esa revisión         |
| 29/10/2026         | 33/33          | 96,16 % líneas; 81,55 % ramas; 92,31 % funciones | V8/c8 de esa revisión         |
| Cierre PR #7       | 140/140        | **80,1 % de cobertura del código nuevo**         | SonarQube, alcance distinto   |

La medición final se acreditó en [Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801) y [SonarQube](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7).

## Interpretación

Los porcentajes V8/c8 históricos y el porcentaje SonarQube de nuevas líneas no tienen el mismo denominador, por lo que no se presenta una mejora porcentual falsa. La evolución comprobable del proceso incluye más pruebas, ejecución automática, revisión independiente y Quality Gate aprobado.

Ver [Reporte de mejora](Reporte-Mejora.md) y [Métricas finales](calidad/METRICAS_CALIDAD.md).

## Evidencia adicional de ejecución final

El run 41564667224 validó **140 pruebas aprobadas y 0 fallidas**; c8 informó **88,90 % de líneas**, **80,75 % de ramas** y **73,61 % de funciones**. El valor **80,1 %** procede de SonarQube y mide código nuevo, mientras que la cobertura **30,2 %** del panel general de SonarQube tiene otro alcance. No son porcentajes comparables con la cobertura inicial no medida.
