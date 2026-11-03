# Métricas de calidad del cierre

**Fecha:** 3 de noviembre de 2026. **Revisión técnica:** 8f508f5, rama del PR #8.

## Resultados verificados

**146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

| Indicador                                  | Resultado                             | Criterio                       |
| ------------------------------------------ | ------------------------------------- | ------------------------------ |
| Casos node:test                            | 146 aprobados, 0 fallidos, 0 omitidos | Todos aprobados                |
| Líneas c8                                  | 83,30 %                               | ≥75 %                          |
| Ramas c8                                   | 70,41 %                               | ≥60 %                          |
| Funciones c8                               | 94,66 %                               | ≥55 %                          |
| E2E                                        | Aprobado; SQLite sintético aislado    | Persistencia comprobada        |
| Compilación, TypeScript, ESLint, Prettier  | Aprobados                             | Exit 0                         |
| Gate SonarQube del PR técnico              | PASSED                                | Espera obligatoria del scanner |
| Cobertura nueva SonarQube del PR técnico   | 86,5 %                                | ≥80 %                          |
| Duplicación nueva SonarQube del PR técnico | 0,0 %                                 | ≤3 %                           |

[PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) del commit `8f508f5`: aprobados. SonarQube del PR: **PASSED**, cobertura nueva **86,5 %**, duplicación nueva **0,0 %**. El último commit documental debe consultarse en los [checks del PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8).

## Alcance y denominadores

El gate c8 incluye únicamente `src/**`, excluye pruebas y herramientas del denominador y conserva la exclusión Renderer preexistente. Mide archivos de aplicación cargados por la suite; no equivale a cobertura de toda la aplicación. Los umbrales siguen siendo 75 % líneas, 60 % ramas y 55 % funciones. El comando `test:coverage:sonar` genera un LCOV de alcance distinto; SonarQube calcula su propia cobertura global y de código nuevo.

El recálculo exploratorio inicial de auditoría fue 83,24 % / 69,67 % / 94,59 % sobre el código entonces existente. La tabla anterior corresponde al código corregido y a sus seis casos adicionales. No sustituir estos alcances por un único porcentaje.

## Antecedentes

Las 25 pruebas iniciales son casos registrados sin resultado completo conservado. Las mediciones de 28/28 y 33/33 son históricas. El cierre previo de 140/140 y c8 88,90 % / 80,75 % / 73,61 % utilizó un denominador que incluía tests; se conserva como antecedente y no se compara como mejora porcentual con el nuevo alcance. Los 80,1 % de cobertura nueva y 30,2 % global de SonarQube corresponden al main anterior, no al porcentaje c8 corregido. No hay cobertura pre-SQA homogénea para calcular una mejora desde el origen.

| Revisión histórica                 | Pruebas        | Cobertura y alcance                                           |
| ---------------------------------- | -------------- | ------------------------------------------------------------- |
| Inicio documentado                 | 25 registradas | Sin cobertura equivalente conservada                          |
| 27/10/2026                         | 28/28          | V8/c8 entonces: 95,65 / 80,60 / 90,54 %                       |
| 29/10/2026                         | 33/33          | V8/c8 entonces: 96,16 / 81,55 / 92,31 %                       |
| Cierre PR #7 / main anterior       | 140/140        | c8 entonces: 88,90 / 80,75 / 73,61 %; incluía tests           |
| Sonar main previo a integrar PR #8 | Otro alcance   | 80,1 % nuevas líneas; 30,2 % global; 3,8 % duplicación global |

Main conserva la medición de 20 bugs, 15 code smells y 1 vulnerabilidad hasta una integración y reanálisis posteriores. No se afirma que los hallazgos estén cerrados en main porque las correcciones se publican únicamente en PR #8. Véase [revisión individual](HALLAZGOS_SONAR.md).

## Antecedente de julio de 2026 incorporado al cierre

Según el [historial documental aportado](antecedentes/Historial_Verificado_SoporteTecnico_PreSQA.md), la copia original contiene **25 casos definidos**: 22 en `tests/core-services.test.js` y 3 en `tests/envio-history.test.js`. No se conservan resultados de ejecución que acrediten aprobaciones o fallos ni un reporte inicial de cobertura. No se asigna 0 % ni se calcula una mejora porcentual entre coberturas incompatibles.

La copia utiliza Electron, JavaScript y TypeScript, con MySQL mediante ODBC. En el material examinado no aparecen configuraciones de GitHub Actions o SonarQube; esta ausencia se limita a esa copia. El informe aportado analiza archivos seleccionados y no acredita una ejecución del sistema antiguo. La arquitectura actual Electron y SQLite se conserva.

El resultado vigente sigue siendo **146 aprobadas, 0 fallidas**, c8 corregido **83,30 % líneas / 70,41 % ramas / 94,66 % funciones**. SonarQube del PR: **Quality Gate aprobado**, **86,5 % cobertura del código nuevo** y **0 % duplicación nueva**. Son mediciones con alcances distintos. Los resultados de 28, 33 y 140 casos y sus capturas se conservan como antecedentes. Video pendiente y PR #8 sin fusionar.
