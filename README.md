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

`.github/workflows/quality.yml` ejecuta las etapas **CONSTRUIR**, **PROBAR**, **ANALIZAR** y **REPORTAR** en `push` y `pull_request`. Los runs [40973155260](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40973155260) (`push`) y [40973160326](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/40973160326) (`pull_request`) pasaron con 33 pruebas; el artefacto más reciente está en `docs/calidad/evidencias/run-40973160326/quality-reports/`. La ejecución local dio 33/33 y cobertura de 96.16% de líneas, 81.55% de ramas y 92.31% de funciones; consulta `docs/calidad/METRICAS_CALIDAD.md`. SonarCloud es condicional y no tiene análisis registrado. La protección de `main` no está habilitada; consulta `docs/Flujo-GitHub.md`.

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
- [Presentación académica: esquema de 10 diapositivas](docs/presentacion/Presentacion-Proyecto-SQA.md)
- [Guion de video](docs/video/Guion-Video-4-5-Minutos.md)
- [Presentación de métricas](docs/calidad/PRESENTACION_METRICAS.md)

## Limitaciones conocidas

El estado detallado de cada requisito del enunciado, incluidos los pasos externos pendientes, está en [docs/calidad/ESTADO-REQUISITOS.md](docs/calidad/ESTADO-REQUISITOS.md).

- La interfaz es Electron con JavaScript, no React; el backend no es Express.
- La base SQLite es local a cada instalación; varias computadoras no comparten automáticamente sus cambios.
- No hay pruebas end-to-end ni arranque automatizado de Electron. Cinco pruebas del adaptador SQLite y la semilla aprobaron localmente; falta una comprobación manual de arranque de Electron.
- SonarCloud y las reglas de protección de GitHub requieren configuración adicional.
- Las pruebas E2E y el arranque manual de Electron siguen pendientes; el PR #1 sí valida en Actions la revisión SQLite actual.
