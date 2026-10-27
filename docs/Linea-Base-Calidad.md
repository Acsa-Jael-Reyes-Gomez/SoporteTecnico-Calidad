# Línea base de calidad

**Fecha de corte:** 26 de octubre de 2026.  
Esta línea base registra el estado encontrado antes de los cambios documentales y del workflow en esta sesión. No se reemplaza por resultados posteriores.

## Mediciones observables

| Indicador                                           | Línea base de esta auditoría                                 | Evidencia / limitación                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Archivos de prueba                                  | 2                                                            | `tests/core-services.test.js`, `tests/envio-history.test.js`                                         |
| Casos declarados                                    | 28                                                           | Conteo estático de declaraciones `test()` en ambos archivos                                          |
| Pruebas aprobadas                                   | 28 de 28                                                     | npm test, Node.js 22.16.0; compiló y ejecutó ambas suites                                            |
| Pruebas fallidas                                    | 0                                                            | Salida TAP: 28 aprobadas, 0 fallidas                                                                 |
| Cobertura inicial                                   | 95.62% líneas; 80.60% ramas; 90.54% funciones                | npm run test:coverage; umbrales 75%, 60%, 55% satisfechos                                            |
| Errores TypeScript                                  | 0                                                            | npm run typecheck, terminó con código 0                                                              |
| Errores ESLint                                      | No disponible                                                | ESLint no está instalado ni configurado                                                              |
| Bugs / vulnerabilidades / code smells cuantificados | No disponible                                                | No se ejecutó SonarCloud ni un escáner de seguridad                                                  |
| Duplicación / complejidad                           | No disponible                                                | No hay herramienta local instalada para estas métricas                                               |
| Deuda técnica identificada                          | 3 observaciones y 3 asuntos                                  | Registro manual en `docs/calidad/REVISION_Y_DEUDA_TECNICA.md`; no es conteo automatizado de defectos |
| Pipeline                                            | Configuración local revisada; ejecución remota no verificada | .github/workflows/quality.yml; requiere push o pull request en GitHub                                |
| Estado de Git                                       | No disponible                                                | `.git` está vacío y no hay ejecutable Git en PATH                                                    |

## Resultados anteriores anotados en la copia

El documento METRICAS_CALIDAD.md registró previamente 28/28 pruebas, cobertura de 95.62% líneas, 80.60% ramas y 90.54% funciones y cero errores TypeScript el 15 de octubre de 2026. La ejecución de esta sesión reprodujo las mismas cifras para el código fuente actual.

## Incidencia reproducible del entorno

En el sandbox ordinario, Node 22.16.0 podía ejecutar instrucciones inline (node -e), pero cargar los archivos del proyecto devolvía:

```text
Error: EPERM: operation not permitted, lstat 'C:\\Users\\IT'
```

El fallo sucedió antes de ejecutar compilación o assertions. La herramienta autorizó luego el mismo runtime del sistema para la carpeta de trabajo; bajo ese contexto se ejecutaron npm test, npm run test:coverage y npm run typecheck correctamente. No fue necesario reinstalar las dependencias existentes.
