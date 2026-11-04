# Sistema de Soporte Técnico

[![Calidad](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/workflows/quality.yml)

**Proyecto final: Aseguramiento de la Calidad del Software**  
**Estudiante:** Acsa Jael Reyes Gómez · **Año:** 2026

## ¿De qué trata?

Trabajé con una copia de un sistema de soporte técnico que ya existía. Es una aplicación de escritorio para gestionar tickets, técnicos, rutas, equipos en taller y reportes. En este proyecto me enfoqué en agregar pruebas y automatizar las revisiones de calidad, sin usar datos reales en las pruebas.

## Herramientas

- **Electron, JavaScript y TypeScript:** aplicación de escritorio.
- **SQLite:** base de datos local.
- **Node.js y node:test:** pruebas automatizadas.
- **GitHub Actions:** pipeline CI/CD.
- **c8, ESLint, Prettier y SonarQube Cloud:** cobertura y revisión del código.

## ¿Qué hace el pipeline?

Cuando se envían cambios al repositorio, GitHub Actions realiza cuatro etapas:

1. **Build:** compila el proyecto.
2. **Test:** ejecuta las pruebas.
3. **Analyze:** revisa tipos, código, formato y calidad.
4. **Report:** guarda los resultados.

Los cambios a `main` se revisan mediante pull requests y verificaciones automáticas.

## Resultados

| Verificación | Resultado |
|---|---:|
| Pruebas automatizadas | 146 aprobadas de 146 |
| Prueba E2E | Aprobada |
| Cobertura de líneas (c8) | 83,30 % |
| Cobertura de ramas (c8) | 70,41 % |
| Cobertura de funciones (c8) | 94,66 % |
| Quality Gate del PR técnico | Aprobado |
| Cobertura de código nuevo en SonarQube | 86,5 % |
| Duplicación de código nuevo | 0,0 % |

La cobertura de c8 corresponde al código incluido en esa medición, **no a toda la aplicación**. Los mínimos configurados son 75 % en líneas, 60 % en ramas y 55 % en funciones.

## Cómo ejecutar el proyecto

Se necesita Windows, Node.js 22 y npm.

```powershell
npm ci
npm run build
npm start
```

Para revisar la calidad:

```powershell
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run format:check
```

## Documentación

- [Plan de calidad](docs/SQA-Plan.md)
- [Diagnóstico inicial](docs/Diagnostico-Inicial.md)
- [Matriz de pruebas](docs/Matriz-Pruebas.md)
- [Línea base](docs/Linea-Base-Calidad.md)
- [Reporte de mejora](docs/Reporte-Mejora.md)
- [Manual técnico](docs/Manual-Tecnico.md)
- [Manual de usuario](docs/Manual-Usuario.md)
- [Evidencias](docs/calidad/EVIDENCIAS_EJECUCION.md)
- [Hallazgos de SonarQube](docs/calidad/HALLAZGOS_SONAR.md)

La presentación y el video se entregan por separado del repositorio.
