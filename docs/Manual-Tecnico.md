# Manual técnico

## Arquitectura

La aplicación reutilizada es un sistema de escritorio Electron. El Renderer está escrito en JavaScript/CSS; `preload.ts` expone una API acotada; el proceso principal TypeScript gestiona IPC, reglas de negocio, permisos y consultas SQLite mediante `node:sqlite`. No usa React ni Express. Consulta `docs/MAPA_FUNCIONALIDADES.md` para localizar módulos y operaciones.

## Requisitos

- Windows 10 o posterior, compatible con Electron 45.
- Node.js 22 para desarrollo; Electron 45 incorpora Node.js 24 en produccion.

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

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
```

`npm test` compila y ejecuta `node:test`. El comando de cobertura ejecuta los casos sobre el `dist` compilado. Umbrales configurados: 75% líneas, 60% ramas y 55% funciones. Como referencia histórica, la ejecución local del 29/10/2026 aprobó 33/33 casos. La ejecución de cierre verificada en GitHub Actions run 41564667224 aprobó **140/140 pruebas** y registró cobertura c8: **88,90 % de líneas, 80,75 % de ramas y 73,61 % de funciones**. Son mediciones de diferentes revisiones, y no deben presentarse como incremento de cobertura homogéneo.

## Análisis estático y formato

TypeScript estricto y ESLint se ejecutan en CI. ESLint cubre TypeScript, los módulos JavaScript de la interfaz, pruebas y scripts; no-undef se desactiva para el Renderer porque sus módulos comparten funciones globales. Prettier verifica la documentación y configuración editadas, sin reescribir toda la interfaz. `.hintrc` se conserva para su uso original.

## Pipeline CI/CD

`.github/workflows/quality.yml` se dispara en `push` y `pull_request` para Windows con Node 22. Las etapas instalan dependencias fijadas, compilan, ejecutan pruebas y cobertura, revisan tipos, lint y formato, y guardan reportes como artefactos. La ejecución de cierre 41564667224 pasó y generó el artefacto `quality-reports`. Según Settings → Branches revisado por la propietaria, `main` exige Pull Request, aprobación y estado correcto del trabajo `Compilar, probar y verificar calidad`. PR #7 fue fusionado con dos aprobaciones y tres checks exitosos.

## Análisis estático

El workflow ejecuta TypeScript estricto, ESLint y Prettier. SonarQube Cloud está integrado. El dashboard de `main` mostró **Quality Gate PASSED**, cobertura de código nuevo **80,1 %**, duplicación nueva **0,48 %** y cero problemas nuevos. La cobertura general de SonarQube fue **30,2 %**. En PR #8 se añadió `sonar.qualitygate.wait=true` para que el job también falle ante Quality Gate fallido; verificar su ejecución después del cambio.

## Flujo GitHub y puertas de calidad

Crear una rama de trabajo, abrir un pull request, revisar los cambios, esperar el check **Puerta de calidad** y fusionar solo con revisión aprobada. Un administrador debe proteger `main` para exigir pull request, aprobación y el check exitoso. La configuración se explica en `docs/Flujo-GitHub.md`.

## Mantenimiento

Conservar `package-lock.json`, usar `npm ci` en CI, revisar dependencias antes de actualizarlas y no modificar el esquema productivo desde pruebas. Actualizar las métricas solo después de ejecutar las herramientas y conservar la línea base original.

## Solución de problemas

- **No aparece la base:** verifica permisos de escritura en la carpeta `userData` o define `SOPORTE_DATABASE_PATH`.
- **Falla de autenticacion:** reconstruye la semilla desde otro volcado con `npm run db:sqlite:import -- "C:\ruta\volcado.sql"`. Importar reemplaza `seed.db`, pero no las bases de trabajo ya creadas.
- **Falla `npm ci`:** confirma Node 22 y conectividad al registro npm.
- **Falla TypeScript:** ejecuta `npm run typecheck` y corrige el error antes de probar.
- **Falla cobertura:** identifica archivo/ramas sin prueba; no reduzcas los umbrales para ocultar la regresión.
- **Error `EPERM` cargando Node:** comprueba permisos de lectura/traversal de la ruta de Node y del workspace. El primer intento aislado de esta auditoría lo encontró; la ejecución posterior con acceso al runtime pasó.
