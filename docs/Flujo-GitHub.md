# Cómo trabajé con GitHub

Para evitar cambios directos en la rama principal, seguí este proceso:

1. Crear una rama para los cambios.
2. Realizar las modificaciones y probarlas.
3. Abrir un **pull request**.
4. Esperar las verificaciones de GitHub Actions y SonarQube.
5. Solicitar una revisión y resolver las observaciones.
6. Integrar los cambios a `main` cuando estén aprobados.

La rama principal tiene controles de protección y exige verificaciones antes de aceptar cambios.

El pipeline se encuentra en `.github/workflows/quality.yml`. Las ejecuciones se pueden revisar en la pestaña **Actions** del repositorio.
