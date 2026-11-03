# Revisión de los 36 hallazgos de SonarQube

**Corte inicial:** main, 3 de noviembre de 2026; 20 bugs, 15 code smells y 1 vulnerabilidad. Clasificación clásica: 25 MAJOR y 11 BLOCKER. El [CSV individual](HALLAZGOS_SONAR.csv) conserva cada clave, regla, archivo y disposición, sin borrar el historial.

## Tratamiento por regla

| Regla | Casos iniciales | Disposición y evidencia |
| --- | ---: | --- |
| typescript:S8786 | 4 | Corregido localmente. SQL: reconocimiento de argumentos sin retroceso superlineal; eliminado reemplazo DATEDIFF identidad. Exportaciones: recorte lineal. Regresión SQL/nombres largos en sqa-closeout.test.js. |
| typescript:S3923 | 1 | Corregido localmente. Simplificado stickyRowsCount conservando 5/3/2 según layout; suite de exportación preservada. |
| Web:S7039 | 1 | Abierto, riesgo documentado. unsafe-inline está limitado a style-src; script-src sigue self. La UI usa atributos style y style.cssText dinámicos. Retirarlo sin migración rompería diseño y dimensionado. No se cambia la CSP ni se desactiva la regla; requiere plan de migración de estilos y regresión visual completa. |
| javascript:S2703 | 11 | Posible falso positivo, contexto demostrado. session/catalogos/proyectosScriptPromise se declaran con let en compartido.js, cargado primero por cargador-renderer.js. Se declara el contexto global writable en comentarios, sin agregar variables ni cambiar el estado. La regresión VM demuestra compartición léxica y ausencia de propiedades globales implícitas. No se desactiva S2703. |
| javascript:S9383 | 14 | Corregido localmente. Cargas en segundo plano reciben catch explícito con mensaje al usuario, además del control interno existente. Regresiones de proyectos, calificación y dashboard ejercitan rechazo/recuperación. |
| javascript:S3403 | 2 | Posible falso positivo, tipado aclarado. getPagerItems devuelve números y el string ...; currentValue puede ser undefined según el contrato opcional. Se aclara JSDoc sin cambiar comparaciones estrictas. Regresión verifica los dos tipos del paginador. |
| javascript:S1764 | 1 | Corregido localmente. Eliminada condición idéntica repetida sobre documento; conserva la misma decisión funcional. |
| css:S4656 | 2 | Corregido localmente. Eliminada primera declaración box-shadow anulada por la siguiente en el mismo selector. Regenerado app.bundle.css; no se edita solo el generado. |

## Riesgo de estilos inline y alcance de la seguridad

`index.html` mantiene `script-src 'self'` y no permite scripts inline. `style-src 'self' 'unsafe-inline'` permite el diseño dinámico existente (posición de menús, tamaños de columnas, modales, barras de carga y atributos style de componentes). No se transforma la aplicación ni se retira este permiso sin pruebas visuales completas. El hallazgo Web:S7039 permanece abierto, con riesgo explícito: una eventual inyección de HTML/CSS podría alterar la presentación. Esto no acredita ejecución de JavaScript ni permite afirmar seguridad total. Una migración futura a clases y hojas de estilo controladas debe evaluarse aparte. No se desactiva el análisis ni se marca automáticamente la vulnerabilidad como resuelta.

## BLOCKER y comparaciones: revisión del contexto

Los comentarios `global ...: writable` describen bindings ya existentes; no crean variables, no sombrean declaraciones y no desactivan reglas. El cargador garantiza que `compartido.js` precede a autenticación y módulos de ruta. Los 11 avisos no demuestran once fallos de ejecución. La revisión por API de SonarQube después de publicar determinará cuáles permanecen reportados; no se afirma cierre remoto antes de ese análisis.

## Cobertura y regresiones del cambio

Se conservan los umbrales 75 % líneas, 60 % ramas y 55 % funciones. `test:coverage` limita el numerador y denominador a `src/**` y conserva la exclusión Renderer preexistente; mide los archivos de aplicación cargados por la suite, no todo el repositorio. `test:coverage:sonar` sigue generando LCOV para el análisis global de SonarQube sin bajar su puerta de código nuevo.

Las 140 pruebas previas se conservan; `tests/sqa-closeout.test.js` agrega seis casos de comportamiento sobre SQL, exportación, paginación, estado léxico compartido y recuperación de cargas. Suite local: **146/146**, cero omitidas. Cobertura local corregida: **83,30 % líneas, 70,41 % ramas, 94,66 % funciones**; E2E, TypeScript, ESLint y Prettier aprobaron. El resultado remoto se incorporará después del reanálisis.
