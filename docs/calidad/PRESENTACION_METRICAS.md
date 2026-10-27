# Presentación: Calidad de Software en el Sistema de Tickets

## Diapositiva 1. Portada

**Aseguramiento de Calidad y CI/CD**  
Sistema de Tickets de Soporte Técnico  
Curso: Calidad de Software

## Diapositiva 2. Problema y objetivo

- El sistema es una aplicación Electron con TypeScript, ODBC y MySQL.
- Antes del proyecto no existía un pipeline de integración continua ni una medición de cobertura.
- El objetivo fue incorporar controles de calidad sin conectar una base de datos real ni alterar funcionalidades productivas.

## Diapositiva 3. Estrategia aplicada

- Pruebas unitarias para validación, paginación, sesiones, permisos y exportaciones.
- Pruebas de integración controlada mediante dobles de conexión ODBC.
- Pruebas de regresión para filtros, reportes, notificaciones y compatibilidad ODBC 3.51.
- Análisis estático con TypeScript en modo estricto.
- Cobertura nativa de Node con umbrales mínimos.

## Diapositiva 4. Pipeline de GitHub Actions

1. GitHub recibe un `push` o un `pull request` a `main` o `master`.
2. El runner Windows configura Node 22 e instala con `npm ci`.
3. TypeScript revisa tipos con `npm run typecheck`.
4. El proyecto compila y ejecuta regresiones con `npm test`.
5. Node mide cobertura con `npm run test:coverage`.
6. GitHub conserva `coverage/coverage.txt` como artefacto.

## Diapositiva 5. Métricas antes y después

| Indicador | Antes | Después |
| --- | ---: | ---: |
| Pruebas declaradas | 25 | 28 |
| Pruebas aprobadas registradas | Sin medición | 28 de 28 |
| Cobertura de líneas | No medida | 95.62% |
| Cobertura de ramas | No medida | 80.60% |
| Cobertura de funciones | No medida | 90.54% |
| Errores TypeScript | No medido | 0 |
| Pipeline CI | No existía | GitHub Actions |

## Diapositiva 6. Defecto encontrado y corregido

**Hallazgo:** `2026-02-30` era aceptada porque JavaScript convierte fechas inválidas en fechas posteriores.  
**Riesgo:** registros con una fecha distinta de la ingresada por el usuario.  
**Corrección:** el servicio compara año, mes, día, hora, minuto y segundo luego de interpretar la fecha.  
**Evidencia:** nueva prueba de regresión aprobada dentro de las 28 pruebas.

## Diapositiva 7. Deuda técnica y límites

- La capa de base de datos aún concentra conexión, compatibilidad y migraciones.
- Las pruebas no usan una base MySQL/ODBC de prueba.
- Algunas regresiones validan expresiones del código fuente y conviene migrarlas a funciones aislables.
- El proyecto aún no tiene un linter instalado; TypeScript estricto funciona como análisis estático inicial.

## Diapositiva 8. Conclusiones y verificación

- El proyecto ahora bloquea integraciones con errores de tipos, pruebas fallidas o cobertura por debajo de los umbrales.
- La cobertura y los reportes se generan sin exponer credenciales ni conectarse a producción.
- Para verificar localmente: `npm ci`, `npm run typecheck`, `npm test`, `npm run test:coverage`.
- Para verificar en la nube: subir los cambios a GitHub y revisar el workflow **Quality Gate**.
