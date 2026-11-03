# Línea base de calidad y evolución verificable

## Registro inicial

Las 25 pruebas iniciales son casos registrados sin resultado completo conservado. Las mediciones de 28/28 y 33/33 son históricas. El cierre previo de 140/140 y c8 88,90 % / 80,75 % / 73,61 % utilizó un denominador que incluía tests; se conserva como antecedente y no se compara como mejora porcentual con el nuevo alcance. Los 80,1 % de cobertura nueva y 30,2 % global de SonarQube corresponden al main anterior, no al porcentaje c8 corregido. No hay cobertura pre-SQA homogénea para calcular una mejora desde el origen.

## Resultado del cierre

**146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

El gate c8 incluye únicamente `src/**`, excluye pruebas y herramientas del denominador y conserva la exclusión Renderer preexistente. Mide archivos de aplicación cargados por la suite; no equivale a cobertura de toda la aplicación. Los umbrales siguen siendo 75 % líneas, 60 % ramas y 55 % funciones. El comando `test:coverage:sonar` genera un LCOV de alcance distinto; SonarQube calcula su propia cobertura global y de código nuevo.

[PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) del commit `8f508f5`: aprobados. SonarQube del PR: **PASSED**, cobertura nueva **86,5 %**, duplicación nueva **0,0 %**. El último commit documental debe consultarse en los [checks del PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8).

La mejora comprobable es el proceso reproducible, la trazabilidad, la conservación de los 140 casos previos, seis nuevas regresiones y las correcciones identificadas en [hallazgos](calidad/HALLAZGOS_SONAR.md). No se atribuye una ganancia porcentual a una línea base no medida. La serie histórica completa está en [métricas](calidad/METRICAS_CALIDAD.md).

## Antecedente de julio de 2026 incorporado al cierre

Según el [historial documental aportado](calidad/antecedentes/Historial_Verificado_SoporteTecnico_PreSQA.md), la copia original contiene **25 casos definidos**: 22 en `tests/core-services.test.js` y 3 en `tests/envio-history.test.js`. No se conservan resultados de ejecución que acrediten aprobaciones o fallos ni un reporte inicial de cobertura. No se asigna 0 % ni se calcula una mejora porcentual entre coberturas incompatibles.

La copia utiliza Electron, JavaScript y TypeScript, con MySQL mediante ODBC. En el material examinado no aparecen configuraciones de GitHub Actions o SonarQube; esta ausencia se limita a esa copia. El informe aportado analiza archivos seleccionados y no acredita una ejecución del sistema antiguo. La arquitectura actual Electron y SQLite se conserva.

El resultado vigente sigue siendo **146 aprobadas, 0 fallidas**, c8 corregido **83,30 % líneas / 70,41 % ramas / 94,66 % funciones**. SonarQube del PR: **Quality Gate aprobado**, **86,5 % cobertura del código nuevo** y **0 % duplicación nueva**. Son mediciones con alcances distintos. Los resultados de 28, 33 y 140 casos y sus capturas se conservan como antecedentes. Video pendiente y PR #8 sin fusionar.
