# Reporte de mejora y verificación del cierre

## Problemas y correcciones

| Problema comprobado                     | Corrección                                                   | Evidencia                                    |
| --------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| Tests incluidos en el denominador c8    | Incluir solo src, conservar exclusión Renderer y umbrales    | Reporte final y package.json                 |
| Tres comentarios CSS sin cierre         | Cerrar separadores y regenerar bundle                        | Compilación; análisis CSS posterior          |
| Regex con retroceso superlineal         | Análisis acotado de agregaciones y recorte lineal de nombres | Regresiones SQL y nombres largos             |
| Cargas de interfaz sin catch explícito  | Capturar rechazo y presentar mensaje                         | Regresiones proyectos/calificación/dashboard |
| Condición repetida y retorno redundante | Simplificar conservando decisiones                           | Suite de reportes y E2E                      |
| box-shadow duplicado                    | Conservar última declaración efectiva y regenerar CSS        | Fuente y bundle consistentes                 |
| Avisos de estado compartido             | Documentar contexto, sin redeclarar; demostrar scope léxico  | Prueba VM y cargador de scripts              |
| Textos y métricas contradictorios       | Documentación vigente única y antecedentes separados         | Plan, manuales, matriz y métricas            |

## Antes y después

Las 25 pruebas iniciales son casos registrados sin resultado completo conservado. Las mediciones de 28/28 y 33/33 son históricas. El cierre previo de 140/140 y c8 88,90 % / 80,75 % / 73,61 % utilizó un denominador que incluía tests; se conserva como antecedente y no se compara como mejora porcentual con el nuevo alcance. Los 80,1 % de cobertura nueva y 30,2 % global de SonarQube corresponden al main anterior, no al porcentaje c8 corregido. No hay cobertura pre-SQA homogénea para calcular una mejora desde el origen.

**146/146 pruebas aprobadas**, cero fallidas y cero omitidas; E2E aprobado. Cobertura c8 corregida: **83,30 % líneas**, **70,41 % ramas** y **94,66 % funciones**.

[PR técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y [push técnico](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690335247) del commit `8f508f5`: aprobados. SonarQube del PR: **PASSED**, cobertura nueva **86,5 %**, duplicación nueva **0,0 %**. El último commit documental debe consultarse en los [checks del PR #8](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/pull/8).

La caída de 88,90 % al porcentaje c8 corregido es un cambio de denominador, no una pérdida demostrada de cobertura. No se rebajó ningún umbral. El detalle de las 36 observaciones está en [CSV](calidad/HALLAZGOS_SONAR.csv); las disposiciones remotas y riesgos abiertos, en [revisión](calidad/HALLAZGOS_SONAR.md).

## Control de cambios y límites

La API de GitHub confirmó `main` protegida: PR obligatorio, una aprobación, check `Compilar, probar y verificar calidad`, checks actualizados, resolución de conversaciones y aplicación a administradores. No se permite force-push ni eliminación. PR #8 permanece abierto y sin aprobación independiente; no se fusionó ni se modificó main directamente.

La captura negativa histórica prueba un check Sonar rechazado, no una ejecución deliberadamente fallida del nuevo wait=true. El código y los logs actuales sí acreditan la espera explícita del scanner y su resultado. No se provocan fallos artificiales en main. Continúan pendientes la revisión/fusión autorizadas, la verificación posterior en main, la entrega en plataforma y el video obligatorio al final.

## Antecedente de julio de 2026 incorporado al cierre

Según el [historial documental aportado](calidad/antecedentes/Historial_Verificado_SoporteTecnico_PreSQA.md), la copia original contiene **25 casos definidos**: 22 en `tests/core-services.test.js` y 3 en `tests/envio-history.test.js`. No se conservan resultados de ejecución que acrediten aprobaciones o fallos ni un reporte inicial de cobertura. No se asigna 0 % ni se calcula una mejora porcentual entre coberturas incompatibles.

La copia utiliza Electron, JavaScript y TypeScript, con MySQL mediante ODBC. En el material examinado no aparecen configuraciones de GitHub Actions o SonarQube; esta ausencia se limita a esa copia. El informe aportado analiza archivos seleccionados y no acredita una ejecución del sistema antiguo. La arquitectura actual Electron y SQLite se conserva.

El resultado vigente sigue siendo **146 aprobadas, 0 fallidas**, c8 corregido **83,30 % líneas / 70,41 % ramas / 94,66 % funciones**. SonarQube del PR: **Quality Gate aprobado**, **86,5 % cobertura del código nuevo** y **0 % duplicación nueva**. Son mediciones con alcances distintos. Los resultados de 28, 33 y 140 casos y sus capturas se conservan como antecedentes. Video pendiente y PR #8 sin fusionar.
