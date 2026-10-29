# Manual técnico

## Arquitectura

La aplicación reutilizada es un sistema de escritorio Electron. El Renderer está escrito en JavaScript/CSS; `preload.ts` expone una API acotada; el proceso principal TypeScript gestiona IPC, reglas de negocio, permisos y consultas SQLite mediante `node:sqlite`. No usa React ni Express. Consulta `docs/MAPA_FUNCIONALIDADES.md` para localizar módulos y operaciones.

## Requisitos

- Windows 10 o posterior, compatible con Electron 45.
- Node.js 22 para desarrollo; Electron 45 incorpora Node.js 24 en produccion.

La base inicial está en `assets/database/seed.db`; el esquema de referencia está en `assets/database/schema.sqlite.sql`.

## Instalación y compilación

```powershell
npm ci
npm run typecheck
npm run build
```

Para iniciar el proceso compilado: `npm start`. `npm run start:build` compila y luego abre Electron. Electron descarga el binario de su versión la primera vez que se inicia; ese paso requiere conectividad a los artefactos oficiales. Los scripts de empaquetado escriben en `release/`; no son necesarios para las pruebas de calidad.

## Configuración de base de datos

Al iniciar por primera vez, la aplicación copia `assets/database/seed.db` a la carpeta `userData` de Electron como `soporte_tecnico.db`. Las ejecuciones posteriores usan esa copia para conservar los cambios. `SOPORTE_DATABASE_PATH` permite indicar otra ubicación. El archivo de trabajo no está dentro del instalador ni del repositorio después de copiarse.

El volcado MySQL recibido se convirtió a SQLite. Se conservaron las filas `INSERT`; los procedimientos almacenados de generación de tickets no se importaron. Las fechas operativas de la semilla se ajustaron proporcionalmente al intervalo 25/09/2026–26/10/2026, conservando horas y orden temporal. No sobrescribas una base de trabajo existente al reinstalar. El archivo semilla es una instantánea; cada instalación mantiene sus cambios localmente. El archivo `seed.db` incluye los registros importados del volcado compartido y se distribuye con la aplicación.

## Pruebas y cobertura

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
```

`npm test` compila y ejecuta `node:test`. El comando de cobertura ejecuta los casos sobre el `dist` compilado. Umbrales configurados: 75% líneas, 60% ramas y 55% funciones. En la ejecución local del 29/10/2026 aprobaron 33/33 casos; cobertura 96.16% / 81.55% / 92.31%. El log está en `docs/calidad/evidencias/local-20261029/npm-test-coverage.log`. El run remoto 40599606066 es anterior a SQLite y no valida esa revisión.

## Análisis estático y formato

TypeScript estricto y ESLint se ejecutan en CI. ESLint cubre TypeScript, los módulos JavaScript de la interfaz, pruebas y scripts; no-undef se desactiva para el Renderer porque sus módulos comparten funciones globales. Prettier verifica la documentación y configuración editadas, sin reescribir toda la interfaz. `.hintrc` se conserva para su uso original.

## Pipeline CI/CD

`.github/workflows/quality.yml` se dispara en `push` y `pull_request` para Windows con Node 22. Las etapas instalan dependencias fijadas, compilan, ejecutan pruebas y cobertura, revisan tipos, lint y formato, y guardan reportes como artefactos. El PR #1 pasó en ambos eventos; runs 40969146165 y 40969163670, con artefactos del PR en `docs/calidad/evidencias/run-40969163670/quality-reports/`. La protección de `main` no está activa: GitHub exige Pro para este repositorio privado.

## SonarCloud

La ejecución es opcional. En configuración del repositorio GitHub, crear variables `SONAR_ORGANIZATION` y `SONAR_PROJECT_KEY`, además del secreto `SONAR_TOKEN`. No guardar el token en el código. Hasta completar esos pasos, el workflow informa que el análisis se omitió. La cobertura V8 no genera LCOV y por ello no se entrega a SonarCloud.

## Flujo GitHub y puertas de calidad

Crear una rama de trabajo, abrir un pull request, revisar los cambios, esperar el check **Puerta de calidad** y fusionar solo con revisión aprobada. Un administrador debe proteger `main` para exigir pull request, aprobación y el check exitoso. La configuración se explica en `docs/Flujo-GitHub.md`.

## Mantenimiento

Conservar `package-lock.json`, usar `npm ci` en CI, revisar dependencias antes de actualizarlas y no modificar el esquema productivo desde pruebas. Actualizar las métricas solo después de ejecutar las herramientas y conservar la línea base original.

## Solución de problemas

- **No aparece la base:** verifica permisos de escritura en la carpeta `userData` o define `SOPORTE_DATABASE_PATH`.
- **Falla de autenticacion:** reconstruye la semilla desde otro volcado con `npm run db:sqlite:import -- "C:\ruta\volcado.sql"`. Importar reemplaza `seed.db`, pero no las bases de trabajo ya creadas.
- **Falla `npm ci`:** confirma Node 22 y conectividad al registro npm.
- **Falla TypeScript:** ejecuta `npm run typecheck` y corrige el error antes de probar.
- **Falla cobertura:** identifica archivo/ramas sin prueba; no reduzcas los umbrales para ocultar la regresión.
- **Error `EPERM` cargando Node:** comprueba permisos de lectura/traversal de la ruta de Node y del workspace. El primer intento aislado de esta auditoría lo encontró; la ejecución posterior con acceso al runtime pasó.
