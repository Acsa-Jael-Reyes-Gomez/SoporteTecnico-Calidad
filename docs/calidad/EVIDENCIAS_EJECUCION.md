# Evidencia de ejecución vigente e histórica

## Cierre técnico 03/11/2026

- Commit técnico: 8f508f5. [Push](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) y [PR](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592): success.
- 146/146 pruebas, cero omitidas; E2E aprobado.
- c8 aplicación cargada: 83,30 % líneas, 70,41 % ramas, 94,66 % funciones. Umbrales conservados 75/60/55.
- SonarQube PR: gate PASSED, 86,5 % código nuevo,0 % duplicación nueva y cero hallazgos nuevos.
- Artefacto remoto quality-reports; copias locales y JSON en `evidencias/cierre-final-20261103/`.
- Protección de `main` comprobada; PR #8 aprobado y fusionado (commit `888f22a`), con pipeline posterior exitoso (workflow #230).

## Antecedentes conservados

El [push de main 41562455432](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41562455432) aprobó 140/140 y E2E sobre 7697745. El resultado c8 de 88,90/80,75/73,61 % incluía tests en su denominador. Los runs de octubre y sus archivos se conservan como antecedentes, no como estado actual. Las capturas originales de la presentación corresponden a esa etapa y están identificadas como históricas.

Los archivos de `evidencias/cierre-20261103/` contienen las primeras comprobaciones de protección y métricas del main anterior. El PR #8 se fusionó en `main` y se comprobó el pipeline posterior (workflow #230). Consultar los checks del último SHA del PR #8 antes de solicitar su fusión.
