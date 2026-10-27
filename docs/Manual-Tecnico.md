# Manual técnico

## Arquitectura

La aplicación reutilizada es un sistema de escritorio Electron. El Renderer está escrito en JavaScript/CSS; `preload.ts` expone una API acotada; el proceso principal TypeScript gestiona IPC, reglas de negocio, permisos y consultas MySQL vía ODBC. No usa React, Express ni una base embebida. Consulta `docs/MAPA_FUNCIONALIDADES.md` para localizar módulos y operaciones.

## Requisitos

- Windows 10 o posterior, compatible con Electron 45.
- Node.js 22 y npm.
- Driver ODBC instalado y compatible con el servidor MySQL.
- DSN de Windows hacia una instancia MySQL **de desarrollo o pruebas**.

Las versiones exactas del driver ODBC y MySQL no se fijan en el repositorio y deben confirmarse con el administrador del entorno.

## Instalación y compilación

```powershell
npm ci
npm run typecheck
npm run build
```

Para iniciar el proceso compilado: `npm start`. `npm run start:build` compila y luego abre Electron. Electron descarga el binario de su versión la primera vez que se inicia; ese paso requiere conectividad a los artefactos oficiales. Los scripts de empaquetado escriben en `release/`; no son necesarios para las pruebas de calidad.

## Configuración de base de datos

`appsettings.json` usa `odbc.odbcDsn` con `Tickets_IT`, lee la variable `SOPORTE_ODBC_CONNECTION` y tiene `autoMigrate: false`. El archivo está ignorado por Git; no copiar secretos a archivos versionados. Establece `SOPORTE_ODBC_CONNECTION` en el entorno del proceso con una cadena de conexión válida para una base aislada. Si se usa el DSN, confirma su nombre y destino antes de iniciar.

`database.sql` define el esquema y contiene semilla. No ejecutes el script sobre una base con datos existentes sin respaldo y revisión de impacto. Las pruebas automatizadas actuales no abren conexiones ODBC. No se hizo ninguna conexión durante esta auditoría.

## Pruebas y cobertura

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
```

`npm test` compila y ejecuta `node:test`. El comando de cobertura ejecuta los casos sobre el `dist` compilado. Umbrales configurados: 75% líneas, 60% ramas y 55% funciones. El 26 de octubre: 28/28 pruebas y cobertura 95.65% / 80.60% / 90.54%. La prueba de consultas usa dobles; no es una prueba de integración real con MySQL.

## Análisis estático y formato

TypeScript estricto y ESLint se ejecutan en CI. ESLint cubre TypeScript, los módulos JavaScript de la interfaz, pruebas y scripts; no-undef se desactiva para el Renderer porque sus módulos comparten funciones globales, y las advertencias de `any` reflejan el borde ODBC existente. Prettier verifica la documentación y configuración editadas, sin reescribir toda la interfaz. `.hintrc` se conserva para su uso original.

## Pipeline CI/CD

`.github/workflows/quality.yml` se dispara en `push` y `pull_request` para Windows con Node 22. Las etapas instalan dependencias fijadas, compilan, ejecutan pruebas y cobertura, revisan tipos y cargan reportes como artefactos. No se verificó una ejecución en GitHub.

## SonarCloud

La ejecución es opcional. En configuración del repositorio GitHub, crear variables `SONAR_ORGANIZATION` y `SONAR_PROJECT_KEY`, además del secreto `SONAR_TOKEN`. No guardar el token en el código. Hasta completar esos pasos, el workflow informa que el análisis se omitió. La cobertura V8 no genera LCOV y por ello no se entrega a SonarCloud.

## Flujo GitHub y quality gates

Crear rama de trabajo, abrir PR, revisar los cambios, esperar el check **Quality Gate** y fusionar solo con revisión aprobada. Un administrador debe configurar protección de la rama principal para requerir PR, aprobaciones y el check exitoso. La protección no se ha verificado. Consulte `docs/Flujo-GitHub.md`.

## Mantenimiento

Conservar `package-lock.json`, usar `npm ci` en CI, revisar dependencias antes de actualizarlas y no modificar el esquema productivo desde pruebas. Actualizar las métricas solo después de ejecutar las herramientas y conservar la línea base original.

## Solución de problemas

- **No se encuentra el DSN:** verifica el driver ODBC y el DSN de sistema/usuario en Windows.
- **Falla autenticación/conexión:** revisa el servidor, permisos y variable de entorno; no publiques la cadena.
- **Falla `npm ci`:** confirma Node 22 y conectividad al registro npm.
- **Falla TypeScript:** ejecuta `npm run typecheck` y corrige el error antes de probar.
- **Falla cobertura:** identifica archivo/ramas sin prueba; no reduzcas los umbrales para ocultar la regresión.
- **Error `EPERM` cargando Node:** comprueba permisos de lectura/traversal de la ruta de Node y del workspace. El primer intento aislado de esta auditoría lo encontró; la ejecución posterior con acceso al runtime pasó.
