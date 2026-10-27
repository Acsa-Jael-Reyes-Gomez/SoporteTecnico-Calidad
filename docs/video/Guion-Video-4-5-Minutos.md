# Guion de video (4–5 minutos)

**Duración estimada:** 4:30. Este documento es un guion; el video no está grabado.

| Tiempo    | Pantalla / acción                                                     | Narración sugerida                                                                                                                                                                                                                                                     |
| --------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:25 | Portada del proyecto y nombre de la aplicación                        | “Este proyecto integra controles de calidad y CI/CD a una copia existente del sistema de soporte técnico. El objetivo es reutilizar sus funciones y verificar los cambios de forma repetible.”                                                                         |
| 0:25–1:00 | Mostrar mapa de módulos: tickets, rutas, equipos, reportes            | “La aplicación base es de escritorio. Conserva tickets, asignación, rutas, equipos en taller, envíos, proyectos especiales y reportes.”                                                                                                                                |
| 1:00–1:35 | Diagrama Renderer → Preload → Main/IPC → MySQL/ODBC                   | “La interfaz usa JavaScript y CSS. Preload ofrece un puente limitado; Main está desarrollado en TypeScript y ejecuta reglas y consultas MySQL mediante ODBC. No es una arquitectura React/Express.”                                                                    |
| 1:35–2:05 | Mostrar ramas y plantilla de pull request                             | “Los cambios se preparan en ramas y se proponen mediante pull request. El equipo debe revisar el código y exigir el check de calidad antes de fusionar. La protección de rama requiere activación en GitHub.”                                                          |
| 2:05–2:55 | Abrir workflow quality.yml y recorrer BUILD, TEST, ANALYZE, REPORT    | “BUILD instala dependencias y compila. TEST corre node:test y cobertura nativa. ANALYZE verifica los tipos TypeScript y SonarCloud solo si el repositorio tiene credenciales y proyecto configurados. REPORT conserva la salida como artefacto.”                       |
| 2:55–3:25 | Explicar quality gates y umbrales                                     | “El gate local exige pruebas y compilación correctas, TypeScript sin errores y umbrales de cobertura: 75 por ciento líneas, 60 ramas y 55 funciones. SonarCloud aún no es un gate activo.”                                                                             |
| 3:25–3:55 | Mostrar artefacto de cobertura o, si falta, indicar dónde se descarga | “El artefacto quality-reports guarda los resultados de pruebas y cobertura. La ejecución debe ser real y asociada a un commit; no se reemplaza por una captura simulada.”                                                                                              |
| 3:55–4:20 | Presentar tabla de línea base y reporte final                         | “La copia contiene dos archivos de prueba y 28 casos declarados. Durante esta auditoría, Node no pudo cargar los archivos por un error de permisos, así que no afirmo un porcentaje final. Las cifras históricas están separadas y no se presentan como reproducidas.” |
| 4:20–4:30 | Conclusión                                                            | “El sistema existente se conserva y queda documentado. Para cerrar la evaluación faltan las mediciones en un entorno funcional y la ejecución remota del pipeline.”                                                                                                    |

## Lista de acciones antes de grabar

- [ ] Ejecutar `npm ci`, `npm run typecheck`, `npm test` y `npm run test:coverage` en Windows con permisos correctos.
- [ ] Enviar la copia a un repositorio GitHub autorizado y ejecutar el workflow.
- [ ] Capturar únicamente una ejecución real y el artefacto generado, ocultando nombres/secretos sensibles.
- [ ] Configurar SonarCloud solo si hay organización y proyecto; mostrar el dashboard real.
- [ ] Sustituir las frases de métricas pendientes por valores medidos y mantener las limitaciones.
- [ ] Grabar la narración y comprobar la duración entre 4 y 5 minutos.
