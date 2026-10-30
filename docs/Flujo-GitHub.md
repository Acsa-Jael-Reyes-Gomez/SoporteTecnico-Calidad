# Flujo de trabajo en GitHub

## Cambios y pull requests

1. Crea una rama corta desde `main`, por ejemplo `fix/validacion-fecha` o `docs/matriz-pruebas`.
2. Mantén el cambio enfocado y añade pruebas cuando modifiques reglas del sistema.
3. Abre un pull request hacia `main` y completa `.github/PULL_REQUEST_TEMPLATE.md` en español.
4. Revisa diferencias, datos sensibles, configuración de base de datos y los checks de **Puerta de calidad**.
5. Fusiona después de la revisión humana y cuando los checks requeridos estén aprobados.

## Etapas de Puerta de calidad

En **Actions**, abre la ejecución asociada al pull request o al commit. El workflow presenta las etapas **CONSTRUIR**, **PROBAR**, **ANALIZAR** y **REPORTAR**. Los informes conservan pruebas, cobertura y verificaciones de código. SonarCloud realiza un análisis adicional y GitHub registra el estado del Quality Gate.

## Protección de `main`

La rama `main` está protegida con una regla que exige pull request, revisión aprobada, resolución de conversaciones y éxito del check `Compilar, probar y verificar calidad`. El workflow verde por sí solo no sustituye esta protección: debe comprobarse el ruleset desde GitHub.

## Acceso del docente

El repositorio `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad` puede ser privado. Si se mantiene privado, invita al docente desde **Settings → Collaborators** con la cuenta que indique el curso. No publiques la aplicación ni datos de conexión reales para facilitar la revisión.
