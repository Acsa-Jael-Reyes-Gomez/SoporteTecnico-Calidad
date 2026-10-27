# Diagnóstico inicial de la copia

**Fecha de inspección:** 26 de octubre de 2026  
**Carpeta verificada:** `C:\Users\IT\Desktop\COPIA_TICKETS_CALIDAD\SoporteTecnico-main`

## Identidad y procedencia

El paquete se llama `soportetecnico` (versión npm `1.0.2`) y su metadato de repositorio apunta a `acsa123/SoporteTecnico`. La versión de aplicación declarada en `appsettings.json` es `1.0.5`. La carpeta contiene el código y los recursos del sistema de soporte, pruebas, configuración de empaquetado Electron, esquema MySQL y documentación funcional. El archivo de configuración local `appsettings.json` no está versionado según `.gitignore`.

## Arquitectura detectada

Aplicación de escritorio Electron con tres capas:

1. **Renderer:** HTML, JavaScript modular y CSS. No se observó React.
2. **Preload:** TypeScript expone un puente acotado `window.api` para la interfaz.
3. **Main:** TypeScript registra IPC, aplica permisos y validaciones y accede a la base de datos. No se observó Express ni una API HTTP.

Persistencia MySQL mediante el paquete `odbc` y un DSN de Windows (`Tickets_IT` por defecto), con opción de pasar una cadena de conexión mediante `SOPORTE_ODBC_CONNECTION`. `database.sql` contiene tablas InnoDB y datos de inicialización. `autoMigrate` está en `false`; la aplicación conserva migraciones ligeras controladas por código, pero su activación depende de configuración.

## Estructura relevante

| Ruta                            | Función                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `src/main/main.ts`              | Arranque de Electron y registro de módulos IPC                       |
| `src/main/ipc_*.ts`             | Autenticación, tickets, rutas, reportes, equipos, envíos y proyectos |
| `src/main/services/`            | Validación, paginación, consultas y exportación                      |
| `src/main/db/db.ts`             | Pool ODBC, configuración, helpers de esquema y conexión              |
| `src/preload/preload.ts`        | Puente entre interfaz y proceso principal                            |
| `src/renderer/`                 | Interfaz web empaquetada con Electron                                |
| `database.sql`                  | Esquema y semilla de MySQL                                           |
| `tests/`                        | Dos archivos con 28 declaraciones `test()` detectadas                |
| `.github/workflows/quality.yml` | Pipeline existente, actualizado durante este trabajo                 |

## Funciones CRUD y reglas existentes

El mapa funcional existente describe crear, listar, ver, actualizar, cerrar, reabrir y eliminar tickets, más asignación de técnicos, clasificación y calificación. También existen operaciones para rutas, equipos en taller, envíos de equipos y proyectos especiales. Las funciones se conservan; este proyecto no las reemplaza.

Las validaciones y utilidades incluyen rangos y secuencia de fechas, referencias activas, límites de paginación, permisos de sesión, saneamiento de celdas exportadas y filtros parametrizados en los servicios examinados. Las pruebas existentes usan dobles para llamadas ODBC y verifican varias regresiones del Renderer leyendo el código fuente. No se conectó ninguna base de datos durante la auditoría.

## Pruebas, calidad y configuración inicial

- TypeScript en modo estricto y script `typecheck`.
- Pruebas con `node:test`; cobertura nativa de Node, con umbrales de 75% líneas, 60% ramas y 55% funciones.
- Existe un workflow de GitHub Actions para Windows; no se puede verificar una ejecución remota desde esta copia.
- `.hintrc` existe; ESLint y Prettier se incorporaron durante la adaptación del pipeline.
- No se encontró configuración SonarCloud inicial.
- No hay README inicial.
- La carpeta `.git` existe pero está vacía; Git no está instalado como comando accesible en este entorno. No es posible confirmar rama, cambios previos, historial ni remotos.

## Cambios de arquitectura recomendados

No se recomienda migrar a React, Express ni cambiar de base de datos: eso exigiría una reescritura considerable y chocaría con el requisito de reutilizar el sistema. El ajuste adecuado es asegurar la aplicación Electron existente con pruebas compatibles, controles TypeScript, un pipeline para Windows y documentación que exponga claramente sus límites.

## Alcance de los cambios de esta entrega

Se amplió el workflow para distinguir BUILD, TEST, ANALYZE y REPORT y para ejecutar también en ramas distintas de `main`/`master`; se agregaron documentos técnicos/académicos, README y plantilla de pull request. Se actualizaron dependencias de desarrollo, Electron por una corrección de seguridad y el script de copia del Renderer. No se modificaron el modelo de datos, el código funcional ni `appsettings.json`.
