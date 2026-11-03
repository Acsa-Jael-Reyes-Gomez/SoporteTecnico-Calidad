## Actualización de cierre — PR #7 (noviembre de 2026)

El análisis remoto **sí quedó configurado y ejecutado**: SonarQube informó Quality Gate **PASSED** y **80,1 % de cobertura del código nuevo**, el run del PR #7 aprobó **140/140 pruebas**, se ejecutó E2E con SQLite sintético y el PR fue fusionado con dos revisiones aprobatorias. Los párrafos históricos posteriores que indican “SonarCloud no integrado” o “sin resultado remoto” describen estados previos, no la situación final. La configuración de protección de `main` fue revisada por la propietaria mediante la interfaz de GitHub: exige Pull Request, aprobaciones, estado correcto de «Compilar, probar y verificar calidad» y conversaciones resueltas. Aún falta comprobar la aplicación efectiva de estas políticas sobre un PR nuevo. El acceso del docente y el video MP4 están pendientes. Véase [Informe final](Informe-Final.md) y [Métricas](calidad/METRICAS_CALIDAD.md).

---

# Plan de aseguramiento de la calidad del software

## 1. Propósito

Prevenir regresiones de la aplicación existente y hacer verificables los cambios antes de integrarlos.

## 2. Alcance

Incluye el proceso principal Electron, el puente Preload, servicios de negocio, Renderer, el adaptador SQLite integrado, pruebas y pipeline. No incluye despliegue cloud ni pruebas contra infraestructura de producción. Sí incluye el análisis remoto SonarQube Cloud, la revisión del PR #7 y la comprobación reportada de reglas de protección en GitHub.

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

Node.js 22, npm, TypeScript, `node:test`, cobertura nativa de Node, ESLint, Prettier y GitHub Actions. SonarQube Cloud está integrado; en el PR #7 el Quality Gate resultó PASSED y la cobertura de código nuevo alcanzó 80,1 %.

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

`npm run test:coverage` utiliza la cobertura V8 incluida en Node. No utiliza Istanbul/Jest. El registro histórico del 29/10/2026 documentó 33/33 pruebas. El cierre comprobable en el run 41560908801 ejecutó 140/140, con 88,90 % de cobertura de líneas, 80,75 % de ramas y 73,61 % de funciones para el alcance medido por c8. SonarQube midió por separado 80,1 % de cobertura del código nuevo. No se calcula mejora porcentual frente a una cobertura inicial que no fue medida.

## 10. Métricas

Casos aprobados/fallidos, cobertura de líneas/ramas/funciones, errores de compilación, resultado del workflow y defectos encontrados. Las métricas no disponibles se reportan literalmente como tales. Línea base auditada en `docs/Linea-Base-Calidad.md`.

## 11. Umbrales de aceptación

- Compilación correcta.
- Todas las pruebas requeridas aprobadas.
- Cobertura del comando: líneas >= 75%, ramas >= 60%, funciones >= 55% (más estricto que el mínimo académico del 60% de líneas).
- TypeScript sin errores.
- SonarQube Cloud: Quality Gate PASSED, al menos 80 % de cobertura y como máximo 3 % de duplicación sobre código nuevo; el resultado del cierre fue 80,1 % de cobertura y 0,48 % de duplicación.
- No introducir secretos en cambios.

## 12. Puertas de calidad

El workflow falla si `npm run build`, `npm test`, `npm run test:e2e`, `npm run test:coverage`, `npm run typecheck`, `npm run lint` o `npm run format:check` devuelve error. El análisis estático se realiza con TypeScript estricto, ESLint y Prettier. SonarQube Cloud analiza el PR; el workflow exige `SONAR_TOKEN` y ahora espera el resultado del Quality Gate con `sonar.qualitygate.wait=true` para fallar si la puerta de calidad falla. La verificación de este cambio en una ejecución nueva aún debe registrarse.

## 13. Revisiones automáticas

GitHub Actions ejecuta las etapas CONSTRUIR, PROBAR, ANALIZAR y REPORTAR en cada `push` y `pull_request`. La ejecución final del PR #7 (run 41560908801) registró 140 pruebas aprobadas, E2E, TypeScript, ESLint, Prettier y análisis SonarQube exitosos. El PR #7 recibió dos aprobaciones del revisor Acsa-Reyes y se fusionó a `main`. Según comprobación de la propietaria en Settings → Branches, la regla para `main` exige PR, aprobación y el check `Compilar, probar y verificar calidad`.

## 14. Revisiones manuales

Revisar modelo de permisos, cambios de esquema, consultas, mensajes de error, interfaz en Electron, persistencia SQLite, exclusión de secretos y que las instrucciones del manual correspondan a funciones implementadas.

## 15. Gestión de defectos

Registrar identificador, evidencia, severidad, pasos para reproducir, componente, responsable y estado. Corregir defectos críticos antes de integrar; enlazar la prueba de regresión que evita su retorno.

## 16. Deuda técnica

Mantener el registro en `docs/calidad/REVISION_Y_DEUDA_TECNICA.md`. Priorizar riesgos de inicialización de esquema, ampliar los recorridos UI automatizados y mantener lint.

## 17. Riesgos

Dependencia de Electron/Windows; el E2E cubre el inicio de sesión y la creación persistida de un ticket, no todas las pantallas; la cobertura total de SonarQube está por debajo de la del código nuevo (30,2 % frente a 80,1 %); persiste deuda técnica en código histórico.

## 18. Control de versiones

Usar ramas cortas y pull requests hacia `main`. El repositorio tiene Git funcional y el cambio de finales de línea se publicó en el commit `9f5a007`. No reescribir historial ni reemplazar remotos.

## 19. Pull requests

Cada PR describe motivo, alcance, pruebas realizadas, riesgos y cambios de base/configuración. Requiere revisión humana y checks aprobados antes de fusionar. La plantilla está en `.github/PULL_REQUEST_TEMPLATE.md`.

## 20. Criterios de aceptación

La aplicación existente conserva sus operaciones principales; compilación, pruebas y cobertura pasan; tipos sin errores; documentación y riesgos actualizados; y el revisor confirma los cambios. El run 41560908801 y el PR #7 documentan la ejecución verde, las dos aprobaciones y la fusión. La propietaria confirmó la configuración de la protección de la rama mediante GitHub; su efecto en un PR posterior debe volver a verificarse.

## 21. Mantenimiento

Repetir los checks al cambiar dependencias, Node, Electron, consultas o esquema. Mantener `package-lock.json`, revisar avisos de dependencias y recalibrar umbrales solo con evidencia reproducible, sin reescribir la línea base histórica.
