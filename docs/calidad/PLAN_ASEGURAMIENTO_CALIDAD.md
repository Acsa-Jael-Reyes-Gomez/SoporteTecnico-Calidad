# Acceso al plan SQA vigente

El plan completo está en [SQA-Plan.md](../SQA-Plan.md). **146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

El gate c8 incluye únicamente `src/**`, excluye pruebas y herramientas del denominador y conserva la exclusión Renderer preexistente. Mide archivos de aplicación cargados por la suite; no equivale a cobertura de toda la aplicación. Los umbrales siguen siendo 75 % líneas, 60 % ramas y 55 % funciones. El comando `test:coverage:sonar` genera un LCOV de alcance distinto; SonarQube calcula su propia cobertura global y de código nuevo.

E2E y SonarQube están integrados. La API de GitHub confirmó `main` protegida: PR obligatorio, una aprobación, check `Compilar, probar y verificar calidad`, checks actualizados, resolución de conversaciones y aplicación a administradores. No se permite force-push ni eliminación. PR #8 permanece abierto y sin aprobación independiente; no se fusionó ni se modificó main directamente.

Resultados y límites en [métricas](METRICAS_CALIDAD.md) y [hallazgos](HALLAZGOS_SONAR.md).
