# Informe final del proyecto SQA

**Estudiante:** Acsa Jael Reyes Gómez  
**Fecha:** 3 de noviembre de 2026

## Trabajo realizado

Utilicé una copia del Sistema de Soporte Técnico para implementar un proceso de calidad sin afectar el sistema original. Preparé pruebas automáticas, análisis de código y un pipeline en GitHub Actions.

El pipeline revisa cuatro etapas: **Build, Test, Analyze y Report**. También utilicé pull requests para revisar los cambios antes de integrarlos.

## Resultados

| Indicador | Resultado |
|---|---:|
| Pruebas automatizadas | 146/146 aprobadas |
| Prueba E2E | Aprobada |
| Cobertura de líneas c8 | 83,30 % |
| Cobertura de ramas c8 | 70,41 % |
| Cobertura de funciones c8 | 94,66 % |
| Quality Gate del PR técnico | Aprobado |
| Cobertura nueva en SonarQube | 86,5 % |
| Duplicación nueva en SonarQube | 0,0 % |

Los porcentajes de c8 no representan toda la aplicación. La medición de SonarQube para código nuevo tiene otro alcance.

## Lo que aprendí

Comprobé que automatizar las pruebas ayuda a detectar errores después de cada cambio. También aprendí a interpretar reportes de cobertura y a revisar el código antes de integrarlo.

Todavía existen aspectos por mejorar, como ampliar las pruebas de otros módulos y dar seguimiento a hallazgos técnicos.

## Evidencias

Consulta la [matriz de pruebas](Matriz-Pruebas.md), el [reporte de mejora](Reporte-Mejora.md) y las [evidencias del pipeline](calidad/EVIDENCIAS_EJECUCION.md). La presentación y el video se entregan por separado.
