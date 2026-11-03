# Métricas para la exposición

**146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

El gate c8 incluye únicamente `src/**`, excluye pruebas y herramientas del denominador y conserva la exclusión Renderer preexistente. Mide archivos de aplicación cargados por la suite; no equivale a cobertura de toda la aplicación. Los umbrales siguen siendo 75 % líneas, 60 % ramas y 55 % funciones. El comando `test:coverage:sonar` genera un LCOV de alcance distinto; SonarQube calcula su propia cobertura global y de código nuevo.

[PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) del commit `8f508f5`: aprobados. SonarQube del PR: **PASSED**, cobertura nueva **86,5 %**, duplicación nueva **0,0 %**. El último commit documental debe consultarse en los [checks del PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8).

Las 25 pruebas iniciales son casos registrados sin resultado completo conservado. Las mediciones de 28/28 y 33/33 son históricas. El cierre previo de 140/140 y c8 88,90 % / 80,75 % / 73,61 % utilizó un denominador que incluía tests; se conserva como antecedente y no se compara como mejora porcentual con el nuevo alcance. Los 80,1 % de cobertura nueva y 30,2 % global de SonarQube corresponden al main anterior, no al porcentaje c8 corregido. No hay cobertura pre-SQA homogénea para calcular una mejora desde el origen.

La presentación vigente es `../presentacion/final/Presentacion_SQA_Final.pptx` y su PDF. Las capturas originales de 140 casos se conservan identificadas como históricas; los indicadores actuales muestran 146. No afirmar dos revisores: PR #7 contiene dos eventos de aprobación de la misma cuenta Acsa-Reyes. La protección se comprobó por API y PR #8 está pendiente de aprobación. El video es un entregable separado aún pendiente.
