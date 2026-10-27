# Plan de aseguramiento de la calidad

## Objetivo

Evitar regresiones en el sistema de tickets y detectar errores antes de integrar cambios. El alcance cubre la compilación, servicios TypeScript aislables, reglas de negocio y regresiones de interfaz verificables sin iniciar Electron ni conectarse a MySQL.

## Alcance y estrategia

| Actividad | Implementación | Criterio de aceptación |
| --- | --- | --- |
| Análisis estático | `npm run typecheck` con TypeScript en modo estricto | Sin errores de tipos |
| Pruebas unitarias | `node:test` para validación, paginación, permisos, sesiones y seguridad Excel | Todas las pruebas aprueban |
| Integración controlada | Dobles de `DbConnection` para consultas y referencias activas | Sin ODBC ni base de datos real |
| Regresión | Verificaciones de filtros, reportes, notificaciones y compatibilidad ODBC | Todas las reglas existentes se mantienen |
| Cobertura | Cobertura nativa de Node | Líneas >= 75%, ramas >= 60%, funciones >= 55% |
| Integración continua | GitHub Actions en Windows con Node 22 | Todas las etapas del workflow aprueban |

## Riesgos y límites

- La aplicación depende de Electron, Windows y ODBC. El pipeline no abre Electron ni conecta una base de datos.
- Las pruebas de consultas usan dobles; no sustituyen una prueba de aceptación contra una base de datos de prueba.
- La cobertura corresponde a módulos cargados durante las pruebas, principalmente servicios compilados en `dist`. No representa la interfaz completa.
- El proyecto dispone de `.hintrc`, pero `hint` no está instalado. El análisis estático actual usa TypeScript estricto y no incorpora un linter nuevo.

## Criterio de aprobación de un cambio

Un cambio es aceptable cuando el workflow instala con `npm ci`, el chequeo TypeScript no informa errores, las pruebas aprueban y la cobertura cumple los umbrales configurados.
