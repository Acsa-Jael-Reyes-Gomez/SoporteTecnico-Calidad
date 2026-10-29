# Mapa de funcionalidades del sistema

Esta guia sirve para ubicar rapidamente donde esta cada parte del sistema.
El proyecto es una aplicacion Electron con tres capas principales:

- Renderer: pantallas, botones, tablas, formularios y navegacion.
- Preload: puente seguro entre la pantalla y el backend.
- Main: logica de negocio, permisos, consultas SQL y acceso a base de datos.

## Flujo general

1. El usuario usa una pantalla en `src/renderer/modulos`.
2. La pantalla llama una funcion de `window.api`.
3. `window.api` esta definido en `src/preload/preload.ts`.
4. El preload manda la solicitud a un canal IPC.
5. El backend recibe el canal en un archivo `src/main/ipc_*.ts`.
6. El backend valida sesion, permisos, datos y ejecuta SQL.
7. La respuesta vuelve al renderer y la pantalla actualiza la interfaz.

## Archivos base

| Archivo                                        | Para que sirve                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/main/main.ts`                             | Crea la ventana principal, registra IPC base, seguridad de navegacion y carga los handlers del backend.    |
| `src/preload/preload.ts`                       | Expone `window.api` al renderer. Si falta una funcion en la pantalla, normalmente hay que agregarla aqui.  |
| `src/main/db/db.ts`                            | Inicializa SQLite integrado, funciones compatibles y la cola de operaciones de la base local.              |
| `src/main/session_store.ts`                    | Maneja sesiones confiables del usuario dentro de Electron.                                                 |
| `src/renderer/index.html`                      | Contenedor inicial de la interfaz.                                                                         |
| `src/renderer/modulos/cargador-renderer.js`    | Carga los modulos JS del renderer segun la ruta.                                                           |
| `src/renderer/modulos/compartido.js`           | Funciones compartidas de UI: tablas, modales, fechas, exportacion y mensajes.                              |
| `src/renderer/modulos/estructura-principal.js` | Layout principal despues del login: sidebar, topbar, rutas, permisos visibles y campana de notificaciones. |

## Login y sesion

### Pantalla

| Archivo                                 | Funcion                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `src/renderer/modulos/autenticacion.js` | Muestra login, valida credenciales desde la UI y carga catalogos iniciales. |

### Backend

| Archivo                | Canales principales                                                    |
| ---------------------- | ---------------------------------------------------------------------- |
| `src/main/ipc_auth.ts` | `auth:login`, `auth:logout`, `auth:revokeUserSessions`, `auth:health`. |
| `src/main/main.ts`     | `session:clear`, `session:status`.                                     |

### Donde revisar si falla

- Si no deja iniciar sesion: `ipc_auth.ts`.
- Si entra pero luego expira: `session_store.ts` y `estructura-principal.js`.
- Si falta una funcion `window.api`: `preload.ts`.

## Catalogos, usuarios y permisos

| Archivo                              | Responsabilidad                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `src/main/ipc_core.ts`               | Carga version, catalogos y usuarios.                                           |
| `src/renderer/modulos/compartido.js` | Guarda catalogos en memoria y los usa en formularios/tablas.                   |
| `database.sql`                       | Datos base de roles, permisos, puestos, unidades, servicios y tipos de equipo. |

Canales:

```text
core:version
core:catalogos
core:usuarios
```

## Navegacion y estructura principal

| Archivo                                        | Responsabilidad                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/renderer/modulos/estructura-principal.js` | Dibuja sidebar, barra superior, control de ventana, cambio de modulo y permisos de rutas. |
| `src/renderer/modulos/cargador-renderer.js`    | Decide que archivo JS se carga por cada ruta.                                             |

Rutas principales:

```text
dashboard
calificacion
tickets
rutas
validar_rutas
reportes
proyectos_especiales
equipos
envio_equipo
```

Si quieres agregar un modulo nuevo:

1. Crear archivo en `src/renderer/modulos`.
2. Agregarlo en `archivosPorRuta` dentro de `cargador-renderer.js`.
3. Agregar la opcion de menu/ruta en `estructura-principal.js`.
4. Crear canales IPC en `preload.ts` y `src/main/ipc_*.ts` si necesita base de datos.

## Tickets

### Pantalla

| Archivo                                  | Responsabilidad                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/renderer/modulos/modulo-tickets.js` | Listado, filtros, crear, editar, cerrar, reabrir, eliminar, asignar tecnicos y manejar equipo relacionado. |

### Backend

| Archivo                   | Canales                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/ipc_tickets.ts` | `tickets:list`, `tickets:create`, `tickets:update`, `tickets:close`, `tickets:reopen`, `tickets:delete`, `tickets:setClasificacion`, `tickets:calificar`, `tickets:calificarAll`. |

### Tablas usadas

```text
ticket
ticket_tecnico
ticket_equipo
servicio
des_clasificacion
des_estado_calificacion
```

### Notificaciones relacionadas

Cuando se crea o edita un ticket y se asigna un tecnico nuevo, se inserta una fila en:

```text
notificacion_asignacion
```

Tipos usados:

```text
TICKET_ASSIGNED
```

## Rutas

### Pantalla

| Archivo                                    | Responsabilidad                                               |
| ------------------------------------------ | ------------------------------------------------------------- |
| `src/renderer/modulos/rutas-y-reportes.js` | Modulo de rutas, validacion de rutas y reportes relacionados. |

### Backend

| Archivo                 | Canales                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main/ipc_rutas.ts` | `rutas:list`, `rutas:create`, `rutas:update`, `rutas:close`, `rutas:reopen`, `rutas:validar`, `rutas:calificar`, `rutas:calificarAll`, `rutas:delete`. |

### Tablas usadas

```text
ruta
ruta_participante
equipos_revisados_rutas
catalogo_equipo_revisado_ruta
notificacion_asignacion
```

### Notificaciones relacionadas

Cuando se asigna un participante a una ruta:

```text
ROUTE_ASSIGNED
```

Cuando Gerencial valida una ruta creada por Supervisor:

```text
ROUTE_VALIDATED
```

## Validacion de rutas

| Archivo                                      | Responsabilidad                                   |
| -------------------------------------------- | ------------------------------------------------- |
| `src/renderer/modulos/rutas-y-reportes.js`   | Vista y formulario de validacion.                 |
| `src/main/ipc_rutas.ts`                      | Logica de `rutas:validar`.                        |
| `src/renderer/styles/modules/validacion.css` | Estilos principales de la pantalla de validacion. |

La validacion guarda:

```text
fechaValidacion
nombreValidador
puestoValidador
equipos_revisados_rutas
```

## Calificacion y dashboard

### Pantalla

| Archivo                                        | Responsabilidad                                        |
| ---------------------------------------------- | ------------------------------------------------------ |
| `src/renderer/modulos/calificacion-y-panel.js` | Dashboard, calificacion de tickets, rutas y proyectos. |

### Backend

| Archivo                                | Canales                                                           |
| -------------------------------------- | ----------------------------------------------------------------- |
| `src/main/ipc_reports.ts`              | `dashboard:operacion_mensual`, resumenes y consultas de reportes. |
| `src/main/ipc_tickets.ts`              | `tickets:calificar`, `tickets:calificarAll`.                      |
| `src/main/ipc_rutas.ts`                | `rutas:calificar`, `rutas:calificarAll`.                          |
| `src/main/ipc_proyectos_especiales.ts` | `proyectos_especiales:approve`.                                   |

## Reportes

### Pantalla

| Archivo                                    | Responsabilidad                                      |
| ------------------------------------------ | ---------------------------------------------------- |
| `src/renderer/modulos/rutas-y-reportes.js` | Pantallas de reportes de tickets, rutas y proyectos. |
| `src/renderer/modulos/compartido.js`       | Exportacion a Excel y helpers de tablas.             |

### Backend

| Archivo                                      | Canales                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/ipc_reports.ts`                    | `reports:build`, `reports:monthly`, `reports:tickets`, `reports:rutas`, `reports:tickets_summary`, `reports:rutas_summary`, `reports:proyectos_summary`, `reports:export_excel`, `reports:export_excel_multi`. |
| `src/main/services/report_query_service.ts`  | Construccion de consultas para reportes.                                                                                                                                                                       |
| `src/main/services/report_export_service.ts` | Apoyo para exportacion.                                                                                                                                                                                        |
| `src/main/ticket_excel_export.ts`            | Exportacion especifica de tickets.                                                                                                                                                                             |

## Equipos en taller

### Pantalla

| Archivo                                    | Responsabilidad                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/renderer/modulos/equipos-y-envios.js` | Vista de equipos y envios. En la parte de equipos maneja ingreso a taller, resultado, entrega, cancelacion y filtros. |
| `src/renderer/modulos/modulo-tickets.js`   | Tambien interactua con equipos cuando un ticket ingresa equipo al taller.                                             |

### Backend

| Archivo                   | Canales                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main/ipc_equipos.ts` | `equipos:ticketsAbiertos`, `equipos:create`, `equipos:list`, `equipos:updateResultado`, `equipos:byTicket`, `equipos:checkActivoEnTaller`, `equipos:checkPendiente`, `equipos:cerrarRelacionados`, `equipos:entregar`, `equipos:cancelar`, `equipos:delete`, `equipos:update`. |

### Tablas usadas

```text
ticket_equipo
ticket
tipo_equipo
unidad
usuario
```

## Envios de equipo

### Pantalla

| Archivo                                    | Responsabilidad                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/renderer/modulos/equipos-y-envios.js` | Registro de envios, historial, cambio de estado, asignacion de ticket y filtros. |

### Backend

| Archivo                        | Canales                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/ipc_envio_equipo.ts` | `envio_equipo:list`, `envio_equipo:create`, `envio_equipo:ticketsDisponibles`, `envio_equipo:assignTicket`, `envio_equipo:updateEstado`, `envio_equipo:notifications`. |

### Tablas usadas

```text
envio_equipo
des_estado_envio
des_motivo_envio
des_medio_envio
ticket
ticket_equipo
unidad
tipo_equipo
usuario
```

## Campana de notificaciones

### Pantalla

| Archivo                                               | Responsabilidad                                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/renderer/modulos/estructura-principal.js`        | Crea la campana, el contador, el panel desplegable y el sondeo cada 15 segundos.                                            |
| `src/renderer/styles/components/system-overrides.css` | Estilos de `.notification-center`, `.notification-bell`, `.notification-badge`, `.notification-panel` y elementos internos. |

### Puente

| Archivo                  | Responsabilidad                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `src/preload/preload.ts` | Expone `envio_equipo_notifications`, que llama el canal `envio_equipo:notifications`. |

### Backend

| Archivo                        | Responsabilidad                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `src/main/ipc_envio_equipo.ts` | Consulta las notificaciones segun rol y devuelve eventos nuevos desde el cursor.   |
| `src/main/db/db.ts`            | Crea la tabla `notificacion_asignacion` si no existe.                              |
| `src/main/ipc_tickets.ts`      | Inserta notificaciones cuando se asignan tickets.                                  |
| `src/main/ipc_rutas.ts`        | Inserta notificaciones cuando se asignan rutas o cuando Gerencial valida una ruta. |

### Tipos de notificacion

```text
NEW_SHIPMENT      Nuevo envio visible para Analista.
STATUS_CHANGED   Cambio de estado visible para Gerencial.
TICKET_ASSIGNED  Ticket asignado a Tecnico.
ROUTE_ASSIGNED   Ruta asignada a Tecnico.
ROUTE_VALIDATED  Ruta validada por Gerencial para Supervisor.
```

### Como funciona el cursor

El renderer guarda en `localStorage` la ultima fecha consultada:

```text
notificationCursorV4:<idUsuario>
```

Cada 15 segundos pide solo eventos con fecha mayor al cursor.
Si llegan eventos nuevos, aumenta el contador de la campana.

## Proyectos especiales

### Pantalla

| Archivo                                                                      | Responsabilidad                         |
| ---------------------------------------------------------------------------- | --------------------------------------- |
| `src/renderer/modulos/proyectos-especiales/cargador-proyectos-especiales.js` | Une los archivos del modulo.            |
| `src/renderer/modulos/proyectos-especiales/vista-proyectos-especiales.js`    | Lista, filtros y vista principal.       |
| `src/renderer/modulos/proyectos-especiales/modales-proyectos-especiales.js`  | Formularios y modales.                  |
| `src/renderer/modulos/proyectos-especiales/utilidades-documento.js`          | Apertura segura de documentos externos. |

### Backend

| Archivo                                | Canales                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/main/ipc_proyectos_especiales.ts` | `proyectos_especiales:list`, `proyectos_especiales:create`, `proyectos_especiales:approve`. |

### Tabla usada

```text
proyecto_especial
```

## Exportacion a Excel

| Archivo                                | Responsabilidad                                                |
| -------------------------------------- | -------------------------------------------------------------- |
| `src/renderer/modulos/compartido.js`   | Botones y llamadas de exportacion desde la UI.                 |
| `src/main/ipc_reports.ts`              | Canales `reports:export_excel` y `reports:export_excel_multi`. |
| `src/main/services/export_security.ts` | Sanea nombres y valores para evitar formulas peligrosas.       |
| `src/main/ticket_excel_export.ts`      | Exportacion detallada para tickets.                            |

## Fechas y periodo 26-25

| Archivo                                   | Responsabilidad                                                       |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `src/main/services/domain_utils.ts`       | Helpers de dominio, fechas y normalizacion usada por servicios.       |
| `src/main/services/validation_service.ts` | Validaciones como rangos invertidos y cierre antes de apertura.       |
| `tests/core-services.test.js`             | Pruebas que verifican periodo mensual 26-25 y validaciones de fechas. |

Scripts creados para actualizar datos existentes:

```text
scripts/actualizar-fechas-periodo-2026-06-26_2026-07-25.sql
scripts/actualizar-fechas-todos-los-tickets-2026-06-26_2026-07-25.sql
```

## Estilos

| Archivo o carpeta                    | Responsabilidad                                               |
| ------------------------------------ | ------------------------------------------------------------- |
| `src/renderer/styles/app.css`        | Importa todos los CSS fuente.                                 |
| `src/renderer/styles/app.bundle.css` | Archivo generado para distribucion. No editar a mano.         |
| `src/renderer/styles/core`           | Variables, reset, tipografia, layout y base del shell.        |
| `src/renderer/styles/components`     | Botones, tablas, modales, sidebar, toasts y ajustes globales. |
| `src/renderer/styles/modules`        | Estilos especificos por modulo.                               |

Para cambios visuales:

1. Editar el CSS fuente correspondiente.
2. Ejecutar `npm run build:css`.
3. Verificar que se actualice `app.bundle.css`.

## Base de datos

| Archivo             | Responsabilidad                                                |
| ------------------- | -------------------------------------------------------------- |
| `database.sql`      | Estructura y datos semilla.                                    |
| `src/main/db/db.ts` | Conexion, migraciones ligeras y creacion de tablas auxiliares. |

Tablas principales:

```text
usuario
rol
permiso
rol_permiso
unidad
puesto
servicio
ticket
ticket_tecnico
ticket_equipo
ruta
ruta_participante
envio_equipo
proyecto_especial
notificacion_asignacion
```

## Pruebas

| Archivo                       | Responsabilidad                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `tests/core-services.test.js` | Pruebas de servicios, validaciones, reportes, notificaciones y seguridad de exportacion. |
| `tests/envio-history.test.js` | Pruebas relacionadas con historial/resumen de envios.                                    |

Comando:

```bash
npm test
```

El comando compila el proyecto, genera CSS y ejecuta las pruebas.

## Guia rapida para ubicar cambios

| Quiero cambiar...             | Empieza aqui                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Login o permisos de entrada   | `src/main/ipc_auth.ts` y `src/renderer/modulos/autenticacion.js`                     |
| Menu lateral o rutas visibles | `src/renderer/modulos/estructura-principal.js`                                       |
| Campana de notificaciones     | `src/renderer/modulos/estructura-principal.js` y `src/main/ipc_envio_equipo.ts`      |
| Crear/editar/cerrar tickets   | `src/renderer/modulos/modulo-tickets.js` y `src/main/ipc_tickets.ts`                 |
| Crear/editar/validar rutas    | `src/renderer/modulos/rutas-y-reportes.js` y `src/main/ipc_rutas.ts`                 |
| Equipos en taller             | `src/renderer/modulos/equipos-y-envios.js` y `src/main/ipc_equipos.ts`               |
| Envios de equipo              | `src/renderer/modulos/equipos-y-envios.js` y `src/main/ipc_envio_equipo.ts`          |
| Reportes                      | `src/renderer/modulos/rutas-y-reportes.js` y `src/main/ipc_reports.ts`               |
| Dashboard/calificacion        | `src/renderer/modulos/calificacion-y-panel.js`                                       |
| Proyectos especiales          | `src/renderer/modulos/proyectos-especiales` y `src/main/ipc_proyectos_especiales.ts` |
| Exportar Excel                | `src/renderer/modulos/compartido.js` y `src/main/ipc_reports.ts`                     |
| Conexion a base de datos      | `src/main/db/db.ts`                                                                  |
| Estilos visuales              | `src/renderer/styles`                                                                |
| Datos iniciales               | `database.sql`                                                                       |

## Reglas practicas para modificar el sistema

1. Si cambias una pantalla, revisa primero el archivo del renderer.
2. Si la pantalla necesita datos, revisa `preload.ts`.
3. Si la funcion ya existe en `preload.ts`, busca el canal en `src/main/ipc_*.ts`.
4. Si cambias consultas SQL, revisa tambien permisos y validaciones.
5. Si agregas columnas o tablas, actualiza `database.sql` y la migracion ligera en `db.ts` si aplica.
6. Si cambias estilos, edita CSS fuente y ejecuta `npm run build:css`.
7. Antes de cerrar un cambio, ejecuta `npm test`.
