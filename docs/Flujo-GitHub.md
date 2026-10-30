# Flujo de trabajo en GitHub

## Cambios y pull requests

1. Crea una rama corta desde `main`, por ejemplo `fix/validacion-fecha` o `docs/matriz-pruebas`.
2. Mantén el cambio enfocado y añade pruebas cuando modifiques reglas del sistema.
3. Abre un pull request hacia `main` y completa `.github/PULL_REQUEST_TEMPLATE.md` en español.
4. Revisa diferencias, datos sensibles, configuración de base de datos y los checks de **Puerta de calidad**.
5. Fusiona después de la revisión humana y cuando los checks requeridos estén aprobados.

## Etapas de Puerta de calidad

En **Actions**, abre la ejecución asociada al pull request o al commit. El workflow presenta las etapas **CONSTRUIR**, **PROBAR**, **ANALIZAR** y **REPORTAR**. El artefacto `quality-reports` conserva la salida de pruebas y cobertura. El análisis estático usa TypeScript estricto, ESLint y Prettier; SonarCloud no está integrado.

## Protección de `main`

El administrador del repositorio debe abrir **Settings → Rules → Rulesets** o **Settings → Branches** y configurar una regla para `main`. Exige pull request y el check del job `Compilar, probar y verificar calidad` (nombre definido en `.github/workflows/quality.yml`); activa aprobación y resolución de conversaciones cuando exista otra persona revisora. Una persona no puede aprobar su propio pull request.

**Bloqueo comprobado el 29/10/2026:** GitHub API respondió `403 Upgrade to GitHub Pro or make this repository public to enable this feature` al leer la protección de `main`. El repositorio es privado y no se cambió su visibilidad. Hace falta habilitar GitHub Pro para conservarlo privado con protección, o revisar y quitar datos sensibles antes de decidir hacerlo público.

La ejecución verde del workflow no prueba que esta regla ya exista. Confirma el ruleset en GitHub y guarda una captura de su configuración para la entrega.

## Acceso del docente

El repositorio `Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad` puede ser privado. Si se mantiene privado, invita al docente desde **Settings → Collaborators** con la cuenta que indique el curso. No publiques la aplicación ni datos de conexión reales para facilitar la revisión.
