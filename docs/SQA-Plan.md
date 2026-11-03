# Plan de aseguramiento de la calidad del software

**Sistema:** Soporte Técnico. **Estudiante:** Acsa Jael Reyes Gómez. **Corte:** 03/11/2026.

## Propósito y alcance

Detectar regresiones y hacer verificables los cambios de una aplicación existente antes de su integración. Incluye Main TypeScript, Preload, Renderer JavaScript/CSS, SQLite, pruebas y pipeline. Conserva Electron/SQLite, variante justificada permitida por el enunciado. No incluye nube, pruebas de carga ni datos operativos en los tests.

## Arquitectura y normas de referencia

Renderer invoca window.api; Preload expone operaciones IPC; Main valida sesión, permisos y datos y consulta SQLite. TypeScript es estricto, la base de pruebas es sintética y las consultas usan parámetros. El plan toma como referencia organizativa ISO/IEC/IEEE 29119-2 y 29119-3 y el modelo de calidad ISO/IEC 25010; no declara certificación ni cumplimiento integral de normas. Referencias: https://www.iso.org/standard/79428.html y https://www.iso.org/standard/78176.html.

## Actividades y herramientas

1. Planificar alcance, riesgos, matriz y línea base.
2. Ejecutar unitarias de servicios, integración con SQLite y handlers, regresiones Renderer/reportes y E2E aislado.
3. Compilar y verificar TypeScript, ESLint y Prettier.
4. Medir c8 y generar LCOV independiente para SonarQube.
5. Esperar Quality Gate, conservar reportes y obtener revisión humana.
6. Registrar defectos, falsos positivos justificados, métricas y evidencias de cierre.

## Casos y datos

**146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

La [matriz](Matriz-Pruebas.md) enlaza preparación y aserciones de los 146 casos. El CSV de 140 es antecedente. Las pruebas de base usan memoria o directorios temporales propios. E2E crea usuarios ficticios, autentica, abre Tickets y confirma persistencia SQLite; no cubre todas las rutas de la aplicación.

## Métricas y aceptación

El gate c8 incluye únicamente `src/**`, excluye pruebas y herramientas del denominador y conserva la exclusión Renderer preexistente. Mide archivos de aplicación cargados por la suite; no equivale a cobertura de toda la aplicación. Los umbrales siguen siendo 75 % líneas, 60 % ramas y 55 % funciones. El comando `test:coverage:sonar` genera un LCOV de alcance distinto; SonarQube calcula su propia cobertura global y de código nuevo.

Todos los tests y comandos obligatorios deben terminar en exit 0. SonarQube exige sus condiciones, incluida cobertura nueva ≥80 % y duplicación nueva ≤3 %. No se omite por falta de token en PR/main. La línea base anterior a SQA es incompleta y se documenta, sin inventar porcentajes.

## Pipeline y revisión

Etapas: CONSTRUIR, PROBAR, ANALIZAR y REPORTAR. Todos los push ejecutan compilación, pruebas, E2E, cobertura, tipos, lint, formato y artefactos. SonarQube corre obligatoriamente en PR y push de main; el plan limita otras ramas. Se usa sonar.qualitygate.wait=true. El upload de reportes tiene always() y ocurre antes del último análisis remoto; sus resultados se consultan además en el job y dashboard.

La API de GitHub confirmó `main` protegida: PR obligatorio, una aprobación, check `Compilar, probar y verificar calidad`, checks actualizados, resolución de conversaciones y aplicación a administradores. No se permite force-push ni eliminación. PR #8 permanece abierto y sin aprobación independiente; no se fusionó ni se modificó main directamente.

## Riesgos y deuda

Los hallazgos iniciales y su tratamiento individual están en [HALLAZGOS_SONAR.md](calidad/HALLAZGOS_SONAR.md). Se conserva el permiso de estilos inline por dependencia funcional, sin permitir scripts inline; requiere migración futura y pruebas visuales. Los avisos de bindings compartidos se justifican con declaraciones y orden de carga, sin apagar reglas. El gate de código nuevo no certifica ausencia de deuda global. La cobertura cargada no equivale a cobertura total.

## Evidencia, responsabilidades y cierre

[PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) del commit `8f508f5`: aprobados. SonarQube del PR: **PASSED**, cobertura nueva **86,5 %**, duplicación nueva **0,0 %**. El último commit documental debe consultarse en los [checks del PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8).

La estudiante mantiene código, documentación y evidencias; la cuenta revisora aprueba de forma independiente. El repositorio público permite lectura al docente; la entrega en plataforma requiere acción manual. La [presentación vigente](presentacion/final/Presentacion_SQA_Final.pdf), guion y anexo se verifican visualmente. El video MP4 obligatorio de 4–5 minutos y al menos 720p se prepara y graba al final. No se declara completado antes de existir y reproducirse.
