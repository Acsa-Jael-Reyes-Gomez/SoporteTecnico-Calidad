# Antecedente histórico; no estado vigente

# Revisión de código y deuda técnica

## Observaciones de revisión

| ID      | Hallazgo                                                                                | Severidad | Estado    | Acción                                                             |
| ------- | --------------------------------------------------------------------------------------- | --------- | --------- | ------------------------------------------------------------------ |
| DEF-001 | La fecha `2026-02-30` era aceptada por la normalización automática de JavaScript.       | Alta      | Corregido | Validación exacta de componentes de fecha y prueba de regresión.   |
| OBS-001 | Las pruebas cargan servicios desde `dist`, por lo que necesitan una compilación previa. | Media     | Conocido  | El pipeline compila antes de probar.                               |
| OBS-002 | Las regresiones de interfaz verifican texto fuente con expresiones regulares.           | Media     | Pendiente | Migrar gradualmente reglas críticas a funciones testeables.        |
| OBS-003 | No había pruebas contra una base de datos de prueba en esa revisión histórica.                                      | Media     | Pendiente | En la arquitectura actual, utilizar SQLite temporal aislado. |

## Inspeccion manual local de la entrega CI/CD (29/10/2026)

Se inspeccionaron los cambios de mayor riesgo de la rama `cierre-requisitos-sqa`:

| Area revisada                      | Comprobacion                                                                                                                              | Resultado                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/quality.yml`    | Eventos `push` y `pull_request`, permisos de solo lectura, orden de build/pruebas/cobertura/analisis y archivo de reportes                | Sin hallazgos bloqueantes en el flujo inspeccionado                                                                                |
| `src/main/db/db.ts`                | La base se crea en `userData` o en la ruta de prueba, copia la semilla a una base escribible y activa claves foraneas y espera de bloqueo | Sin hallazgos bloqueantes; falta probar el ciclo completo de Electron                                                              |
| `src/main/db/sqlite_connection.ts` | Valores parametrizados, rechazo de tipos no compatibles y transacciones con `BEGIN`/`COMMIT`/`ROLLBACK`                                   | Sin hallazgos bloqueantes en las operaciones cubiertas; la traduccion MySQL cubre solo las sentencias utilizadas por la aplicacion |
| `package.json`                     | Configuracion local fuera del paquete y comandos reproducibles para esquema/importacion SQLite                                            | Sin hallazgos bloqueantes                                                                                                          |
| `tests/sqlite-connection.test.js`  | CRUD, conflicto, transacciones, parametros, integridad y fechas de la semilla                                                             | Los 5 casos pasan en la suite de 33 pruebas                                                                                        |

Esta inspeccion es evidencia de revision tecnica local, no una aprobacion independiente de pares. Ese registro pertenece al estado histórico del 30/10/2026. Posteriormente, el PR #7 recibió dos eventos de aprobación de la misma cuenta revisora (Acsa-Reyes), superó tres checks y se fusionó a `main`.

## Registro de deuda técnica

| ID     | Deuda                                                                                  | Impacto                                                        | Prioridad | Próximo paso                                                                     |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- |
| DT-001 | La inicialización de base de datos contiene lógica amplia de esquema y compatibilidad. | Riesgo de cambios difíciles de aislar.                         | Alta      | Separar migraciones de la capa de conexión.                                      |
| DT-002 | El código histórico ODBC conserva usos de `any`; son antecedentes del sistema anterior.    | Tipos de datos dinámicos no quedan comprobados en compilación. | Media     | Conservar esta observación solo como antecedente; el cierre usa SQLite. |
| DT-003 | Cobertura E2E acotada a inicio, login y alta de ticket.                                | Otros módulos aún no se recorren integralmente.                | Media     | Ampliar gradualmente los recorridos E2E en SQLite aislado.                       |

## Revisión manual sugerida

Antes de fusionar cambios, revisar que no se añadan secretos, que no se modifique `appsettings.json`, que las consultas sigan parametrizadas y que el cambio incluya una prueba cuando afecte reglas de negocio.

## Actualización comprobable de cierre (noviembre de 2026)

- DEF-001, validación de fechas: corregida con prueba de regresión, según registro histórico.
- PR #7: dos eventos de aprobación de una misma cuenta, tres checks aprobados y fusión a `main`.
- Test runner: 140/140 casos aprobados, 0 fallidos, run 41564667224.
- Prueba E2E: inicio de Electron, login, navegación a Tickets y guardado en SQLite aislado.
- SonarQube: Quality Gate PASSED; 80,1 % de cobertura del código nuevo y 0,48 % de duplicación del código nuevo.
- Deuda pendiente: cobertura general 30,2 % según el panel global; los issues históricos restantes necesitan priorización y casos de regresión al corregirse.

## Verificación pública del 03/11/2026

SonarQube reporta 20 bugs, 1 vulnerabilidad y 15 code smells globales. Priorizar la revisión de la vulnerabilidad y de los bugs por impacto; no se afirma su resolución. El código nuevo no agrega hallazgos según la API. La cobertura global de 30,2 % se mantiene como deuda distinta de la cobertura nueva de 80,1 %. Evidencia: `evidencias/cierre-20261103/sonar-metricas.json`.

El fallo de push 41678126873 provino de una restricción de SonarQube sobre ramas distintas de main. El commit 6ccb7cc ejecuta SonarQube solo en PR o main, conserva los demás controles en todos los push y sigue esperando el Quality Gate. El push 41687471160 aprobó con esa corrección.
