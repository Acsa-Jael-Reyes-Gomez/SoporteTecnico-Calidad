# Revisión de código y deuda técnica

## Observaciones de revisión

| ID      | Hallazgo                                                                                | Severidad | Estado    | Acción                                                             |
| ------- | --------------------------------------------------------------------------------------- | --------- | --------- | ------------------------------------------------------------------ |
| DEF-001 | La fecha `2026-02-30` era aceptada por la normalización automática de JavaScript.       | Alta      | Corregido | Validación exacta de componentes de fecha y prueba de regresión.   |
| OBS-001 | Las pruebas cargan servicios desde `dist`, por lo que necesitan una compilación previa. | Media     | Conocido  | El pipeline compila antes de probar.                               |
| OBS-002 | Las regresiones de interfaz verifican texto fuente con expresiones regulares.           | Media     | Pendiente | Migrar gradualmente reglas críticas a funciones testeables.        |
| OBS-003 | No hay pruebas contra una base de datos de prueba.                                      | Media     | Pendiente | Crear entorno MySQL/ODBC aislado si se dispone de infraestructura. |

## Inspeccion manual local de la entrega CI/CD (29/10/2026)

Se inspeccionaron los cambios de mayor riesgo de la rama `cierre-requisitos-sqa`:

| Area revisada                      | Comprobacion                                                                                                                              | Resultado                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/quality.yml`    | Eventos `push` y `pull_request`, permisos de solo lectura, orden de build/pruebas/cobertura/analisis y archivo de reportes                | Sin hallazgos bloqueantes en el flujo inspeccionado                                                                                |
| `src/main/db/db.ts`                | La base se crea en `userData` o en la ruta de prueba, copia la semilla a una base escribible y activa claves foraneas y espera de bloqueo | Sin hallazgos bloqueantes; falta probar el ciclo completo de Electron                                                              |
| `src/main/db/sqlite_connection.ts` | Valores parametrizados, rechazo de tipos no compatibles y transacciones con `BEGIN`/`COMMIT`/`ROLLBACK`                                   | Sin hallazgos bloqueantes en las operaciones cubiertas; la traduccion MySQL cubre solo las sentencias utilizadas por la aplicacion |
| `package.json`                     | Configuracion local fuera del paquete y comandos reproducibles para esquema/importacion SQLite                                            | Sin hallazgos bloqueantes                                                                                                          |
| `tests/sqlite-connection.test.js`  | CRUD, conflicto, transacciones, parametros, integridad y fechas de la semilla                                                             | Los 5 casos pasan en la suite de 33 pruebas                                                                                        |

Esta inspeccion es evidencia de revision tecnica local, no una aprobacion independiente de pares. Ese registro pertenece al estado histórico del 30/10/2026. Posteriormente, el PR #7 recibió dos aprobaciones independientes de Acsa-Reyes, tres checks correctos y se fusionó a `main`.

## Registro de deuda técnica

| ID     | Deuda                                                                                  | Impacto                                                        | Prioridad | Próximo paso                                                                     |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- |
| DT-001 | La inicialización de base de datos contiene lógica amplia de esquema y compatibilidad. | Riesgo de cambios difíciles de aislar.                         | Alta      | Separar migraciones de la capa de conexión.                                      |
| DT-002 | El límite ODBC conserva varios usos de `any`; ESLint los reporta como advertencias.    | Tipos de datos dinámicos no quedan comprobados en compilación. | Media     | Introducir tipos del driver gradualmente cuando se refactorice la capa de datos. |
| DT-003 | Cobertura E2E acotada a inicio, login y alta de ticket.                                | Otros módulos aún no se recorren integralmente.                | Media     | Ampliar gradualmente los recorridos E2E en SQLite aislado.                                       |

## Revisión manual sugerida

Antes de fusionar cambios, revisar que no se añadan secretos, que no se modifique `appsettings.json`, que las consultas sigan parametrizadas y que el cambio incluya una prueba cuando afecte reglas de negocio.

## Actualización comprobable de cierre (noviembre de 2026)

- DEF-001, validación de fechas: corregida con prueba de regresión, según registro histórico.
- PR #7: dos aprobaciones, tres checks aprobados y merge a `main`.
- Test runner: 140/140 casos aprobados, 0 fallidos, run 41564667224.
- Prueba E2E: inicio de Electron, login, navegación a Tickets y guardado en SQLite aislado.
- SonarQube: Quality Gate PASSED; 80,1 % de cobertura del código nuevo y 0,48 % de duplicación del código nuevo.
- Deuda pendiente: cobertura general 30,2 % según el panel global; los issues históricos restantes necesitan priorización y casos de regresión al corregirse.
