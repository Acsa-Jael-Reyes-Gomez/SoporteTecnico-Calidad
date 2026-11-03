# Informe final de correcciones y verificación SQA

**Estudiante:** Acsa Jael Reyes Gómez. **Universidad:** Mariano Gálvez de Guatemala. **Fecha:** 3 de noviembre de 2026.

## Alcance y estado de integración

Se conserva el Sistema de Soporte Técnico existente en Electron, Renderer JavaScript/CSS, Preload/Main TypeScript y SQLite. Las correcciones se publican únicamente en la rama del [PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8). No se modificó main directamente, no se reescribió el historial y no se fusionó el PR.

## Errores encontrados y correcciones

- Cobertura inflada por incluir código de tests: el gate ahora incluye src/** y conserva la exclusión Renderer previa, con los mismos mínimos 75/60/55.
- Tres comentarios CSS sin cierre: corregidos y bundle regenerado; se conserva la apariencia efectiva.
- Regex susceptibles de retroceso excesivo: simplificadas en SQL y recorte de nombres. Eliminado un reemplazo DATEDIFF que no cambiaba el significado.
- Promesas de cargas sin manejador explícito: catch con mensaje al usuario en calificación, proyectos y dashboard; no se convierten errores en éxitos.
- Condición duplicada, ternario redundante y propiedad CSS duplicada: simplificados conservando sus resultados efectivos.
- Alertas sobre variables compartidas: orden de carga y declaraciones demostrados; no se agregaron declaraciones que sombreen el estado. JSDoc aclara la unión numérica/string y el valor opcional del select.
- Documentación contradictoria y manual de rutas: versión vigente sincronizada, cierre automático al validar y antecedentes separados.

El tratamiento de cada uno de los **36 hallazgos iniciales** está en [HALLAZGOS_SONAR.csv](calidad/HALLAZGOS_SONAR.csv), con justificaciones en [HALLAZGOS_SONAR.md](calidad/HALLAZGOS_SONAR.md).

## Pruebas y resultados

| Comprobación                   | Resultado verificado                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Compilación                    | Aprobada                                                                       |
| node:test                      | 146/146; cero fallidas, canceladas, omitidas y todo                            |
| Casos originales               | 140 conservados y trazados; seis regresiones añadidas                          |
| E2E Electron/SQLite            | Aprobado: inicio, Preload/IPC, login, Tickets, alta persistida                 |
| Gate c8 corregido              | 83,30 % líneas; 70,41 % ramas; 94,66 % funciones                               |
| Umbrales                       | 75 % / 60 % / 55 %, sin reducción                                              |
| TypeScript / ESLint / Prettier | Aprobados                                                                      |
| SonarQube PR técnico           | PASSED; 86,5 % cobertura nueva, 0,0 % duplicación nueva; cero hallazgos nuevos |

Fuentes: [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247), [PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y logs/API en [evidencia final](calidad/evidencias/cierre-final-20261103/). Los checks del último commit documental deben verificarse además en el PR.

La cobertura c8 mide código de aplicación cargado, con el Renderer excluido en ese comando, no toda la aplicación. El LCOV de SonarQube conserva un alcance distinto. Las capturas originales de 140 casos, 88,90 % c8 y 80,1 % Sonar nuevo se conservan como **antecedentes**, junto con 30,2 % Sonar global del main anterior. La línea base inicial de 25 casos no conserva cobertura comparable; no se inventa ni se calcula mejora porcentual desde ella.

## Hallazgos abiertos y por qué

Web:S7039 permanece como riesgo documentado: style-src permite estilos inline usados por la interfaz dinámica, mientras script-src sigue restringido a self. Retirarlos requiere migración de estilos y regresión visual completa; no se debilita la CSP ni se desactiva la regla. Los avisos S2703 de estado compartido y S3403 de tipos se justifican con código y pruebas; no se tratan como fallos funcionales sin contexto.

Main aún conserva sus 36 hallazgos iniciales hasta integrar y reanalizar; no se afirma cierre remoto en una rama que no se ha modificado. La puerta de código nuevo del PR sí aprobó sin issues nuevos. La ampliación de cobertura global y de recorridos E2E sigue siendo deuda priorizable, distinta de los controles obligatorios que pasaron.

GitHub emite una advertencia no bloqueante sobre el runtime Node 20 de algunas acciones externas, ejecutadas mediante compatibilidad con Node 24. Esto no cambia Node.js 22 configurado para la aplicación; las verificaciones completaron correctamente. Se conserva el workflow funcional solicitado.

## Archivos modificados y entregables

- Código: adaptador SQLite, saneamiento de exportación, reporte Excel, módulos Renderer de cargas, contratos compartidos y CSS fuente/bundle.
- Configuración: alcance del comando c8, sin reducir umbrales ni cambiar la condición Sonar funcional de 6ccb7cc.
- Pruebas: sqa-closeout.test.js, seis regresiones; todas las pruebas previas conservadas.
- Documentación: README, plan SQA, matriz, línea base, reporte, manuales, mapa, métricas, flujo GitHub, revisión y estado de requisitos.
- Trazabilidad: [inventario final](calidad/INVENTARIO_FINAL_CASOS.csv), fuente/línea, preparación y aserciones; [inventario histórico de 140](calidad/INVENTARIO_140_CASOS.csv) conservado.
- Presentación: [PowerPoint](presentacion/final/Presentacion_SQA_Final.pptx), [PDF de diez diapositivas](presentacion/final/Presentacion_SQA_Final.pdf), [guion](presentacion/final/Guion_Exposicion_Final.pdf) y [anexo](presentacion/final/Anexo_Evidencias_Final.pdf), basados en los archivos originales de la estudiante.
- Video: [guion y secuencia](video/Guion-Video-4-5-Minutos.md); no existe entrega MP4 declarada.

## Cumplimiento y acciones manuales

La [matriz de requisitos](calidad/ESTADO-REQUISITOS.md) distingue verificado, limitación histórica y pendiente humano. Repositorio público y protección de main comprobados por API: PR, una aprobación, checks actualizados y conversaciones resueltas, incluso administradores. PR #7 registra dos eventos de aprobación de la misma cuenta Acsa-Reyes; PR #8 necesita su propia revisión.

Pendientes: aprobación independiente del PR #8; autorización y fusión manual; comprobar el pipeline posterior en main; entregar enlaces y archivos en la plataforma académica; grabar y verificar MP4 de 4–5 minutos y al menos 720p **al final**. No se declara el proyecto al 100 % mientras falten estas acciones.

## Antecedente de julio de 2026 incorporado al cierre

Según el [historial documental aportado](calidad/antecedentes/Historial_Verificado_SoporteTecnico_PreSQA.md), la copia original contiene **25 casos definidos**: 22 en `tests/core-services.test.js` y 3 en `tests/envio-history.test.js`. No se conservan resultados de ejecución que acrediten aprobaciones o fallos ni un reporte inicial de cobertura. No se asigna 0 % ni se calcula una mejora porcentual entre coberturas incompatibles.

La copia utiliza Electron, JavaScript y TypeScript, con MySQL mediante ODBC. En el material examinado no aparecen configuraciones de GitHub Actions o SonarQube; esta ausencia se limita a esa copia. El informe aportado analiza archivos seleccionados y no acredita una ejecución del sistema antiguo. La arquitectura actual Electron y SQLite se conserva.

El resultado vigente sigue siendo **146 aprobadas, 0 fallidas**, c8 corregido **83,30 % líneas / 70,41 % ramas / 94,66 % funciones**. SonarQube del PR: **Quality Gate aprobado**, **86,5 % cobertura del código nuevo** y **0 % duplicación nueva**. Son mediciones con alcances distintos. Los resultados de 28, 33 y 140 casos y sus capturas se conservan como antecedentes. Video pendiente y PR #8 sin fusionar.
