# Sistema de soporte técnico

Aplicación de escritorio para gestionar tickets de soporte, rutas, equipos en taller, envíos de equipos, proyectos especiales, calificaciones y reportes. Esta copia conserva como base el sistema existente `SoporteTecnico` identificado en los metadatos del paquete; no es una aplicación creada desde cero.

## Arquitectura y tecnologías

- Electron con tres capas: interfaz Renderer, puente Preload y lógica Main.
- Proceso principal en TypeScript estricto; interfaz en JavaScript y CSS.
- MySQL por ODBC usando un DSN de Windows, con conexión configurable por variable de entorno.
- Pruebas con `node:test`; análisis de tipos con TypeScript.
- ESLint para análisis estático y Prettier para formato de documentación/configuración.
- CI en GitHub Actions para Windows y Node.js 22.

La aplicación **no** usa React, Express ni una API HTTP. La base de datos tampoco es una base local aislada: `appsettings.json` configura por defecto el DSN `Tickets_IT`. Revisa el manual técnico antes de ejecutar la aplicación para evitar conectar una base inadecuada.

## Funcionalidades existentes

Inicio de sesión y permisos; creación, consulta, edición, cierre, reapertura y eliminación de tickets; asignación de técnicos; rutas y su validación; equipos en taller; envíos e historial; notificaciones; proyectos especiales; dashboard, calificación y reportes con exportación a Excel. El detalle de canales y módulos está en [docs/MAPA_FUNCIONALIDADES.md](docs/MAPA_FUNCIONALIDADES.md).

## Requisitos e instalación

Se requiere Windows, Node.js 22, npm, un driver ODBC compatible y acceso a una instancia de MySQL de desarrollo configurada para esta aplicación. Desde la raíz del repositorio:

```powershell
npm ci
npm run build
npm start
```

Configura `SOPORTE_ODBC_CONNECTION` con la cadena de conexión de desarrollo si no usarás el DSN `Tickets_IT`. `appsettings.json` está excluido de Git. No guardes contraseñas en archivos versionados. Consulta [docs/Manual-Tecnico.md](docs/Manual-Tecnico.md) para detalles.

## Calidad

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
```

El umbral del comando de cobertura es 75% de líneas, 60% de ramas y 55% de funciones. ESLint bloquea errores; las advertencias por `any` heredados de ODBC y variables globales entre módulos quedan como deuda no bloqueante. Prettier verifica documentos y configuración editados. Las pruebas de consultas usan dobles; no prueban contra MySQL. Revisa el plan SQA y la línea base para límites y evidencia.

## Pipeline y GitHub

`.github/workflows/quality.yml` ejecuta BUILD, TEST, ANALYZE y REPORT en push y pull request. El análisis SonarCloud es opcional y requiere la variable `SONAR_ORGANIZATION`, la variable `SONAR_PROJECT_KEY` y el secreto `SONAR_TOKEN`. No se han verificado ejecuciones remotas ni protección de ramas. El repositorio local no contiene metadatos Git utilizables en este entorno.

Para el flujo de ramas, revisiones y configuración de protecciones, consulta [docs/Flujo-GitHub.md](docs/Flujo-GitHub.md) y la plantilla en `.github/PULL_REQUEST_TEMPLATE.md`.

## Documentación

- [Diagnóstico inicial](docs/Diagnostico-Inicial.md)
- [Plan SQA](docs/SQA-Plan.md)
- [Línea base](docs/Linea-Base-Calidad.md)
- [Manual técnico](docs/Manual-Tecnico.md)
- [Manual de usuario](docs/Manual-Usuario.md)
- [Reporte de mejora](docs/Reporte-Mejora.md)
- [Evidencias históricas del proyecto](docs/calidad/EVIDENCIAS_EJECUCION.md)
- [Presentación académica: esquema de 10 diapositivas](docs/presentacion/Presentacion-Proyecto-SQA.md)
- [Guion de video](docs/video/Guion-Video-4-5-Minutos.md)

## Limitaciones conocidas

- La interfaz es Electron con JavaScript, no React; el backend no es Express.
- MySQL requiere un servidor y un DSN ODBC configurados fuera de la aplicación.
- No hay pruebas end-to-end de la interfaz ni integración con una instancia de base de datos de pruebas.
- SonarCloud y las reglas de protección de GitHub requieren configuración adicional.
- La verificación local se ejecutó con Node 22.16.0: 28/28 pruebas aprobadas, cobertura 95.65% de líneas, 80.60% de ramas, 90.54% de funciones y TypeScript sin errores. El primer intento aislado del sandbox dio EPERM; la ejecución posterior se completó.
