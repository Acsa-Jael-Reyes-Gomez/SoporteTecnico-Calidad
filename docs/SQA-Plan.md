# Plan de aseguramiento de la calidad

**Sistema:** Soporte Técnico  
**Estudiante:** Acsa Jael Reyes Gómez  
**Fecha:** 3 de noviembre de 2026

## ¿Qué quería lograr?

Mi objetivo fue comprobar que los cambios en el sistema no dañaran funciones que ya estaban trabajando. Para eso preparé pruebas automáticas, revisiones de código y un pipeline en GitHub Actions.

## Alcance

Trabajé sobre una aplicación existente hecha con Electron, TypeScript, JavaScript y SQLite. Las pruebas revisan autenticación, tickets, rutas, consultas, reportes y otras funciones. Utilicé datos ficticios y bases temporales para no modificar información real.

## Cómo realicé las verificaciones

1. Revisé el estado inicial del proyecto.
2. Organicé los casos de prueba en una matriz.
3. Preparé pruebas unitarias, de integración y de regresión.
4. Incorporé una prueba E2E que inicia la aplicación y registra un ticket.
5. Configuré la compilación, las pruebas y el análisis de código en GitHub Actions.
6. Revisé los reportes y documenté los resultados.

## Herramientas

| Herramienta       | Uso                          |
| ----------------- | ---------------------------- |
| node:test         | Pruebas automáticas          |
| c8                | Cobertura                    |
| TypeScript        | Revisión de tipos            |
| ESLint y Prettier | Revisión de código y formato |
| SonarQube Cloud   | Calidad del código           |
| GitHub Actions    | Pipeline y reportes          |

## Requisitos para aprobar

Las pruebas, la compilación y los análisis obligatorios deben terminar correctamente. La cobertura mínima de c8 es **75 % de líneas, 60 % de ramas y 55 % de funciones**. En el análisis de código nuevo de SonarQube se exige al menos **80 % de cobertura** y como máximo **3 % de duplicación**.

El pipeline sigue cuatro etapas: **Build, Test, Analyze y Report**. Los cambios a `main` pasan por pull request y revisión.

## Resultados

- **146 de 146 pruebas aprobadas**, sin fallas ni omisiones.
- Prueba E2E aprobada.
- Cobertura c8: **83,30 % líneas, 70,41 % ramas y 94,66 % funciones**.
- Quality Gate del PR técnico: **aprobado**.
- SonarQube en código nuevo: **86,5 % de cobertura y 0,0 % de duplicación**.

La cobertura de c8 no mide toda la aplicación: incluye los archivos cargados dentro del alcance configurado. Los hallazgos que siguen pendientes están en [Hallazgos de SonarQube](calidad/HALLAZGOS_SONAR.md).

## Evidencias

La [matriz de pruebas](Matriz-Pruebas.md), la [línea base](Linea-Base-Calidad.md), el [reporte de mejora](Reporte-Mejora.md) y las [evidencias de ejecución](calidad/EVIDENCIAS_EJECUCION.md) muestran lo realizado.
