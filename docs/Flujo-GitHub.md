# Flujo de trabajo en GitHub

## Ramas y pull requests

1. Crea una rama corta desde la rama principal (`feature/...`, `fix/...` o `docs/...`).
2. Mantén cada cambio enfocado y acompáñalo con pruebas cuando cambie una regla de negocio.
3. Abre un pull request hacia la rama principal y completa `.github/PULL_REQUEST_TEMPLATE.md`.
4. Revisa el diff, secretos, configuración de base y el resultado de **Quality Gate**.
5. Fusiona cuando un revisor apruebe y los checks requeridos estén verdes.

## Checks del pipeline

En la pestaña **Actions**, abre la ejecución **Quality Gate** asociada al commit o PR. Revisa los pasos BUILD, TEST, ANALYZE y REPORT. Descarga el artefacto `quality-reports` para conservar las salidas de pruebas/cobertura. El análisis SonarCloud se omite hasta configurar variables y secreto.

## Protección de rama principal

Un administrador puede abrir **Settings → Rules → Rulesets** o **Branches** y exigir pull request, una aprobación, el status check correspondiente al workflow y resolución de conversaciones antes de integrar. Los nombres exactos dependen de la configuración del repositorio. No se afirma que estas reglas ya estén habilitadas.

## Estado de este directorio

El `package.json` conserva metadatos que apuntan al repositorio original `acsa123/SoporteTecnico`. Esta auditoría no creó repositorios, no cambió remotos y no publicó nada. La carpeta `.git` estaba vacía y no había ejecutable Git disponible, por lo que el estado local del historial queda sin verificar.
