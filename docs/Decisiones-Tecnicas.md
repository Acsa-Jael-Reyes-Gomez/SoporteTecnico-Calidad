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

Después de la actualización se ejecutaron build, pruebas (28/28), cobertura (95.65% líneas, 80.60% ramas, 90.54% funciones), typecheck, lint y formato. La descarga del binario para la prueba manual quedó pendiente porque la red no completó la solicitud; tampoco se comprobó la carga de ODBC en runtime. No se inició sesión ni se contactó una base de datos. La revisión manual de la aplicación con su DSN y la validación de instalaciones en sucursales permanecen pendientes.
