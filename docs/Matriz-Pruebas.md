# Matriz de pruebas

## Alcance y ejecución

La matriz se mantiene sincronizada con `tests/` y `scripts/test-electron-e2e.js`. Las suites incluyen pruebas unitarias de servicios, integración con SQLite en memoria, regresiones del Renderer/handlers y un flujo E2E que inicia Electron con una base aislada, autentica y crea un ticket.

Ejecución local reproducida el 29 de octubre de 2026 con Node.js 22: **33 aprobadas, 0 fallidas**, incluidas las pruebas SQLite PR-29 a PR-33. Las 28 pruebas PR-01 a PR-28 también aparecen en el artefacto remoto del run 40599606066, que corresponde al commit publicado anterior a los cambios locales SQLite. La evidencia de ambas ejecuciones se registra por separado en `docs/calidad/EVIDENCIAS_EJECUCION.md`.

| ID    | Tipo                   | Entrada o preparación                                                       | Resultado esperado                                                                  | Resultado obtenido |
| ----- | ---------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| PR-01 | Unitaria               | Página 2, tamaño 500 y valores no válidos para límite/desplazamiento        | Normaliza los límites y genera una cláusula segura de paginación                    | Aprobada           |
| PR-02 | Unitaria               | Nombre de catálogo, estado y fecha dentro del período mensual 26–25         | Normaliza claves/estados y devuelve el intervalo mensual correcto                   | Aprobada           |
| PR-03 | Regresión              | Archivos de módulos Renderer y selección con Tab                            | Los desplegables confirman la opción y los módulos usan el período mensual          | Aprobada           |
| PR-04 | Regresión              | Consulta gerencial de rutas pendientes sin fechas                           | La consulta no impone un rango mensual al flujo gerencial                           | Aprobada           |
| PR-05 | Regresión              | Código compartido y estilos de tablas                                       | Permite cambiar tamaño, ocultar y recuperar columnas                                | Aprobada           |
| PR-06 | Regresión              | Encabezados de Tickets, calificación, envíos, reportes y proyectos          | Los módulos conservan el encabezado visual compartido                               | Aprobada           |
| PR-07 | Unitaria               | Fecha inicial posterior a la fecha final                                    | Rechaza el intervalo invertido con error de validación                              | Aprobada           |
| PR-08 | Unitaria               | Fecha de cierre anterior a la fecha de apertura                             | Rechaza la secuencia cronológica inválida                                           | Aprobada           |
| PR-09 | Unitaria               | Lista con IDs repetidos, negativos y no numéricos                           | Devuelve una lista de IDs positivos únicos                                          | Aprobada           |
| PR-10 | Integración controlada | Fechas válidas/inválidas e identificador SQL probado con una conexión doble | Rechaza fechas inválidas e identificadores manipulados; parametriza el ID válido    | Aprobada           |
| PR-11 | Integración controlada | Parámetros de paginación, texto de búsqueda e ID de estado                  | Normaliza límites, parametriza filtros y cuenta filas con parámetros                | Aprobada           |
| PR-12 | Unitaria               | Celdas con fórmulas y nombres de archivo/hoja con caracteres inválidos      | Neutraliza fórmulas y sanea nombres de exportación                                  | Aprobada           |
| PR-13 | Unitaria               | Estructura anidada con fórmulas y sesiones con/sin permisos                 | Sanea recursivamente y permite/rechaza permisos según corresponda                   | Aprobada           |
| PR-14 | Unitaria               | Sesión activa asociada a una persona usuaria                                | Revoca sus sesiones y deja de confiar en la sesión revocada                         | Aprobada           |
| PR-15 | Regresión              | Handlers de envíos y tickets con SQLite                                     | No comparte la conexión mediante consultas paralelas                                | Aprobada           |
| PR-16 | Regresión              | Módulos de tickets, rutas, calificación y proyectos                         | Expone y envía el filtro de búsqueda al backend                                     | Aprobada           |
| PR-17 | Regresión              | Filtros de búsqueda usados para exportar tickets                            | Conserva los filtros y genera el nombre de exportación esperado                     | Aprobada           |
| PR-18 | Regresión              | Reporte global de rutas                                                     | Obtiene las filas con una sola solicitud                                            | Aprobada           |
| PR-19 | Regresión              | Interfaz y handlers de reportes de tickets, rutas y proyectos               | Conserva filtros y evita agregaciones frágiles para el driver                       | Aprobada           |
| PR-20 | Regresión              | Datos de rutas/proyectos abiertos, no calificados o no aprobados            | Excluye registros que no cumplen los estados de cierre/aprobación                   | Aprobada           |
| PR-21 | Regresión              | Datos de tickets detallados y resumidos                                     | Incluye únicamente tickets cerrados y calificados                                   | Aprobada           |
| PR-22 | Regresión              | Filas repetidas por ticket y exportación de Excel                           | Resume por ticket único cuando corresponde y conserva su número                     | Aprobada           |
| PR-23 | Regresión              | Cambios de envíos y funciones de notificación                               | Consulta cambios incrementales sin sockets y aplica el intervalo de sondeo previsto | Aprobada           |
| PR-24 | Regresión              | Asignación de tickets/rutas a personal técnico                              | Registra y presenta avisos por nuevas asignaciones                                  | Aprobada           |
| PR-25 | Regresión              | Ruta creada por supervisión y validada por gerencia                         | Notifica a supervisión cuando la ruta queda validada                                | Aprobada           |
| PR-26 | Regresión              | Historial de envíos con filtros de fecha opcionales                         | Carga el historial sin imponer fechas y conserva los filtros elegidos               | Aprobada           |
| PR-27 | Regresión              | Cola de operaciones sobre conexión SQLite integrada                         | Serializa el acceso para evitar bloqueos del controlador                            | Aprobada           |
| PR-28 | Regresión              | Resumen de envíos con agregaciones SQL                                      | Agrupa por estado y evita parámetros dentro de agregaciones incompatibles           | Aprobada           |

## Límites

- Los casos clasificados como regresión estática inspeccionan patrones de código; no simulan una interacción real de la interfaz.
- La prueba E2E cubre el arranque, login, navegación y alta de ticket mediante la interfaz Electron. No cubre todos los módulos ni todos los flujos de negocio.
- La cobertura reportada por Node incluye los módulos cargados durante la suite; no equivale a cobertura de toda la aplicación.

## Casos añadidos para SQLite (ejecución local aprobada)

Los siguientes casos están implementados en `tests/sqlite-connection.test.js`. Los cinco aprobaron en la ejecución local completa del 29/10/2026.

| ID    | Tipo                  | Validación                              | Resultado esperado                                          |
| ----- | --------------------- | --------------------------------------- | ----------------------------------------------------------- |
| PR-29 | Integración           | CRUD parametrizado en SQLite en memoria | Inserta, consulta y devuelve ID generado                    | Aprobada |
| PR-30 | Integración           | INSERT IGNORE y ON DUPLICATE KEY UPDATE | Traduce las sentencias y actualiza el registro              | Aprobada |
| PR-31 | Integración           | Commit y rollback                       | Confirma y revierte las transacciones respectivas           | Aprobada |
| PR-32 | Integración           | Parámetro no compatible y error SQL     | Rechaza el objeto y propaga el error de consulta            | Aprobada |
| PR-33 | Integración/regresión | Integridad de semilla y fechas          | quick_check correcto y fechas entre 25/09/2026 y 26/10/2026 | Aprobada |

## Recorrido E2E de Electron

La prueba `npm run test:e2e` inicia el ejecutable Electron real, crea un archivo SQLite temporal con datos sintéticos, verifica la pantalla inicial y el puente Preload/IPC, inicia sesión, abre el módulo Tickets, registra un ticket desde el formulario y comprueba su persistencia en SQLite. La base temporal se elimina al finalizar.

Ejecución local aprobada el 29 de octubre de 2026. El mismo comando está integrado al workflow de GitHub Actions y su salida se adjunta como `coverage/e2e-electron.log`.

| ID     | Tipo              | Flujo validado                                       | Resultado esperado                                                                    | Resultado obtenido |
| ------ | ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| E2E-01 | Extremo a extremo | Arranque Electron → login → Tickets → alta de ticket | La app carga el puente, autentica, muestra el módulo y persiste el registro de prueba | Aprobada           |
