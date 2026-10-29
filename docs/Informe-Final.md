> **Actualización del 29/10/2026:** la ejecución local actual de la suite y las métricas ya está reproducida tras la integración de SQLite. Sigue pendiente publicar estos cambios y obtener un run remoto de esta revisión, comprobar la protección de `main`, exportar la presentación a PDF e incorporar el video MP4.

# Informe final del proyecto SQA

**Fecha de actualización:** 29 de octubre de 2026
**Repositorio:** `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad`

## Resumen ejecutivo

Se reutilizó la aplicación Electron existente y se añadieron controles de calidad continuos. La persistencia integrada usa SQLite con `node:sqlite`; la interfaz permanece en JavaScript/CSS y el proceso principal en TypeScript. GitHub Actions se configura para `push` y `pull_request`. El run remoto 40599606066 terminó en verde, pero es anterior a los cambios locales de SQLite.

## Resultados reproducidos

- Build: aprobado.
- Suite local actual: 33 aprobadas y 0 fallidas.
- Cobertura local actual: 96.16% de líneas, 81.55% de ramas y 92.31% de funciones.
- Umbrales: 75% de líneas, 60% de ramas y 55% de funciones.
- TypeScript: 0 errores.
- ESLint: sin errores bloqueantes.
- Prettier: todos los archivos seleccionados aprobados.
- Ejecución remota 40599606066: verde; 28/28 pruebas y cobertura 95.65% / 80.60% / 90.54% en la revisión publicada anterior a SQLite.

Las pruebas SQLite ejercitan el adaptador en memoria y la semilla. No se hizo una prueba manual de arranque de Electron ni hay pruebas E2E.

## Estado frente al enunciado

| Requisito                                                       | Estado                     | Evidencia o acción pendiente                                                                         |
| --------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Aplicación existente con operaciones de soporte/CRUD            | Cumplido                   | Sistema Electron descrito en README y manuales                                                       |
| Pipeline con etapas de compilación, pruebas, análisis y reporte | Cumplido                   | `.github/workflows/quality.yml`; ejecución verde informada por el propietario                        |
| Pruebas unitarias y de regresión automatizadas                  | Cumplido parcialmente      | 28 casos; algunas regresiones inspeccionan código fuente                                             |
| Integración automatizada con base de datos                      | Cumplido parcialmente      | Cinco pruebas ejercitan SQLite en memoria y la semilla; falta validar el ciclo de inicio de Electron |
| Matriz de pruebas                                               | Cumplido                   | `docs/Matriz-Pruebas.md`, con entrada, esperado y resultado observado                                |
| Cobertura y umbrales mínimos                                    | Cumplido                   | 96.16% líneas, 81.55% ramas, 92.31% funciones; umbrales 75/60/55                                     |
| Análisis estático                                               | Cumplido parcialmente      | TypeScript y ESLint activos; SonarCloud no tiene resultado registrado                                |
| Plan SQA, línea base y reporte de mejora                        | Cumplido                   | `docs/SQA-Plan.md`, `docs/Linea-Base-Calidad.md`, `docs/Reporte-Mejora.md`                           |
| Manuales técnicos y de usuario                                  | Cumplido                   | `docs/Manual-Tecnico.md`, `docs/Manual-Usuario.md`                                                   |
| README con descripción, stack e instrucciones                   | Cumplido                   | `README.md`; incluye badge de GitHub Actions                                                         |
| Protección de la rama principal                                 | Pendiente de verificación  | Exigir PR y el job `Compilar, probar y verificar calidad`; guardar evidencia                         |
| Revisión del docente                                            | Pendiente de configuración | Invitar al docente si el repositorio permanece privado                                               |
| Presentación final exportada a PDF/PPTX                         | Pendiente                  | El repositorio contiene guiones en Markdown; falta exportar el archivo final                         |
| Video de 4–5 minutos                                            | Pendiente                  | El repositorio contiene el guion; falta grabar la demostración real y la narración                   |
| SonarCloud y dashboard de métricas                              | Opcional/no verificado     | Requiere organización, clave de proyecto y secreto; no presentar datos no medidos                    |
| Despliegue en nube y Docker                                     | Opcional                   | No implementados; no son necesarios para los controles básicos solicitados                           |

## Interpretación de métricas

El registro histórico indica 25 casos iniciales sin resultado aprobado/fallido conservado. La ejecución actual contiene 33 pruebas aprobadas. La cobertura inicial no fue medida, por lo que no se afirma una mejora porcentual respecto a una base cuantificada. La cobertura local actual es 96.16% / 81.55% / 92.31%. El run remoto 40599606066 sigue siendo evidencia de la revisión anterior, no de los cambios locales SQLite. No se cuantifican bugs, vulnerabilidades ni code smells sin un análisis SonarCloud registrado.

## Pendientes para la entrega académica

1. Confirmar en GitHub la regla de protección de `main` y guardar evidencia.
2. Dar acceso al docente al repositorio privado o confirmar que el enlace público es aceptable.
3. Exportar la presentación de 8–10 diapositivas a PDF.
4. Grabar el video de 4–5 minutos con una ejecución real del flujo de pull request y Actions.
5. Si se requiere dashboard SonarCloud, configurar sus valores en GitHub y registrar el resultado real.
