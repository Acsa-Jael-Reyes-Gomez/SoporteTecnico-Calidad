# Presentación final del proyecto SQA (10 diapositivas)

**Proyecto:** Pipeline CI/CD con aseguramiento de calidad integrado. **Caso:** sistema de soporte técnico Electron.
**Edición actual:** 3 de noviembre de 2026; evidencia de main y cierre del PR #8.

El [HTML editable](Presentacion-Proyecto-SQA.html) y el [PDF de diez diapositivas](Presentacion-Proyecto-SQA.pdf) contienen capturas auténticas en las diapositivas 7 y 8. Las fuentes y respuestas de API están en `../calidad/evidencias/cierre-20261103/`.

## 1. Portada

Proyecto y estudiante; Universidad, curso y fecha de entrega.

## 2. Objetivo y alcance

Reutilizar la aplicación existente y verificar cambios antes de integrarlos con compilación, pruebas, análisis, reportes y revisión.

## 3. Arquitectura y stack

Electron (Renderer JS/CSS → Preload → Main TypeScript → SQLite); GitHub Actions; node:test; c8; ESLint; Prettier; SonarQube Cloud. Variante justificada de React/Express/MySQL permitida por el enunciado.

## 4. Arquitectura del pipeline

Evento `push` o `pull_request` → **BUILD** → **TEST** (140 pruebas y E2E) → **ANALYZE** (TypeScript/ESLint/Prettier/SonarQube) → **REPORT** (logs/LCOV/artefactos).

## 5. Línea base (antes) y evolución

Antes: **25 casos registrados**, pero tasa de aprobación y cobertura inicial **no medidas**. Después: **140 pruebas aprobadas / 0 fallidas**. El aumento del número de casos no permite afirmar mejora porcentual de cobertura por faltar línea base homogénea.

## 6. Métricas finales (después)

Quality Gate: **PASSED**. Cobertura de **código nuevo**: **80,1 %**, con umbral **80 %**. **0** problemas nuevos; **0** nuevos hotspots de seguridad; **0,5 %** duplicación. No se trata de cobertura global del sistema.

## 7. Captura auténtica de pipeline

Captura real de [Actions, run 41562455432](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41562455432): push de main, commit 7697745 y ejecución exitosa; 140/140 pruebas y E2E aprobados según el log.

## 8. Captura auténtica del dashboard

Captura real del [dashboard de main](https://sonarcloud.io/summary/overall?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad), Quality Gate Passed. Las métricas nuevas de 80,1 % de cobertura y 0,48 % de duplicación se verificaron también por API; cobertura global 30,2 %.

## 9. Conclusiones y lecciones aprendidas

La automatización permite detectar problemas antes de integrar. El PR #7 recibió **dos eventos de aprobación de una misma cuenta revisora** y fue fusionado a `main` (commit `7697745`). La protección se confirmó por API y el repositorio es público. Quedan revisión del PR #8, entrega en plataforma y video al final.

## 10. Referencias

- [Repositorio y PR #7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7).
- [GitHub Actions #41560908801](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41560908801).
- [SonarQube Cloud PR #7](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=7).
- [ISO/IEC/IEEE 29119](https://www.iso.org/standard/79428.html).
- [ISO/IEC 25010](https://www.iso.org/standard/78176.html).

## Lista de entrega audiovisual

- [x] Captura real del pipeline en la diapositiva 7.
- [x] Captura real del dashboard final en la diapositiva 8.
- [x] PDF exportado después de insertar capturas y revisado visualmente.
- [ ] Grabar MP4 de 4–5 minutos, resolución mínima 720p, según [guion de video](../video/Guion-Video-4-5-Minutos.md).
