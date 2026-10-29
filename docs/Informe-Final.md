> **Actualización del 29/10/2026:** la revisión publicada pasó en GitHub Actions en `push` y `pull_request`; los artefactos actuales están archivados. La suite local volvió a aprobar. El PR permanece abierto sin revisión independiente; la presentación aún debe maquetarse y exportarse. La protección de `main` no está habilitada.

# Informe final del proyecto SQA

**Fecha de actualización:** 29 de octubre de 2026
**Repositorio:** `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad`

## Resumen ejecutivo

Se reutilizó la aplicación Electron existente y se añadieron controles de calidad continuos. La persistencia integrada usa SQLite con `node:sqlite`; la interfaz permanece en JavaScript/CSS y el proceso principal en TypeScript. GitHub Actions se configura para `push` y `pull_request`. El PR #1 y ambos runs remotos de la revisión SQLite actual pasaron.

## Resultados reproducidos

- Build: aprobado.
- Suite local actual: 33 aprobadas y 0 fallidas.
- Cobertura local actual: 96.16% de líneas, 81.55% de ramas y 92.31% de funciones.
- Umbrales: 75% de líneas, 60% de ramas y 55% de funciones.
- TypeScript: 0 errores.
- ESLint: sin errores bloqueantes.
- Prettier: todos los archivos seleccionados aprobados.
- GitHub Actions: los runs 40974922468 (`push`) y 40974928285 (`pull_request`) pasaron con 33 pruebas y cobertura 96.16% / 81.55% / 92.31%.

Las pruebas SQLite ejercitan el adaptador en memoria y la semilla. No se hizo una prueba manual de arranque de Electron ni hay pruebas E2E.

## Estado frente al enunciado

| Requisito                                                       | Estado                 | Evidencia o acción pendiente                                                                         |
| --------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Aplicación existente con operaciones de soporte/CRUD            | Cumplido               | Sistema Electron descrito en README y manuales                                                       |
| Pipeline con etapas de compilación, pruebas, análisis y reporte | Cumplido               | PR #1, runs 40974922468 (`push`) y 40974928285 (`pull_request`) aprobados                            |
| Pruebas unitarias y de regresión automatizadas                  | Cumplido parcialmente  | 33 casos; algunas regresiones inspeccionan código fuente                                             |
| Integración automatizada con base de datos                      | Cumplido parcialmente  | Cinco pruebas ejercitan SQLite en memoria y la semilla; falta validar el ciclo de inicio de Electron |
| Matriz de pruebas                                               | Cumplido               | `docs/Matriz-Pruebas.md`, con entrada, esperado y resultado observado                                |
| Cobertura y umbrales mínimos                                    | Cumplido               | 96.16% líneas, 81.55% ramas, 92.31% funciones; umbrales 75/60/55                                     |
| Análisis estático                                               | Cumplido parcialmente  | TypeScript y ESLint activos; SonarCloud no tiene resultado registrado                                |
| Revisión de código y deuda técnica                              | Parcial                | Revisión local y deuda documentadas; falta aprobación independiente en el PR                         |
| Plan SQA, línea base y reporte de mejora                        | Cumplido               | `docs/SQA-Plan.md`, `docs/Linea-Base-Calidad.md`, `docs/Reporte-Mejora.md`                           |
| Manuales técnicos y de usuario                                  | Cumplido               | `docs/Manual-Tecnico.md`, `docs/Manual-Usuario.md`                                                   |
| README con descripción, stack e instrucciones                   | Cumplido               | `README.md`; incluye badge de GitHub Actions                                                         |
| Protección de la rama principal                                 | No habilitada          | No es un entregable explícito de la alternativa; el PR no exige aprobación mediante reglas           |
| Revisión por otra persona                                       | Pendiente              | El PR está abierto, pero aún no tiene comentarios ni aprobación de un revisor independiente          |
| Presentación final exportada a PDF/PPTX                         | Pendiente              | El repositorio contiene guiones en Markdown; falta exportar el archivo final                         |
| Video de 4–5 minutos                                            | Complementario         | Hay guion disponible; grabarlo solo si la rúbrica del curso lo solicita                              |
| SonarCloud y dashboard de métricas                              | Opcional/no verificado | Requiere organización, clave de proyecto y secreto; no presentar datos no medidos                    |
| Despliegue en nube y Docker                                     | Opcional               | No implementados; no son necesarios para los controles básicos solicitados                           |

## Interpretación de métricas

El registro histórico indica 25 casos iniciales sin resultado aprobado/fallido conservado. La ejecución actual contiene 33 pruebas aprobadas. La cobertura inicial no fue medida, por lo que no se afirma una mejora porcentual respecto a una base cuantificada. La cobertura actual es 96.16% / 81.55% / 92.31%, verificada localmente y en ambos runs de GitHub Actions del PR #1. No se cuantifican bugs, vulnerabilidades ni code smells sin un análisis SonarCloud registrado.

## Pendientes para la entrega académica

1. Obtener una revisión independiente del PR #1 y conservar el comentario o aprobación como evidencia.
2. Maquetar la presentación con métricas y capturas reales y exportarla a PDF/PPTX.
3. Si la rúbrica del curso solicita el video, grabar la demostración de 4–5 minutos.
4. Si se requiere dashboard SonarCloud, configurar sus valores en GitHub y registrar el resultado real.
