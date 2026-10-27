# Informe final de auditoría y adaptación SQA

**Fecha:** 26 de octubre de 2026  
**Copia inspeccionada:** `C:\Users\IT\Desktop\COPIA_TICKETS_CALIDAD\SoporteTecnico-main`

## Resumen

Se reutilizó el sistema de tickets Electron existente; no se migró a React/Express ni se cambió la base de datos. Se añadieron documentación académica y técnica, README, plantilla de pull request y una configuración CI/CD con las etapas BUILD, TEST, ANALYZE y REPORT. No se modificó la lógica funcional de la aplicación.

## Verificación local

- `npm test`: 28 aprobadas, 0 fallidas; incluye compilación y generación del CSS.
- `npm run test:coverage`: 95.65% líneas, 80.60% ramas y 90.54% funciones; umbrales satisfechos.
- `npm run typecheck`: código de salida 0, sin errores.
- Node.js 22.16.0. No se ejecutó `npm ci`; se actualizaron dependencias de desarrollo y package-lock.json en la instalación existente.
- `npm run lint` y `npm run format:check`: aprobados.
- `npm audit`: 0 vulnerabilidades reportadas tras fijar Electron 45.0.0 y corregir dependencias transitivas.
- No se conectó ODBC/MySQL ni se inició la interfaz. La descarga del binario Electron 45 no concluyó en este entorno; la carga de ODBC bajo Electron queda pendiente.

## Requisitos y estado

| Requisito                                | Estado                                                         | Evidencia o pendiente                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reutilizar aplicación existente          | Implementado y verificado                                      | Electron existente; sin reescritura arquitectónica                                                                                                             |
| Diagnóstico inicial                      | Implementado y verificado                                      | `docs/Diagnostico-Inicial.md`                                                                                                                                  |
| Operaciones CRUD y funciones conservadas | Implementado y verificado por inspección                       | Tickets, rutas, equipos, envíos y proyectos descritos en el mapa funcional                                                                                     |
| Persistencia y protección de datos       | Documentado; integración real pendiente                        | MySQL/ODBC, DSN externo; no se usó DB productiva ni de pruebas                                                                                                 |
| Plan SQA                                 | Implementado y verificado                                      | `docs/SQA-Plan.md`                                                                                                                                             |
| Línea base                               | Implementada y verificada                                      | 28/28 pruebas; 95.65/80.60/90.54% cobertura; 0 errores TypeScript                                                                                              |
| Pruebas unitarias/regresión              | Implementadas y verificadas                                    | 28 pruebas existentes, todas aprobadas                                                                                                                         |
| Pruebas de integración con dobles        | Implementadas y verificadas                                    | No sustituye integración con una DB MySQL de pruebas                                                                                                           |
| Cobertura mínima 60% líneas              | Implementada y verificada                                      | Gate 75% líneas, 60% ramas, 55% funciones; medida 95.65%/80.60%/90.54%                                                                                         |
| ESLint / Prettier                        | Implementados y verificados                                    | ESLint y Prettier configurados; `npm run lint` y `npm run format:check` aprobados                                                                              |
| Workflow CI/CD                           | Implementado; pendiente verificación remota                    | `.github/workflows/quality.yml`; no hubo ejecución en GitHub                                                                                                   |
| SonarCloud                               | Pendiente de configuración externa                             | Faltan organización, project key y secreto `SONAR_TOKEN`                                                                                                       |
| GitHub, PR y protección de rama          | Documentación implementada; pendiente de configuración externa | `.git` vacío, Git no disponible y no hubo acceso a configuración remota                                                                                        |
| Manual técnico y de usuario              | Implementados y verificados                                    | `docs/Manual-Tecnico.md`, `docs/Manual-Usuario.md`                                                                                                             |
| Reporte de mejora                        | Implementado y verificado                                      | `docs/Reporte-Mejora.md`; valores no disponibles no se inventaron                                                                                              |
| README profesional                       | Implementado y verificado                                      | `README.md`; sin badges de servicios no verificados                                                                                                            |
| Presentación 8–10 diapositivas           | Esquema de 10 diapositivas implementado                        | `docs/presentacion/Presentacion-Proyecto-SQA.md`; PPTX/PDF no generados: falta runtime `@oai/artifact-tool`                                                    |
| Guion de video                           | Implementado y verificado                                      | `docs/video/Guion-Video-4-5-Minutos.md`; el video no está grabado                                                                                              |
| Docker                                   | No implementado, opcional                                      | La conexión Windows ODBC/DSN externa no se ha aislado con una configuración segura y reproducible                                                              |
| Revisión de secretos                     | Revisión heurística implementada y verificada                  | 0 coincidencias de asignaciones inline en fuentes, pruebas, scripts, SQL, workflow y documentos; `appsettings.json` ignorado; no equivale a auditoría completa |
| Estado de Git                            | No disponible                                                  | `.git` vacío y ejecutable no disponible; no se publicaron cambios                                                                                              |

## Acciones personales para cerrar el proyecto

1. Abrir esta copia en una instalación Git funcional y revisar los cambios antes de inicializar o asociar un repositorio.
2. Crear o seleccionar repositorio GitHub autorizado; subir los cambios solo cuando se decida publicarlos.
3. Ejecutar el workflow y guardar capturas auténticas; exigir el status check y revisión en reglas de la rama principal.
4. Configurar SonarCloud, ESLint y credenciales como variables/secreto del repositorio si la rúbrica lo exige.
5. Preparar la instancia MySQL de pruebas y un DSN aislado si se requiere integración real.
6. Exportar el esquema de presentación a PPTX/PDF en una estación con el runtime de presentaciones disponible y grabar el video de 4–5 minutos.
