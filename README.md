# Sistema de soporte técnico

[![Puerta de calidad](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/workflows/quality.yml)

Aplicación de escritorio para gestionar tickets de soporte, rutas, equipos en taller, envíos de equipos, proyectos especiales, calificaciones y reportes. Esta copia conserva como base el sistema existente `SoporteTecnico` identificado en los metadatos del paquete; no es una aplicación creada desde cero.

## Arquitectura y tecnologías

- Electron con tres capas: interfaz Renderer, puente Preload y lógica Main.
- Proceso principal en TypeScript estricto; interfaz en JavaScript y CSS.
- SQLite integrado mediante `node:sqlite`; cada instalación conserva su archivo de datos en la carpeta de usuario de Electron.
- Pruebas con `node:test`; análisis de tipos con TypeScript.
- ESLint para análisis estático y Prettier para formato de documentación/configuración.
- CI en GitHub Actions para Windows y Node.js 22.

La aplicación **no** usa React, Express ni una API HTTP. La primera ejecución copia la base inicial incluida en `assets/database/seed.db` a la carpeta de datos de la aplicación. No requiere MySQL, ODBC ni configurar un DSN.

## Funcionalidades existentes

Inicio de sesión y permisos; creación, consulta, edición, cierre, reapertura y eliminación de tickets; asignación de técnicos; rutas y su validación; equipos en taller; envíos e historial; notificaciones; proyectos especiales; dashboard, calificación y reportes con exportación a Excel. El detalle de canales y módulos está en [docs/MAPA_FUNCIONALIDADES.md](docs/MAPA_FUNCIONALIDADES.md).

## Requisitos e instalación

Se requiere Windows, Node.js 22 y npm. Desde la raíz del repositorio:

```powershell
npm ci
npm run build
npm start
```

La base de datos de trabajo se guarda como `soporte_tecnico.db` en la carpeta de datos de Electron. Puedes definir `SOPORTE_DATABASE_PATH` para elegir otra ubicación. Consulta [docs/Manual-Tecnico.md](docs/Manual-Tecnico.md) para detalles.

## Calidad

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
```

El umbral del comando de cobertura es 75% de líneas, 60% de ramas y 55% de funciones. ESLint bloquea errores; las advertencias por variables globales entre módulos quedan como deuda no bloqueante. Prettier verifica documentos y configuración editados. Revisa el plan SQA y la línea base para límites y evidencia.

## Pipeline y GitHub

`.github/workflows/quality.yml` ejecuta CONSTRUIR, PROBAR, ANALIZAR y REPORTAR en push/PR. **146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

El gate c8 incluye únicamente `src/**`, excluye pruebas y herramientas del denominador y conserva la exclusión Renderer preexistente. Mide archivos de aplicación cargados por la suite; no equivale a cobertura de toda la aplicación. Los umbrales siguen siendo 75 % líneas, 60 % ramas y 55 % funciones. El comando `test:coverage:sonar` genera un LCOV de alcance distinto; SonarQube calcula su propia cobertura global y de código nuevo.

[PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) del commit `8f508f5`: aprobados. SonarQube del PR: **PASSED**, cobertura nueva **86,5 %**, duplicación nueva **0,0 %**. El último commit documental debe consultarse en los [checks del PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8).

La API de GitHub confirmó `main` protegida: PR obligatorio, una aprobación, check `Compilar, probar y verificar calidad`, checks actualizados, resolución de conversaciones y aplicación a administradores. No se permite force-push ni eliminación. PR #8 permanece abierto y sin aprobación independiente; no se fusionó ni se modificó main directamente.

Para el flujo de ramas, revisiones y configuración de protecciones, consulta [docs/Flujo-GitHub.md](docs/Flujo-GitHub.md) y la plantilla en `.github/PULL_REQUEST_TEMPLATE.md`.

## Documentación

- [Diagnóstico inicial](docs/Diagnostico-Inicial.md)
- [Plan SQA](docs/SQA-Plan.md)
- [Matriz de pruebas](docs/Matriz-Pruebas.md)
- [Línea base](docs/Linea-Base-Calidad.md)
- [Manual técnico](docs/Manual-Tecnico.md)
- [Manual de usuario](docs/Manual-Usuario.md)
- [Reporte de mejora](docs/Reporte-Mejora.md)
- [Evidencias de ejecución](docs/calidad/EVIDENCIAS_EJECUCION.md)
- [Presentación final editable y PDF](docs/presentacion/README.md)
- [Guion de video](docs/video/Guion-Video-4-5-Minutos.md)
- [Presentación de métricas](docs/calidad/PRESENTACION_METRICAS.md)

## Limitaciones conocidas

El estado detallado de cada requisito del enunciado, incluidos los pasos externos pendientes, está en [docs/calidad/ESTADO-REQUISITOS.md](docs/calidad/ESTADO-REQUISITOS.md).

- La interfaz es Electron con JavaScript, no React; el backend no es Express.
- La base SQLite es local a cada instalación; varias computadoras no comparten automáticamente sus cambios.
- Hay una prueba end-to-end automatizada que inicia Electron con una base temporal aislada, valida Preload/IPC, login, navegación y la creación persistida de un ticket.
- SonarQube está integrado y el scanner espera su gate; consultar las métricas vigentes y los riesgos abiertos, sin confundir código nuevo con cobertura global.
- El PR #7 obtuvo dos aprobaciones de Acsa-Reyes, tres checks aprobados y fue fusionado a `main`. Se deben seguir solicitando revisiones para los PR posteriores.

## Cierre y evidencias

[Informe final](docs/Informe-Final.md) · [Hallazgos Sonar](docs/calidad/HALLAZGOS_SONAR.md) · [Inventario final](docs/calidad/INVENTARIO_FINAL_CASOS.csv). Las capturas y cifras de octubre y del cierre de 140 casos se conservan como antecedentes.

## Antecedente de julio de 2026 incorporado al cierre

Según el [historial documental aportado](docs/calidad/antecedentes/Historial_Verificado_SoporteTecnico_PreSQA.md), la copia original contiene **25 casos definidos**: 22 en `tests/core-services.test.js` y 3 en `tests/envio-history.test.js`. No se conservan resultados de ejecución que acrediten aprobaciones o fallos ni un reporte inicial de cobertura. No se asigna 0 % ni se calcula una mejora porcentual entre coberturas incompatibles.

La copia utiliza Electron, JavaScript y TypeScript, con MySQL mediante ODBC. En el material examinado no aparecen configuraciones de GitHub Actions o SonarQube; esta ausencia se limita a esa copia. El informe aportado analiza archivos seleccionados y no acredita una ejecución del sistema antiguo. La arquitectura actual Electron y SQLite se conserva.

El resultado vigente sigue siendo **146 aprobadas, 0 fallidas**, c8 corregido **83,30 % líneas / 70,41 % ramas / 94,66 % funciones**. SonarQube del PR: **Quality Gate aprobado**, **86,5 % cobertura del código nuevo** y **0 % duplicación nueva**. Son mediciones con alcances distintos. Los resultados de 28, 33 y 140 casos y sus capturas se conservan como antecedentes. Video pendiente y PR #8 sin fusionar.
