# Decisiones técnicas

## Actualización de Electron para corregir el aviso de seguridad

### Problema observado

El análisis inicial de npm marcó Electron `40.10.5` como vulnerable de severidad alta. La corrección no estaba disponible dentro de la versión mayor declarada. Electron 40 ya está fuera de las tres líneas estables soportadas; al 26 de octubre de 2026, la versión estable más reciente es Electron 45.0.0. Véanse las [líneas de soporte de Electron](https://www.electronjs.org/docs/latest/tutorial/electron-timelines), [versiones estables](https://releases.electronjs.org/) y el [aviso de seguridad de Electron](https://github.com/advisories/GHSA-jr5w-w6x2-84p9).

### Alternativas

1. Mantener Electron 40: conserva la combinación existente, pero deja un aviso alto sin corregir y una versión fuera de soporte.
2. Actualizar a Electron 42.11.x: corrige el aviso, pero esa línea llegó al fin de soporte el 20 de octubre de 2026.
3. Actualizar a Electron 45.0.0: permanece dentro de la arquitectura Electron, elimina el aviso y usa una línea soportada.

### Decisión

Se adopta Electron 45.0.0, fijado de forma exacta para que las siguientes instalaciones usen el mismo runtime. Desde Electron 42, el binario de Electron se descarga dinámicamente al primer inicio; `npm start` lo solicita mediante el paquete instalado. La ventana principal ya fija `contextIsolation`, `nodeIntegration: false`, `sandbox` y `webSecurity`. El driver `odbc` declara un módulo nativo N-API 8, compatible con el mecanismo estable de ABI de Node; de todos modos, la compatibilidad debe comprobarse cargando el módulo desde el runtime Electron, sin abrir una conexión ODBC.

### Validación necesaria

Después de la actualización se ejecutaron build, pruebas, cobertura, typecheck, lint y formato. La validación inicial de 28/28 es histórica; tras la migración SQLite, la ejecución local del 29/10/2026 pasó 33/33, con 96.16% de líneas, 81.55% de ramas y 92.31% de funciones. La descarga del binario para la prueba manual quedó pendiente; falta comprobar el arranque de Electron con la base de trabajo.

## Decision: base de datos integrada para desarrollo y distribucion

La aplicacion reutilizada no era React/Express ni estaba aislada de su DSN MySQL/ODBC inicial. Para que la entrega incluya una base local sin depender de servicios instalados por el usuario, el runtime se adapto a SQLite mediante `node:sqlite`, una semilla incluida en `assets/database/seed.db` y una copia de trabajo bajo `userData`. La importacion conserva los datos del volcado recibido, pero los procedimientos almacenados no se migraron. Esta variante no ofrece sincronizacion entre computadoras; esa necesidad requiere un servicio centralizado y queda fuera del alcance actual.

Se agregaron cinco pruebas de integración del adaptador y de la semilla. La suite completa pasó 33/33; los umbrales se superaron y TypeScript reportó cero diagnósticos. El PR #1 y los runs remotos 40969600668 (`push`) y 40969607082 (`pull_request`) pasaron. Falta validar manualmente el arranque de Electron.
