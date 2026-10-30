# Evidencias de ejecución

Este documento resume las comprobaciones actuales y separa las mediciones históricas para evitar confundir versiones.

## Verificaciones locales

La revisión actual ejecuta los siguientes comandos desde la raíz del repositorio:

```powershell
npm run build
npm test
npm run test:e2e
npm run test:coverage
npm run typecheck
npm run lint
npm run format:check
```

Resultado de la revisión del proyecto:

| Comprobación          | Resultado actual                                                                 |
| --------------------- | -------------------------------------------------------------------------------- |
| Compilación           | Aprobada                                                                         |
| Pruebas               | 33 aprobadas, 0 fallidas                                                         |
| Prueba E2E            | Electron inicia, autentica, navega a Tickets y crea un ticket en SQLite temporal |
| Cobertura             | Líneas 96.16%; ramas 81.55%; funciones 92.31%                                    |
| Umbrales de cobertura | Líneas >= 75%, ramas >= 60%, funciones >= 55%                                    |
| TypeScript            | Sin errores                                                                      |
| ESLint                | Sin errores bloqueantes                                                          |
| Prettier              | Sin diferencias pendientes                                                       |

Los resultados se conservan en `docs/calidad/evidencias/local-20261029/` y en otras carpetas locales con fecha.

## GitHub Actions

El workflow `.github/workflows/quality.yml` se ejecuta en cada `push` y `pull_request`. Ejecuta la compilación, pruebas, prueba E2E, cobertura, TypeScript, ESLint y Prettier. Los informes se publican como artefactos de la ejecución.

El pipeline usa el nombre `Compilar, probar y verificar calidad`, que se utiliza como control obligatorio para fusionar cambios.

## SonarCloud

SonarCloud está conectado al proyecto:

- Organización: `acsa-jael-reyes-gomez`
- Proyecto: `Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad`
- Método: análisis ejecutado por GitHub Actions
- Resultado: Quality Gate `OK`

GitHub Actions conserva las variables y el secreto necesarios para el análisis. Este dato complementa las pruebas locales y no reemplaza la revisión manual.

## Protección y revisión

La rama `main` está protegida. Antes de fusionar se requiere:

- Crear un pull request.
- Aprobarlo con una revisión independiente.
- Resolver las conversaciones.
- Obtener el resultado aprobado del check `Compilar, probar y verificar calidad`.

## Evidencia histórica

El run `40599606066` corresponde a una revisión anterior, con 28 pruebas y 95.65% de líneas, 80.60% de ramas y 90.54% de funciones. Se conserva como referencia histórica y no debe compararse como si fuera la suite actual.

Las medidas locales actuales contienen 33 pruebas y una versión posterior con SQLite integrado. Los documentos distinguen ambas revisiones para no mezclar resultados.
