# Revisión de código y deuda técnica

## Observaciones de revisión

| ID | Hallazgo | Severidad | Estado | Acción |
| --- | --- | --- | --- | --- |
| DEF-001 | La fecha `2026-02-30` era aceptada por la normalización automática de JavaScript. | Alta | Corregido | Validación exacta de componentes de fecha y prueba de regresión. |
| OBS-001 | Las pruebas cargan servicios desde `dist`, por lo que necesitan una compilación previa. | Media | Conocido | El pipeline compila antes de probar. |
| OBS-002 | Las regresiones de interfaz verifican texto fuente con expresiones regulares. | Media | Pendiente | Migrar gradualmente reglas críticas a funciones testeables. |
| OBS-003 | No hay pruebas contra una base de datos de prueba. | Media | Pendiente | Crear entorno MySQL/ODBC aislado si se dispone de infraestructura. |

## Registro de deuda técnica

| ID | Deuda | Impacto | Prioridad | Próximo paso |
| --- | --- | --- | --- | --- |
| DT-001 | La inicialización de base de datos contiene lógica amplia de esquema y compatibilidad. | Riesgo de cambios difíciles de aislar. | Alta | Separar migraciones de la capa de conexión. |
| DT-002 | El límite ODBC conserva varios usos de `any`; ESLint los reporta como advertencias. | Tipos de datos dinámicos no quedan comprobados en compilación. | Media | Introducir tipos del driver gradualmente cuando se refactorice la capa de datos. |
| DT-003 | Cobertura concentrada en servicios y regresiones estáticas. | La interfaz Electron no tiene pruebas de interacción. | Media | Añadir pruebas E2E en un entorno dedicado. |

## Revisión manual sugerida

Antes de fusionar cambios, revisar que no se añadan secretos, que no se modifique `appsettings.json`, que las consultas sigan parametrizadas y que el cambio incluya una prueba cuando afecte reglas de negocio.
