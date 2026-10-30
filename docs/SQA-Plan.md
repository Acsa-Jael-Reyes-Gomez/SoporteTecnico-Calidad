# Plan de aseguramiento de la calidad del software

## 1. Propósito

Prevenir regresiones de la aplicación existente y hacer verificables los cambios antes de integrarlos.

## 2. Alcance

Incluye el proceso principal Electron, el puente Preload, servicios de negocio, interfaz, el adaptador SQLite integrado, pruebas y automatización. Los controles revisan que los cambios funcionen antes de incorporarse al proyecto.

## 3. Descripción del sistema

Aplicación interna de soporte técnico con tickets, rutas, equipos en taller, envíos, proyectos especiales, notificaciones, calificación y reportes. Véase `docs/MAPA_FUNCIONALIDADES.md`.

## 4. Arquitectura

Electron con Renderer JavaScript/CSS, Preload TypeScript, Main TypeScript y persistencia SQLite mediante `node:sqlite`. No utiliza React ni Express. La interfaz invoca handlers IPC a través de `window.api`. La decisión de conservar esta variante se documenta en `docs/Decisiones-Tecnicas.md`; SQLite integrado permite ejecutar una copia sin instalar un servicio de base de datos.

## 5. Estándares

El plan toma como referencia ISO/IEC/IEEE 29119-2:2021 para organizar las actividades de prueba y 29119-3:2021 para documentar casos y resultados. En este proyecto se refleja en el alcance, los tipos de prueba, los criterios de aceptación y la matriz con entradas, resultados esperados y resultados obtenidos. También se usa ISO/IEC 25010:2023 como referencia para hablar de calidad del producto; las métricas que sí se miden aquí son cobertura, compilación y pruebas aprobadas.

La aplicación de estas referencias es parcial y adaptada al tamaño del proyecto. No se declara certificación ni cumplimiento completo de las normas. Además, se mantienen estos controles concretos:

- TypeScript `strict: true` y `noEmitOnError` en `tsconfig.json`.
- Consultas parametrizadas para valores variables; los identificadores SQL se validan mediante listas permitidas en helpers.
- Secretos fuera del repositorio; la configuración local `appsettings.json` está ignorada por Git.
- Cambios pequeños, revisables y acompañados de pruebas para las reglas de negocio.

### Referencias consultadas

- [ISO/IEC/IEEE 29119-2:2021 — procesos de prueba](https://www.iso.org/standard/79428.html).
- [ISO/IEC/IEEE 29119-3:2021 — documentación de pruebas](https://www.iso.org/cms/live/live/en/sites/isoorg/contents/data/standard/07/94/79429.html).
- [ISO/IEC 25010:2023 — modelo de calidad del producto](https://www.iso.org/standard/78176.html).

## 6. Herramientas

Node.js 22, npm, TypeScript, `node:test`, cobertura nativa de Node, ESLint, Prettier, GitHub Actions y SonarCloud.

## 7. Estrategia de pruebas

- **Unitarias:** validación, normalización de dominio, paginación, permisos y saneamiento de exportación.
- **Integración controlada:** servicios y consultas con dobles `DbConnection`; no usar DSN real.
- **Regresión:** reglas de Renderer/SQL verificadas por los casos existentes.
- **Extremo a extremo:** `npm run test:e2e` lanza Electron con una base SQLite temporal sintética y valida inicio, Preload/IPC, login, navegación a Tickets y alta persistida.
- **Base de datos:** pruebas del adaptador SQLite en memoria, integridad de semilla y persistencia del ticket E2E en una base temporal aislada.

Framework adaptado al sistema: `node:test` evita introducir Jest/React Testing Library propios de otro stack.

## 8. Análisis estático

`npm run typecheck` ejecuta TypeScript estricto sin emitir archivos. `npm run lint` ejecuta ESLint sobre el proceso principal, Preload, módulos de interfaz, pruebas y scripts. Las reglas se adaptan a módulos de interfaz que comparten funciones globales y al uso CommonJS de Node. `npm run format:check` verifica documentos y configuración con Prettier. TypeScript, ESLint y Prettier son los controles estáticos activos.

## 9. Cobertura

`npm run test:coverage` utiliza la cobertura V8 incluida en Node. No utiliza Istanbul/Jest. La medición local actual del 29/10/2026 es 96.16% de líneas, 81.55% de ramas y 92.31% de funciones, con 33/33 pruebas. El run remoto 40599606066, con 28 pruebas, corresponde a la revisión anterior a SQLite.

## 10. Métricas

Casos aprobados/fallidos, cobertura de líneas/ramas/funciones, errores de compilación, resultado del workflow y defectos encontrados. Las métricas no disponibles se reportan literalmente como tales. Línea base auditada en `docs/Linea-Base-Calidad.md`.

## 11. Umbrales de aceptación

- Compilación correcta.
- Todas las pruebas requeridas aprobadas.
- Cobertura del comando: líneas >= 75%, ramas >= 60%, funciones >= 55% (más estricto que el mínimo académico del 60% de líneas).
- TypeScript sin errores.
- SonarCloud integrado; el último Quality Gate aprobado tiene estado `OK`.
- No introducir secretos en cambios.

## 12. Puertas de calidad

El workflow falla si `npm run build`, `npm test`, `npm run test:e2e`, `npm run test:coverage`, `npm run typecheck`, `npm run lint` o `npm run format:check` devuelve error. El análisis combina TypeScript, ESLint, Prettier y SonarCloud.

## 13. Revisiones automáticas

GitHub Actions ejecuta las etapas CONSTRUIR, PROBAR, ANALIZAR y REPORTAR en cada `push` y `pull_request`. Los cambios se integran mediante pull request. La rama `main` está protegida, exige revisión y aprobación antes de una fusión.

## 14. Revisiones manuales

Revisar modelo de permisos, cambios de esquema, consultas, mensajes de error, interfaz en Electron, persistencia SQLite, exclusión de secretos y que las instrucciones del manual correspondan a funciones implementadas.

## 15. Gestión de defectos

Registrar identificador, evidencia, severidad, pasos para reproducir, componente, responsable y estado. Corregir defectos críticos antes de integrar; enlazar la prueba de regresión que evita su retorno.

## 16. Deuda técnica

Mantener el registro en `docs/calidad/REVISION_Y_DEUDA_TECNICA.md`. Priorizar riesgos de inicialización de esquema, ampliar los recorridos UI automatizados y mantener lint.

## 17. Riesgos

Dependencia de Electron/Windows; la cobertura automática E2E se limita al inicio de sesión, navegación y alta de ticket; y la sincronización entre equipos no está implementada.

## 18. Control de versiones

Usar ramas cortas y pull requests hacia `main`. El repositorio tiene Git funcional y el cambio de finales de línea se publicó en el commit `9f5a007`. No reescribir historial ni reemplazar remotos.

## 19. Pull requests

Cada PR describe motivo, alcance, pruebas realizadas, riesgos y cambios de base/configuración. Requiere revisión humana y checks aprobados antes de fusionar. La plantilla está en `.github/PULL_REQUEST_TEMPLATE.md`.

## 20. Criterios de aceptación

La aplicación existente conserva sus operaciones principales; compilación, pruebas y cobertura pasan; tipos sin errores; documentación y riesgos actualizados; y el revisor confirma los cambios. El propietario confirmó una ejecución verde de Actions. La protección de rama y la revisión humana de cada pull request deben comprobarse por separado.

## 21. Mantenimiento

Repetir los checks al cambiar dependencias, Node, Electron, consultas o esquema. Mantener `package-lock.json`, revisar avisos de dependencias y recalibrar umbrales solo con evidencia reproducible, sin reescribir la línea base histórica.
