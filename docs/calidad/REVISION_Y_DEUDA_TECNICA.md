# Revisión técnica y deuda vigente

La disposición individual de los 36 hallazgos iniciales se conserva en [HALLAZGOS_SONAR.csv](HALLAZGOS_SONAR.csv) y su justificación en [HALLAZGOS_SONAR.md](HALLAZGOS_SONAR.md). No se confunden correcciones en rama con cierres de incidencias en main.

**146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

| Tema                                                            | Estado vigente                                      | Acción                                                      |
| --------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| SQL, nombres de exportación, promesas, condición repetida y CSS | Corregidos en rama, con regresiones                 | Conservar controles y revisar diff                          |
| Estado léxico compartido                                        | Declaración y orden de carga demostrados            | No redeclarar ni sombrear; documentar avisos del analizador |
| BD de prueba                                                    | SQLite sintético en memoria y temporal implementado | No crear entorno MySQL/ODBC ajeno al stack                  |
| Estilos inline CSP                                              | Riesgo abierto documentado, script-src restringido  | Migración de estilos aparte, con regresión visual           |
| Cobertura global y alcance E2E                                  | Distintos del gate c8; E2E solo cubre Tickets       | Priorizar ampliación según riesgo                           |
| PR #8                                                           | Pendiente de revisión independiente                 | No omitir aprobación ni fusionar sin autorización           |

La API de GitHub confirmó `main` protegida: PR obligatorio, una aprobación, check `Compilar, probar y verificar calidad`, checks actualizados, resolución de conversaciones y aplicación a administradores. No se permite force-push ni eliminación. Al corte del 3 de noviembre de 2026, el PR #8 estaba abierto y sin aprobación independiente; no se fusionó ni se modificó `main` directamente. El estado actual debe comprobarse antes de integrar o entregar.

PR #7 recibió dos eventos de aprobación de una misma cuenta revisora. La [revisión anterior](antecedentes/Revision-Tecnica-Anterior.md) se conserva como antecedente, incluyendo observaciones ya superadas. El manual actual describe el cierre automático de rutas durante su validación.
