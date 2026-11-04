# Manual técnico

## Cómo está organizado el sistema

El proyecto es una aplicación de escritorio hecha con **Electron**. La interfaz utiliza JavaScript y CSS; **Preload** conecta las pantallas con el proceso principal, escrito en TypeScript. Los datos se guardan en **SQLite**.

| Carpeta | Contenido |
|---|---|
| `src/renderer/` | Pantallas y estilos |
| `src/preload/` | Comunicación segura con Electron |
| `src/main/` | Funciones, permisos y consultas |
| `assets/database/` | Base inicial y esquemas |
| `tests/` | Pruebas automatizadas |
| `.github/workflows/` | Pipeline de calidad |
| `docs/` | Documentación |

## Requisitos

Para trabajar con el proyecto se necesita **Windows, Node.js 22 y npm**.

## Instalación

Desde la carpeta principal:

```powershell
npm ci
npm run build
npm start
```

La aplicación utiliza una base SQLite local en la carpeta de datos del usuario. También puede indicarse otra ruta mediante `SOPORTE_DATABASE_PATH`. No necesita MySQL ni ODBC.

## Cómo revisar la calidad

```powershell
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run format:check
```

GitHub Actions ejecuta estas verificaciones automáticamente en el pipeline. Las pruebas usan datos ficticios y bases temporales para no alterar la información de uso normal.

## Si ocurre un error

Revisa primero el mensaje de la terminal. Si falla una prueba, consulta su archivo en `tests/`. Si falla GitHub Actions, abre la ejecución correspondiente y revisa el paso marcado en rojo. Los resultados y los hallazgos se documentan en [Evidencias](calidad/EVIDENCIAS_EJECUCION.md).
