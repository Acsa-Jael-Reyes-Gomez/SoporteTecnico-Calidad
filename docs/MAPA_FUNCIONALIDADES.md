# Mapa de funcionalidades

Este documento ayuda a ubicar las partes principales del Sistema de Soporte Técnico.

## Cómo funciona

La aplicación tiene tres partes:

1. **Renderer:** muestra las pantallas y recibe las acciones del usuario.
2. **Preload:** comunica las pantallas con el proceso principal mediante `window.api`.
3. **Main:** valida datos y permisos y trabaja con SQLite.

## Dónde está cada parte

| Función                      | Ubicación principal                    |
| ---------------------------- | -------------------------------------- |
| Inicio de sesión             | `src/main/ipc_auth.ts`                 |
| Tickets                      | `src/main/ipc_tickets.ts`              |
| Rutas                        | `src/main/ipc_rutas.ts`                |
| Equipos en taller            | `src/main/ipc_equipos.ts`              |
| Envíos                       | `src/main/ipc_envio_equipo.ts`         |
| Proyectos especiales         | `src/main/ipc_proyectos_especiales.ts` |
| Reportes                     | `src/main/ipc_reports.ts`              |
| Base de datos                | `src/main/db/`                         |
| Comunicación con la interfaz | `src/preload/preload.ts`               |
| Pantallas                    | `src/renderer/modulos/`                |
| Estilos                      | `src/renderer/styles/`                 |

## Cómo revisar un cambio

Si quiero revisar una función, primero busco su pantalla en `src/renderer/modulos/`, después la operación expuesta en Preload y por último su lógica en `src/main/`. Las pruebas correspondientes están en `tests/`.

Este mapa es una guía general; no reemplaza la lectura del código.
