# Plan de aseguramiento de la calidad

## 1. Propósito

Prevenir regresiones de la aplicación existente y hacer verificables los cambios antes de integrarlos.

## 2. Alcance

Incluye el proceso principal Electron, el puente Preload, servicios de negocio, Renderer, acceso MySQL por ODBC, pruebas y pipeline. No incluye infraestructura productiva, verificación de permisos reales en GitHub ni análisis remoto ejecutado.

## 3. Descripción del sistema

Aplicación interna de soporte técnico con tickets, rutas, equipos en taller, envíos, proyectos especiales, notificaciones, calificación y reportes. Véase `docs/MAPA_FUNCIONALIDADES.md`.

## 4. Arquitectura

Electron con Renderer JavaScript/CSS, Preload TypeScript, Main TypeScript y persistencia MySQL sobre ODBC. No utiliza React ni Express. La interfaz invoca handlers IPC a través de `window.api`.

## 5. Estándares

- TypeScript `strict: true` y `noEmitOnError` en `tsconfig.json`.
- Consultas parametrizadas para valores variables; identificadores SQL se validan mediante listas permitidas en helpers.
- Secretos fuera del repositorio; configuración local en `appsettings.json` ignorada por Git.
- Mantener cambios pequeños, revisables y acompañados de pruebas para reglas de negocio.

Estos son controles observados o criterios del proyecto; no se declara certificación ISO ni cumplimiento formal de una norma externa.

## 6. Herramientas

Node.js 22, npm, TypeScript, `node:test`, cobertura nativa de Node, ESLint, Prettier, GitHub Actions y SonarCloud opcional. SonarCloud requiere proyecto, organización y token configurados por el propietario.

## 7. Estrategia de pruebas

- **Unitarias:** validación, normalización de dominio, paginación, permisos y saneamiento de exportación.
- **Integración controlada:** servicios y consultas con dobles `DbConnection`; no usar DSN real.
- **Regresión:** reglas de Renderer/SQL verificadas por los casos existentes.
- **Interfaz/aceptación:** revisión manual en Windows/Electron y entorno de pruebas separado. No hay E2E automatizado.
- **Base de datos:** pendiente una instancia MySQL aislada; no usar la base de desarrollo ni producción.

Framework adaptado al sistema: `node:test` evita introducir Jest/React Testing Library propios de otro stack.

## 8. Análisis estático

`npm run typecheck` ejecuta TypeScript estricto sin emitir archivos. `npm run lint` ejecuta ESLint sobre Main/Preload, módulos Renderer, pruebas y scripts. Las reglas se adaptan a archivos Renderer que comparten funciones globales, al uso CommonJS de Node y al driver ODBC no tipado; `any` y variables sin uso quedan como advertencias no bloqueantes. `npm run format:check` verifica documentos y configuración editados con Prettier. SonarCloud puede analizar TypeScript/JavaScript cuando se complete su configuración externa.

## 9. Cobertura

`npm run test:coverage` utiliza la cobertura V8 incluida en Node. No utiliza Istanbul/Jest. La ejecución local reportó 95.65% de líneas, 80.60% de ramas y 90.54% de funciones, por encima de los umbrales; no se ha configurado exportación LCOV para SonarCloud.

## 10. Métricas

Casos aprobados/fallidos, cobertura de líneas/ramas/funciones, errores de compilación, resultado del workflow y defectos encontrados. Las métricas no disponibles se reportan literalmente como tales. Línea base auditada en `docs/Linea-Base-Calidad.md`.

## 11. Umbrales de aceptación

- Compilación correcta.
- Todas las pruebas requeridas aprobadas.
- Cobertura del comando: líneas >= 75%, ramas >= 60%, funciones >= 55% (más estricto que el mínimo académico del 60% de líneas).
- TypeScript sin errores.
- SonarCloud aprobado cuando el proyecto esté configurado.
- No introducir secretos en cambios.

## 12. Quality Gates

El workflow falla si `npm run build`, `npm test`, `npm run test:coverage`, `npm run typecheck`, `npm run lint` o `npm run format:check` devuelve error. Las advertencias conocidas de ESLint no bloquean. El paso SonarCloud solo se ejecuta si están definidos organización, clave y token; hasta entonces no es un gate activo.

## 13. Revisiones automáticas

GitHub Actions ejecuta las etapas BUILD, TEST, ANALYZE y REPORT en push y pull request. Envío de artefactos de prueba/cobertura y análisis remoto dependen de la ejecución real en GitHub.

## 14. Revisiones manuales

Revisar modelo de permisos, cambios de esquema, consultas, mensajes de error, interfaz en Electron, configuración ODBC, exclusión de secretos y que las instrucciones del manual correspondan a funciones implementadas.

## 15. Gestión de defectos

Registrar identificador, evidencia, severidad, pasos para reproducir, componente, responsable y estado. Corregir defectos críticos antes de integrar; enlazar la prueba de regresión que evita su retorno.

## 16. Deuda técnica

Mantener el registro en `docs/calidad/REVISION_Y_DEUDA_TECNICA.md`. Priorizar riesgos de inicialización de esquema, pruebas de integración de base de datos, pruebas de UI y lint.

## 17. Riesgos

Dependencia de Windows/ODBC; DSN externo no reproducible; pruebas de consulta con dobles; ausencia de cobertura E2E; análisis remoto no configurado; estado Git desconocido en la carpeta auditada.

## 18. Control de versiones

Usar ramas cortas sobre la rama principal del repositorio cuando este tenga Git funcional. No reescribir historial ni reemplazar remotos. Actualmente no se pudo verificar rama ni historial: `.git` estaba vacío y Git no está disponible.

## 19. Pull requests

Cada PR describe motivo, alcance, pruebas realizadas, riesgos y cambios de base/configuración. Requiere revisión humana y checks aprobados antes de fusionar. La plantilla está en `.github/PULL_REQUEST_TEMPLATE.md`.

## 20. Criterios de aceptación

La aplicación existente conserva sus operaciones principales; compilación, pruebas y cobertura pasan; tipos sin errores; secretos ausentes; documentación y riesgos actualizados; el revisor confirma los cambios. Controles remotos solo se consideran verificados después de una ejecución real.

## 21. Mantenimiento

Repetir los checks al cambiar dependencias, Node, Electron, consultas o esquema. Mantener `package-lock.json`, revisar avisos de dependencias y recalibrar umbrales solo con evidencia reproducible, sin reescribir la línea base histórica.
