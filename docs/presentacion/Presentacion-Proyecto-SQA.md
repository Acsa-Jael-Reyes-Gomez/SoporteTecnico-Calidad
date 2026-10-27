# Proyecto final: CI/CD con aseguramiento de calidad

**Esquema para presentación académica de 10 diapositivas.** Los resultados marcados como no disponibles no deben representarse con gráficos de rendimiento. La copia no contiene evidencia visual de una ejecución remota o de SonarCloud.

## 1. Portada

**Pipeline CI/CD con aseguramiento de calidad integrado**  
Sistema existente: Soporte Técnico · Proyecto final universitario · Autor y fecha de exposición: completar.

## 2. Objetivo y alcance

- Reutilizar una aplicación existente y mantener sus funciones.
- Añadir controles de construcción, pruebas, análisis y reporte antes de integrar cambios.
- Alcance: Electron, TypeScript/JavaScript, servicios, ODBC/MySQL y GitHub Actions.
- No se migra a React/Express porque no corresponde a la arquitectura de origen.

## 3. Stack tecnológico real

- Electron 45, TypeScript 5.9 y Node.js 22 para desarrollo y CI.
- Renderer JavaScript/CSS; no React.
- MySQL por ODBC; no Express/API HTTP.
- `node:test` y cobertura V8; no Jest/Istanbul.

## 4. Arquitectura y flujo CI/CD

Diagrama editable sugerido: Renderer → Preload (`window.api`) → Main/IPC → Servicios y validación → MySQL por ODBC. Bajo el diagrama: push/PR → BUILD → TEST → ANALYZE → REPORT.

## 5. Línea base

- 2 archivos de prueba y 28 declaraciones `test()` observadas.
- 28/28 pruebas aprobadas en la verificación local.
- Cobertura medida: 95.65% líneas, 80.60% ramas y 90.54% funciones.
- ESLint y SonarCloud no estaban configurados localmente.
- Explicar que el primer intento del sandbox dio `EPERM`, pero las verificaciones posteriores con acceso al runtime sí pasaron.

## 6. Controles finales agregados

- Pipeline configurado para compilar, probar, medir cobertura, verificar TypeScript y guardar reportes.
- Umbrales configurados: 75% líneas, 60% ramas, 55% funciones.
- **Resultado local:** 28/28 pruebas; TypeScript sin errores; cobertura superior a los umbrales configurados.
- Resultado de GitHub Actions todavía pendiente de una ejecución remota.

## 7. Evidencia del pipeline

Captura auténtica pendiente: GitHub Actions → ejecución real del workflow → etapas y estado. No existe evidencia remota en esta copia. Sustituir esta diapositiva por una captura sin datos sensibles cuando se ejecute el workflow.

## 8. Dashboard y métricas

No hay dashboard SonarCloud accesible ni configurado. Presentar las métricas locales verificadas y explicar que bugs, vulnerabilidades y code smells remotos están pendientes; no crear datos sintéticos.

## 9. Conclusiones

- Se conserva el sistema de tickets Electron existente.
- Los controles académicos se adaptan a tecnologías reales.
- La verificación reproducible requiere resolver permisos Node, configurar el repositorio Git y ejecutar el workflow remoto.

## 10. Referencias

- `docs/Diagnostico-Inicial.md`
- `docs/SQA-Plan.md`
- `docs/Linea-Base-Calidad.md`
- `docs/Reporte-Mejora.md`
- Workflow `.github/workflows/quality.yml`

## Estado del archivo de presentación

Este archivo es el contenido editable de las diapositivas. No se generaron archivos PPTX/PDF porque el runtime local `@oai/artifact-tool` y su cargador de dependencias, requeridos por la herramienta de presentaciones disponible, no están instalados ni expuestos en este entorno. No se simulan capturas de pipeline o dashboards.
