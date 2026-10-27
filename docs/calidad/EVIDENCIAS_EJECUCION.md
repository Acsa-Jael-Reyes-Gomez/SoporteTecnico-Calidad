# Evidencias de ejecución

## Comandos ejecutados

```powershell
node --test .\tests\*.test.js
npm run typecheck
npm run test:coverage
```

## Resultados medidos

- Pruebas: 28 aprobadas, 0 fallidas.
- Cobertura: 95.65% líneas, 80.60% ramas y 90.54% funciones.
- Análisis TypeScript: finalizó sin errores.

## Verificación local

Desde la raíz del proyecto:

```powershell
npm ci
npm run typecheck
npm test
npm run test:coverage
```

`npm test` reconstruye `dist` antes de ejecutar las pruebas. No ejecuta Electron ni debe usarse contra una base de datos de producción.

## Verificación en GitHub

Al subir estos cambios, GitHub Actions ejecutará **Quality Gate** en push y pull request. Descarga el artefacto `quality-reports` para conservar las salidas de prueba y cobertura. La ejecución remota sigue pendiente.

## Reproducción local de esta auditoría

El 26 de octubre de 2026, con Node.js 22.16.0, se ejecutaron `npm test`, `npm run test:coverage` y `npm run typecheck`. Resultado: 28/28 pruebas aprobadas, 95.65% de líneas, 80.60% de ramas, 90.54% de funciones y 0 errores TypeScript. No se conectó MySQL/ODBC. El primer intento en sandbox devolvió `EPERM`; las ejecuciones con acceso al runtime completaron correctamente.
