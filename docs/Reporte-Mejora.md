# Reporte de mejora

## ¿Qué mejoré?

El Sistema de Soporte Técnico ya existía. Mi trabajo fue agregar un proceso para comprobar su calidad y corregir problemas encontrados durante las revisiones.

| Antes | Trabajo realizado |
|---|---|
| No había una verificación de calidad centralizada | Configuré GitHub Actions |
| Las pruebas no cubrían de forma organizada los cambios | Organicé y amplié las pruebas automatizadas |
| No había una medición final comparable y clara | Configuré c8 con umbrales |
| Era más difícil revisar errores de código | Integré TypeScript, ESLint, Prettier y SonarQube |
| Los cambios necesitaban más control | Utilicé pull requests y revisiones |

También se corrigieron problemas identificados en consultas, validaciones y archivos de la interfaz. Los detalles técnicos están en [Hallazgos de SonarQube](calidad/HALLAZGOS_SONAR.md).

## Resultados comprobados

- **146 pruebas aprobadas de 146**, sin fallas.
- **E2E aprobado**.
- **83,30 %** de líneas, **70,41 %** de ramas y **94,66 %** de funciones en la medición c8.
- **Quality Gate aprobado** para el PR técnico.
- **86,5 %** de cobertura y **0,0 %** de duplicación en código nuevo de SonarQube.

Estas cifras corresponden a mediciones con alcances distintos. No significan que toda la aplicación esté cubierta.

## Qué falta seguir mejorando

Quedan módulos que podrían tener más pruebas y algunos hallazgos técnicos que requieren seguimiento. La automatización ayuda a detectar problemas, pero no sustituye todas las revisiones manuales.
