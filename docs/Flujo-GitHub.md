# Flujo de trabajo en GitHub

## Cambios y pull requests

1. Crea una rama corta desde `main`, por ejemplo `fix/validacion-fecha` o `docs/matriz-pruebas`.
2. Mantén el cambio enfocado y añade pruebas cuando modifiques reglas del sistema.
3. Abre un pull request hacia `main` y completa `.github/PULL_REQUEST_TEMPLATE.md` en español.
4. Revisa diferencias, datos sensibles, configuración de base de datos y los checks de **Puerta de calidad**.
5. Fusiona después de la revisión humana y cuando los checks requeridos estén aprobados.

## Etapas de Puerta de calidad

En **Actions**, abre la ejecución asociada al pull request o al commit. El workflow presenta las etapas **CONSTRUIR**, **PROBAR**, **ANALIZAR** y **REPORTAR**. El artefacto `quality-reports` conserva la salida de pruebas y cobertura. El análisis estático usa TypeScript estricto, ESLint y Prettier; SonarQube Cloud está integrado y registró Quality Gate PASSED en el PR #7. El workflow de cierre también espera el estado de SonarQube y debe fallar si falla la puerta.

## Protección de `main`

La API de GitHub confirmó el 03/11/2026 que `main` exige PR, una aprobación, checks actualizados y el check `Compilar, probar y verificar calidad`; aplica a administradores y exige resolver conversaciones. No permite force-push ni eliminación. La respuesta está archivada en `docs/calidad/evidencias/cierre-20261103/proteccion-main.json`. El PR #8 sin aprobación devuelve `mergeable_state: blocked`; se conserva la regla sin omitirla. Una persona no puede aprobar su propio PR.

**Estado actual:** el repositorio está público, el PR #7 fue revisado y fusionado con dos eventos de aprobación de la misma cuenta revisora y tres checks exitosos. El bloqueo del 29 de octubre correspondía a una configuración anterior y ya no describe el estado actual.

La ejecución verde del workflow no demuestra por sí sola la protección. La regla y el bloqueo del PR #8 se verificaron por API; la respuesta se conserva como evidencia.

## Acceso del docente

El repositorio `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad` es público. El docente puede consultar los archivos publicados, pero se debe entregar el enlace correcto y verificar que los documentos de la rama de cierre se fusionen a `main`. No publiques la aplicación ni datos de conexión reales para facilitar la revisión.
