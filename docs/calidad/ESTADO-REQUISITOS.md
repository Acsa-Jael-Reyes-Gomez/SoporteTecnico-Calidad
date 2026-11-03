# Estado de requisitos del Proyecto Final 2026

**Proyecto:** Pipeline CI/CD con Aseguramiento de Calidad Integrado.
**Sistema:** SoporteTecnico-Calidad, aplicación Electron reutilizada.
**Corte:** 3 de noviembre de 2026. Este documento reemplaza el diagnóstico histórico del 29 al 30 de octubre.

## Obligatorios verificados

- Aplicación existente con operaciones CRUD: módulos y pruebas integradas de tickets y rutas.
- Pipeline `.github/workflows/quality.yml`: etapas CONSTRUIR, PROBAR, ANALIZAR y REPORTAR ante push/PR.
- Pruebas unitarias, de integración y regresión: **140 de 140 aprobadas, 0 fallidas**, run [41564667224](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41564667224).
- Inventario de los 140 nombres de pruebas: [INVENTARIO_140_CASOS.csv](INVENTARIO_140_CASOS.csv), extraído del log. La matriz [Matriz-Pruebas.md](../Matriz-Pruebas.md) conserva además 33 casos históricos con entradas y resultados detallados.
- E2E adicional de Electron: inicio, login, Tickets, persistencia en SQLite aislado. Paso separado en el mismo run.
- Umbrales c8 aprobados: **88,90 % líneas**, **80,75 % ramas**, **73,61 % funciones**; mínimos del comando: 75 %, 60 % y 55 % respectivamente.
- Análisis estático: TypeScript estricto, ESLint y Prettier aprobados.
- SonarQube Cloud: Quality Gate **PASSED** en `main`; cobertura de código nuevo **80,1 %**, duplicación nueva **0,48 %**, 0 problemas nuevos.
- Revisión manual: PR [#7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7) fusionado a `main`, con dos aprobaciones de Acsa-Reyes y tres checks exitosos.
- Protección de `main`: la propietaria revisó en Settings → Branches una regla que exige PR, aprobación y estado correcto de `Compilar, probar y verificar calidad`; se recomienda probar el bloqueo con un PR nuevo y conservar captura de la configuración.
- Documentos: SQA Plan, matriz de pruebas, línea base, reporte de mejora, manual técnico y README existen en la rama de cierre.
- Deuda técnica: registrar y priorizar defectos no resueltos en `REVISION_Y_DEUDA_TECNICA.md`.

## Matices importantes

- **25 casos registrados** en el estado inicial no equivale a **25 pruebas aprobadas**. No existe medición histórica comparable de cobertura y no se inventa.
- La cobertura **c8 (88,90 % de líneas)**, la cobertura **SonarQube de código nuevo (80,1 %)** y la cobertura **SonarQube global (30,2 %)** miden universos distintos.
- Hubo una condición de Quality Gate **FAILED** con 70,7 % de cobertura nueva (<80 %) antes de la captura final **PASSED**. Esto confirma la detección por SonarQube, pero no que el job GitHub Actions fallara en ese momento.
- Por tal motivo se actualizó `quality.yml` en PR #8: el job exige `SONAR_TOKEN` y usa `sonar.qualitygate.wait=true` para fallar ante Quality Gate fallido. **Debe verificarse el run de este nuevo cambio antes de fusionar.**
- React/Express/MySQL son el stack sugerido, no obligatorio si se justifica una variante. El enunciado permite proyectos previos y variantes. El sistema usa Electron, TypeScript, JavaScript y SQLite.

## Pendientes de cierre

1. Confirmar que el último commit del [PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8) pase las verificaciones nuevas; solicitar revisión y fusionar a `main`.
2. Verificar que una solicitud sin aprobación o check exitoso quede bloqueada por la regla de `main`.
3. Adjuntar PowerPoint, PDF de 10 diapositivas y anexo de capturas reales a la plataforma.
4. Confirmar acceso del docente a repositorio y documentos.
5. Grabar y entregar el **video obligatorio MP4 de 4 a 5 minutos, mínimo 720p**, al final de la preparación.

## Opcionales, no exigidos

Docker, despliegue continuo a la nube, notificaciones y URL de aplicación desplegada. La prueba E2E es opcional según el enunciado, pero ya está implementada y verificada.

## Fuentes

- Enunciado «Proyecto Final 2026» proporcionado por el curso (PDF de 4 páginas).
- [Repositorio](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad).
- [Ejecución de GitHub Actions](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41564667224).
- [Pull Request #7](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/7).
- [SonarQube Cloud](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad).
