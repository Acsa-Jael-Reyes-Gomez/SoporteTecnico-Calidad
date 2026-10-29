> La tabla histórica corresponde al run remoto anterior a SQLite. La sección final presenta la medición local actual; no confundir ambos commits.

# Resumen de métricas para exponer

## Estado inicial documentado

- 25 casos de prueba anotados en el registro histórico.
- No se registró la tasa de pruebas aprobadas.
- No se medía cobertura ni existía una puerta CI.
- No había verificación ESLint documentada.

## Evidencia remota histórica (27 de octubre de 2026)

| Indicador                |                                           Resultado |
| ------------------------ | --------------------------------------------------: |
| Casos aprobados          |                                               28/28 |
| Cobertura de líneas      |                                              95.65% |
| Cobertura de ramas       |                                              80.60% |
| Cobertura de funciones   |                                              90.54% |
| Errores TypeScript       |                                                   0 |
| Build, ESLint y Prettier |                                           Aprobados |
| GitHub Actions           | Run verde confirmado visualmente por el propietario |

## Límites que deben mencionarse

- No se midió cobertura en la línea base, por lo que no existe una diferencia porcentual inicial/final.
- La medición de esta tabla precede a SQLite; el run 40599606066 fue exitoso en el commit publicado anterior.
- SonarCloud, métricas de bugs/code smells y protección de `main` no están verificados. La medición local posterior a SQLite está disponible más abajo; el run remoto archivado es de la versión previa.
- El artefacto del run está archivado en `docs/calidad/evidencias/run-40599606066/`. La revisión actual también pasó en el PR #1; sus artefactos están en `docs/calidad/evidencias/run-40969163670/quality-reports/`.

## Medición local actual (29 de octubre de 2026)

33/33 pruebas aprobadas; cobertura 96,16% de líneas, 81,55% de ramas y 92,31% de funciones. TypeScript, ESLint, Prettier y build aprobaron. Evidencia: `docs/calidad/evidencias/local-20261029/npm-test-coverage.log`. La cobertura inicial no se midió, así que no se presenta una diferencia porcentual.
