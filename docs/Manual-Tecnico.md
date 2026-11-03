# Manual técnico

## Arquitectura

La aplicación reutilizada es un sistema de escritorio Electron. El Renderer está escrito en JavaScript/CSS; `preload.ts` expone una API acotada; el proceso principal TypeScript gestiona IPC, reglas de negocio, permisos y consultas SQLite mediante `node:sqlite`. No usa React ni Express. Consulta `docs/MAPA_FUNCIONALIDADES.md` para localizar módulos y operaciones.

## Requisitos

- Windows 10 o posterior, compatible con Electron 45.
- Node.js 22 para desarrollo; Electron 45 incorpora Node.js 24 en producción.

La base inicial está en `assets/database/seed.db`; el esquema de referencia está en `assets/database/schema.sqlite.sql`.

## Instalación y compilación

```powershell
npm ci
npm run typecheck
npm run build
```

Para iniciar el proceso compilado: `npm start`. `npm run start:build` compila y luego abre Electron. Electron descarga el binario de su versión la primera vez que se inicia; ese paso requiere conectividad a los artefactos oficiales. Los scripts de empaquetado escriben en `release/`; no son necesarios para las pruebas de calidad.

## Configuración de base de datos

Al iniciar por primera vez, la aplicación copia `assets/database/seed.db` a la carpeta `userData` de Electron como `soporte_tecnico.db`. Las ejecuciones posteriores usan esa copia para conservar los cambios. `SOPORTE_DATABASE_PATH` permite indicar otra ubicación. El archivo de trabajo no está dentro del instalador ni del repositorio después de copiarse.

El volcado MySQL recibido se convirtió a SQLite. Se conservaron las filas `INSERT`; los procedimientos almacenados de generación de tickets no se importaron. Las fechas operativas de la semilla se ajustaron proporcionalmente al intervalo 25/09/2026–26/10/2026, conservando horas y orden temporal. No sobrescribas una base de trabajo existente al reinstalar. El archivo semilla es una instantánea; cada instalación mantiene sus cambios localmente. El archivo `seed.db` incluye los registros importados del volcado compartido y se distribuye con la aplicación.

## Migración segura de contraseñas

Al abrir una base SQLite, el sistema revisa la columna `usuario.pass` antes de iniciar la aplicación. Las contraseñas válidas almacenadas como texto plano se convierten a hashes bcrypt. Los hashes bcrypt válidos se conservan sin volver a procesarse. Las contraseñas vacías, los hashes incompletos y los datos corruptos se dejan sin modificar.

Antes de convertir contraseñas existentes, la aplicación crea una copia segura en la carpeta `backups`, ubicada junto al archivo `soporte_tecnico.db`. Por ejemplo: `C:\ruta-del-usuario\backups\soporte_tecnico-2026-10-30T11-30-55-714Z.backup.db`.

La copia usa SQLite `VACUUM INTO`, por lo que incluye correctamente los datos actuales incluso cuando estén registrados temporalmente en el archivo WAL. La aplicación verifica primero la integridad de la base original, crea una copia con nombre único, verifica la integridad de la copia y compara IDs, nombres de usuario, nombre visible, rol y estado activo de todos los usuarios. Las contraseñas y los hashes no se incluyen en esa comparación ni en los informes. No sobrescribe respaldos anteriores. Una falla de permisos, espacio, bloqueo, integridad o conservación cancela la migración.

Los archivos de respaldo contienen datos sensibles. En Windows, el programa consulta el SID del usuario actual y utiliza `icacls` para quitar la herencia, conservar acceso explícito al usuario actual, `SYSTEM` y `Administradores`, y verificar la ACL efectiva. `icacls` puede ser bloqueado por políticas de empresa o por permisos administrativos; si falla, se cancela la creación del respaldo. En otros sistemas se aplica `chmod 700/600`. Estas medidas POSIX no representan ACL privadas de Windows. La carpeta `backups/` está excluida de Git y del instalador por configuración de electron-builder. Los respaldos locales no forman parte del paquete de instalación y no se eliminan automáticamente.

La protección estructurada de Windows conserva acceso explícito al usuario actual, `SYSTEM` y el grupo `Administradores`; elimina la herencia y verifica mediante PowerShell las reglas efectivas. Si aparece otra identidad, falta una regla requerida o la ACL no puede verificarse, se cancela el respaldo. Las políticas corporativas pueden impedir ajustar o verificar la ACL aunque la aplicación tenga permisos normales.

Durante la sustitución de `seed.db`, el importador usa archivos temporales y un bloqueo local exclusivo. Ante una interrupción, la recuperación es conservadora: si `seed.db` ya existe se conserva; si falta y existe un único respaldo válido se puede recuperar; si existen varios respaldos o temporales ambiguos, se conserva todo y se requiere intervención manual. Los archivos temporales incompletos nunca se consideran semilla válida. Cualquier recuperación registra una acción local sin contraseñas ni hashes.

La migración mantiene todos los usuarios y no genera ni cambia credenciales. Los casos problemáticos se registran en un informe dentro de `backups/`, con el identificador, el nombre de usuario y una clasificación. El informe nunca incluye la contraseña original ni el hash bcrypt.

Clasificaciones disponibles:

- `bcrypt_valid`: hash válido; se conserva.
- `plaintext_valid`: texto válido; se puede convertir a bcrypt.
- `password_empty`: valor vacío o espacios; se conserva sin modificar.
- `bcrypt_invalid`: comienza como bcrypt, pero el formato está incompleto o es inválido; se conserva sin modificar.
- `unexpected_data`: contiene caracteres dañados o datos fuera de formato esperado; se conserva sin modificar.

Para recuperar una base:

1. Cierra completamente la aplicación.
2. Conserva primero una copia adicional de la base original afectada; por ejemplo, `soporte_tecnico-antes-restaurar.backup.db`.
3. Copia el respaldo de seguridad deseado a una ubicación temporal.
4. Abre únicamente la copia temporal y ejecuta `PRAGMA integrity_check`.
5. Confirma también que los IDs y datos relevantes de los usuarios sean los esperados sin divulgar contraseñas ni hashes.
6. Cuando el respaldo temporal sea válido, reemplázalo como `soporte_tecnico.db`.
7. Conserva tanto la copia anterior como el respaldo restaurado hasta confirmar que el sistema inició correctamente.

## Pruebas y cobertura

Ejecuta desde la raíz del repositorio:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
```

`npm test` compila la aplicación y ejecuta `node:test`. En el cierre se aprobaron **146 pruebas sin fallos ni omisiones** y un recorrido E2E adicional con SQLite aislado. El comando c8 informa **83,30 % de líneas, 70,41 % de ramas y 94,66 % de funciones** con mínimos de **75/60/55 %**, respectivamente. Estas cifras corresponden al código de aplicación instrumentado, no a toda la interfaz. El historial de 25 casos definidos, 28/28, 33/33 y 140/140 está en [la línea base](Linea-Base-Calidad.md).

## Análisis estático y formato

TypeScript estricto verifica tipos y ESLint analiza el código TypeScript y JavaScript. El Renderer comparte algunos bindings entre módulos; por ello sus advertencias deben revisarse en contexto y no suprimirse sin justificación. Prettier comprueba la documentación y los archivos configurados. Las reglas y su tratamiento se documentan en [Hallazgos de SonarQube](calidad/HALLAZGOS_SONAR.md).

## Pipeline CI/CD

El workflow `.github/workflows/quality.yml` se ejecuta en `push` y `pull_request` con Windows y Node.js 22. Su secuencia integra compilación, pruebas unitarias/integración/regresión, E2E de Electron, cobertura con umbrales, validación TypeScript, ESLint, Prettier y publicación de `quality-reports`.

El análisis remoto de SonarQube se ejecuta en los pull requests y en los push de `main`. Esta condición respeta las limitaciones del plan para ramas secundarias, sin omitir los demás controles. El scanner exige credenciales configuradas como secreto y usa `sonar.qualitygate.wait=true` para esperar el Quality Gate. Una falla en un control obligatorio impide que el job se apruebe.

## Análisis estático

La ejecución técnica del [PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) terminó con **Quality Gate PASSED**, **86,5 % de cobertura del código nuevo**, **0 % de duplicación nueva** y **cero hallazgos nuevos**. El panel general de `main` anterior a ese cambio mostraba otra cobertura y hallazgos históricos. No se deben mezclar los denominadores ni interpretar la aprobación del código nuevo como ausencia de deuda histórica. Consulta [las métricas](calidad/METRICAS_CALIDAD.md).

## Flujo GitHub y puertas de calidad

Crear una rama de trabajo, abrir un pull request, revisar los cambios, esperar el check **Puerta de calidad** y fusionar solo con revisión aprobada. La API confirmó que `main` exige pull request, una aprobación y el check exitoso, incluso para administradores. La configuración se explica en `docs/Flujo-GitHub.md`.

## Mantenimiento

Conservar `package-lock.json`, usar `npm ci` en CI, revisar dependencias antes de actualizarlas y no modificar el esquema productivo desde pruebas. Actualizar las métricas solo después de ejecutar las herramientas y conservar la línea base original.

## Solución de problemas

- **No aparece la base:** verifica permisos de escritura en la carpeta `userData` o define `SOPORTE_DATABASE_PATH`.
- **Falla de autenticación:** reconstruye la semilla desde otro volcado con `npm run db:sqlite:import -- "C:\ruta\volcado.sql"`. Importar reemplaza `seed.db`, pero no las bases de trabajo ya creadas.
- **Falla `npm ci`:** confirma Node 22 y conectividad al registro npm.
- **Falla TypeScript:** ejecuta `npm run typecheck` y corrige el error antes de probar.
- **Falla cobertura:** identifica archivo/ramas sin prueba; no reduzcas los umbrales para ocultar la regresión.

## Alcance del cierre y mantenimiento de evidencias

El cierre técnico del 3 de noviembre de 2026 documenta **146/146 pruebas aprobadas**, E2E exitoso, cobertura c8 **83,30 / 70,41 / 94,66 %** y Quality Gate aprobado en el PR #8. Las capturas anteriores están identificadas como antecedentes, no como cifras vigentes. Conserva sus enlaces a ejecuciones y el inventario final de casos de prueba.

Al corte registrado, la integración en `main` seguía pendiente de aprobación independiente. Antes de afirmar que está fusionado, comprueba el PR y el último workflow de `main`. El video obligatorio MP4 y la entrega académica son pasos externos, no evidencia de ejecución del pipeline. Los riesgos del Renderer y los estilos inline se mantienen documentados en [Revisión y deuda técnica](calidad/REVISION_Y_DEUDA_TECNICA.md).
