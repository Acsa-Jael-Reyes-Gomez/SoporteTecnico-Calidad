# Procedencia y límites del antecedente

Informe aportado por la estudiante el 3 de noviembre de 2026. Se incorpora su análisis documental; en este cierre no se ejecutó ni se inspeccionó nuevamente el archivo RAR original. Solo se publica este informe sin configuraciones, credenciales ni copia del sistema antiguo. Las referencias temporales son marcas de archivo.

SHA-256 del documento aportado: `86607bb695b2b930397b186757fd35155db56992d7d71f7f40065ce535115276`. Se conserva el contenido histórico y el inventario; se omiten las sugerencias editoriales del documento fuente.

# Línea base histórica verificada — SoporteTecnico (antes del proyecto SQA)

**Origen:** copia anterior `SoporteTecnico-main`, aportada en archivo RAR. Esta revisión se limita a los archivos originales de código y documentación seleccionados; no ejecuta la aplicación antigua ni modifica el repositorio actual.

## 1. Qué demuestra la copia antigua

- **Fecha de referencia:** el archivo `package.json` y `tests/core-services.test.js` llevan marcas de modificación del **30 de julio de 2026**; `envio-history.test.js`, del **6 de julio de 2026**. Son fechas de archivo, no una certificación de cuándo se ejecutaron pruebas.
- **Pruebas existentes:** se encontraron **25 declaraciones `test(...)`**, repartidas en **22** de `tests/core-services.test.js` y **3** de `tests/envio-history.test.js`. Se verificaron leyendo sus nombres directamente del código. Esto aporta un respaldo concreto al dato de la línea base: 25 casos definidos.
- **Ejecución antigua:** el script `npm test` estaba configurado para compilar (`npm run build`) y ejecutar `node --test tests/*.test.js`. **No se encontró un registro de ejecución** dentro de esta comprobación que pruebe cuántos aprobaron o fallaron en julio. Por ello **no debe escribirse «25 pruebas aprobadas»**.
- **Tecnologías originales:** el paquete utiliza Electron, TypeScript, JavaScript, el módulo `odbc` y `write-excel-file`. El mapa funcional documenta conexión a **MySQL** mediante `src/main/db/db.ts`. La versión actual migró el almacenamiento de las pruebas a SQLite aislado, por lo que no se debe afirmar que la copia histórica ya utilizaba SQLite.
- **Controles de calidad al inicio:** el `package.json` de la copia **no definía** scripts `test:coverage`, `lint`, `format:check` ni `typecheck`. En el contenido del archivo proporcionado **no aparecen** `.github/workflows/`, `sonar-project.properties` ni `docs/SQA-Plan.md`. Esto prueba la ausencia de esas configuraciones _en esta copia_, no que nunca se hayan utilizado fuera de ella.
- **Cobertura inicial:** no hay reporte inicial comparable en el material examinado. Se declara **«no medida / sin evidencia»**, no 0 %.

## 2. Evolución verificable del proyecto

| Momento                                |                Pruebas | Cobertura de líneas | Interpretación correcta                                                                                                |
| -------------------------------------- | ---------------------: | ------------------: | ---------------------------------------------------------------------------------------------------------------------- |
| Copia anterior (julio de 2026)         | **25 casos definidos** |       **No medida** | Dos archivos de pruebas, sin resultado histórico conservado de aprobadas/fallidas.                                     |
| 27 de octubre de 2026                  |    **28/28 aprobadas** |         **95,65 %** | Revisión intermedia, con alcance e instrumentación propios.                                                            |
| 29 de octubre de 2026                  |    **33/33 aprobadas** |         **96,16 %** | Revisión posterior con pruebas SQLite, no equivalente a la línea base inicial.                                         |
| Primer cierre GitHub Actions           |  **140/140 aprobadas** |         **88,90 %** | Medición c8 histórica que incluía parte de archivos de pruebas/herramientas.                                           |
| Cierre técnico corregido (3 nov. 2026) |  **146/146 aprobadas** |         **83,30 %** | Medición c8 corregida para el alcance de código de aplicación instrumentado; **70,41 % ramas**, **94,66 % funciones**. |

**Atención:** una disminución del porcentaje a lo largo de esta tabla **no prueba que la calidad empeorara**. Cambió el conjunto de archivos que entraban en el denominador, además de las revisiones del proyecto. No son series homogéneas. El valor **86,5 % de cobertura de código nuevo de SonarQube** pertenece a otra medición y tampoco puede restarse de c8.

**Magnitud comparable sin afirmar éxito histórico:** de **25 casos definidos** a **146 pruebas actualmente aprobadas** significa **121 casos más** en el inventario/ejecución final que el número de declaraciones de la copia original. No se calcula un «porcentaje de mejora de aprobaciones», porque la base no conserva una ejecución de los 25.

## 3. Lista exacta de las 25 pruebas en la copia original

Extraída de llamadas literales a `test(...)` en los dos archivos originales. Son nombres de casos; no constituyen un log de ejecución.

|  Nº | Archivo histórico             | Nombre del caso definido                                                                       |
| --: | ----------------------------- | ---------------------------------------------------------------------------------------------- |
|  01 | `tests/core-services.test.js` | normaliza paginación conservando límites                                                       |
|  02 | `tests/core-services.test.js` | centraliza normalización de catálogos, estados y período mensual                               |
|  03 | `tests/core-services.test.js` | los desplegables confirman con Tab y los módulos muestran el período 26-25                     |
|  04 | `tests/core-services.test.js` | gerencial consulta todas las rutas pendientes sin rango de fechas                              |
|  05 | `tests/core-services.test.js` | todas las tablas permiten redimensionar, ocultar y recuperar columnas                          |
|  06 | `tests/core-services.test.js` | calificación, seguimiento y reportes usan el encabezado visual de Tickets                      |
|  07 | `tests/core-services.test.js` | rechaza rangos de fecha invertidos                                                             |
|  08 | `tests/core-services.test.js` | rechaza cierre anterior a apertura                                                             |
|  09 | `tests/core-services.test.js` | deduplica referencias positivas                                                                |
|  10 | `tests/core-services.test.js` | neutraliza fórmulas y sanea nombres de exportación                                             |
|  11 | `tests/core-services.test.js` | permite revocar sesiones activas                                                               |
|  12 | `tests/core-services.test.js` | no ejecuta consultas paralelas sobre una conexión ODBC 3.51                                    |
|  13 | `tests/core-services.test.js` | los módulos con búsqueda textual exponen el query filter y lo envían al backend                |
|  14 | `tests/core-services.test.js` | la exportación de tickets conserva los filtros de la búsqueda                                  |
|  15 | `tests/core-services.test.js` | el reporte global de rutas usa una sola solicitud ODBC                                         |
|  16 | `tests/core-services.test.js` | los tres reportes visibles conservan filtros y evitan agregados frágiles de ODBC               |
|  17 | `tests/core-services.test.js` | reportes de rutas y proyectos excluyen abiertos, no calificados y no aprobados                 |
|  18 | `tests/core-services.test.js` | reportes de tickets detallado y resumen incluyen exclusivamente tickets calificados y cerrados |
|  19 | `tests/core-services.test.js` | el reporte exportable de tickets resume por ticket único y conserva el número de ticket        |
|  20 | `tests/core-services.test.js` | las notificaciones de envíos consultan cambios incrementales sin sockets                       |
|  21 | `tests/core-services.test.js` | los técnicos reciben notificaciones por nuevas asignaciones de tickets y rutas                 |
|  22 | `tests/core-services.test.js` | el supervisor recibe aviso cuando gerencial valida una ruta que creó                           |
|  23 | `tests/envio-history.test.js` | el historial de envios carga completo y conserva filtros opcionales                            |
|  24 | `tests/envio-history.test.js` | serializa las operaciones ODBC para evitar bloqueos del driver 3.51                            |
|  25 | `tests/envio-history.test.js` | el resumen de envios evita parametros dentro de agregados incompatibles con ODBC 3.51          |
