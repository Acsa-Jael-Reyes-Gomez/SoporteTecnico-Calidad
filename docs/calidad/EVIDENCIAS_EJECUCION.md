# Evidencias verificadas de ejecución del proyecto SQA

## Cierre del PR #7 — noviembre de 2026

| Evidencia                                         | Referencia verificable                                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Workflow PR aprobado                              | [GitHub Actions, run 41560908801](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801)       |
| 140 pruebas, 0 fallidas                           | Log del job `Compilar, probar y verificar calidad` del run                                                                        |
| E2E de Electron con SQLite aislado                | Paso `PROBAR - recorrido E2E de Electron con SQLite aislado`                                                                      |
| SonarQube Quality Gate PASSED                     | [Dashboard SonarQube PR #7](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7)        |
| Cobertura de código nuevo, 80,1 %                 | Mismo panel; umbral exigido ≥80 %                                                                                                 |
| 0 problemas nuevos; 0 hotspots; 0,5 % duplicación | Resumen de SonarQube del PR #7                                                                                                    |
| 2 aprobaciones de revisión                        | [PR #7 — conversación/revisiones](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7)                         |
| Merge confirmado                                  | [Commit 7697745](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/commit/76977452bddfd4b204a51057f84e76eb9e6cc34a) |

La fusión fue confirmada en GitHub. El análisis del PR final se realizó en el commit `a06e7cfe40606d55ad463f6eff1b90729ec71981`.

## Lista de capturas necesarias para presentación y video

- [ ] Captura real del job de Actions con fecha, rama, resultado y etapas.
- [ ] Captura real de SonarQube mostrando Quality Gate PASSED, cobertura 80,1 % y duplicación.
- [ ] Captura real del PR #7 con dos aprobaciones y sello MERGED.
- [ ] Captura real de Settings → Rules / Branch protection si la política existe; si no, documentar el bloqueo.
- [ ] Verificación del run `push` de `main` después de fusionar.
- [ ] Confirmación de acceso del docente.
- [ ] Video MP4 entre 4 y 5 minutos, ≥720p.

**No sustituir capturas por maquetas ni afirmar que la protección de rama está habilitada sin comprobarla.**

## Archivo histórico

Los resultados de octubre (28/28, 33/33 y métricas V8 previas) son evidencia histórica que no se debe confundir con el resultado final del PR de 140 pruebas. Véase `docs/calidad/METRICAS_CALIDAD.md`.

## Cierre verificado del 03/11/2026

- Push de main 41562455432: éxito, 140/140, E2E, c8 88,90 % / 80,75 % / 73,61 %.
- Corrección 6ccb7cc: push 41687471160 y PR 41687479429 exitosos. SonarQube se ejecuta solo en PR/main por la restricción de análisis de ramas del plan; los demás checks siguen en todos los push.
- Protección de main verificada por API: una aprobación y checks actualizados obligatorios, incluso administradores. PR #8 sin aprobación bloqueado.
- Páginas públicas de Actions, SonarQube y PR #7 capturadas sin sesión. PNG y respuestas JSON en `evidencias/cierre-20261103/`.
- PDF actualizado a 10 diapositivas con capturas reales. Video reservado para el último paso por indicación de la usuaria.
