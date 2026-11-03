# Guion y secuencia del video obligatorio (4 min 30 s)

**Estado:** preparado; no se declara MP4 grabado ni entregado. **Formato final:** MP4, mínimo 1280×720, voz clara. Este recorrido breve es distinto del guion de exposición por diapositivas.

## Pantallas y preparación

1. Portada final, nombre de Acsa Jael Reyes Gómez y repositorio público.
2. Terminal/editor y GitHub: secuencia auténtica rama → cambio → commit → apertura de PR. Preparar esta demostración cuando se autorice la grabación: crear una rama desde la entrega integrada, cambiar una línea documental y abrir un PR real. No ejecutarlo durante este cierre, que solo autoriza publicar en la rama del PR #8. No fusionar la demostración ni provocar fallos en main.
3. Actions del PR de demostración y evidencia técnica del cierre [41690348592](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592): etapas, resultados y quality-reports.
4. Dashboard [SonarQube PR #8](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=8): gate, cobertura, bugs, code smells y duplicación. Verificar cifras y revisión antes de grabar; no atribuir resultados históricos al cambio nuevo de demostración.
5. Tabla de línea base/cierre, revisión y pendientes del informe final.

Se puede recortar la espera de CI indicando que se omitió tiempo de espera y conservando el mismo SHA/run. Si PR #8 aún no está fusionado, decirlo; no simular integración ni afirmar documentación final en main.

## 0:00–0:35 · Introducción (35 s)

**Pantalla:** portada y nombre del proyecto.

“Mi nombre es Acsa Jael Reyes Gómez, estudiante de Ingeniería en Sistemas de la Universidad Mariano Gálvez de Guatemala. Este proyecto aplica un pipeline de integración continua y aseguramiento de calidad al Sistema de Soporte Técnico existente. Conservé Electron y SQLite. El objetivo es detectar errores antes de integrar cambios mediante pruebas, métricas, análisis estático y revisión humana.”

## 0:35–2:15 · Demostración del flujo (100 s)

**Pantallas:** 0:35 rama y cambio; 0:55 commit y PR; 1:15 checks/Actions; 1:35 pruebas, E2E y cobertura; 1:55 resultado y artefactos.

“Creo una rama de demostración y realizo este cambio documental. El commit conserva la trazabilidad y el Pull Request solicita revisión. GitHub Actions instala dependencias fijadas y compila. Después ejecuta las pruebas, el E2E y la cobertura. La suite de cierre conservó los ciento cuarenta casos y agregó seis regresiones: ciento cuarenta y seis aprobadas, sin fallos ni omitidas. El E2E abre Electron, autentica, crea un ticket y confirma su persistencia en SQLite temporal. El gate de c8 mide código de aplicación cargado y excluye tests. Conserva los mínimos de setenta y cinco, sesenta y cincuenta y cinco por ciento. El cierre obtuvo ochenta y tres coma treinta por ciento de líneas, setenta coma cuarenta y uno de ramas y noventa y cuatro coma sesenta y seis de funciones. También pasan TypeScript, ESLint y Prettier. Los reportes quedan descargables. Si un comando o el gate falla, el job no aprueba y main exige su verificación y una aprobación independiente.”

## 2:15–3:05 · Dashboard de calidad (50 s)

**Pantalla:** SonarQube PR #8, cobertura nueva, hallazgos y duplicación; registro de riesgos.

“Este es el análisis del cierre del PR número ocho. El Quality Gate aprobó con ochenta y seis coma cinco por ciento de cobertura nueva, cero por ciento de duplicación nueva y cero bugs, vulnerabilidades o code smells nuevos. El scanner espera ese resultado. Esto no elimina la deuda histórica: main tenía treinta coma dos por ciento de cobertura global y hallazgos previos. Las observaciones están revisadas y documentadas. El permiso de estilos inline sigue identificado como riesgo, sin permitir scripts inline ni desactivar reglas.”

## 3:05–3:45 · Comparación (40 s)

**Pantalla:** tabla de línea base y métricas finales; señalar alcances distintos.

“El registro inicial conserva veinticinco casos, pero no una cobertura equivalente ni todos los resultados. Por eso no calculo una mejora porcentual inexistente. Las capturas de ciento cuarenta casos y ochenta y ocho coma noventa por ciento son antecedentes de un cálculo que incluía tests. El cierre usa ciento cuarenta y seis casos y un denominador corregido. La diferencia de porcentaje no demuestra pérdida de cobertura. La mejora verificable son los controles, los defectos corregidos y las regresiones.”

## 3:45–4:30 · Conclusiones (45 s)

**Pantalla:** revisión del PR #7, protección de main y estado actual del PR #8.

“Aprendí que una ejecución verde necesita evidencias y un alcance claro. Los datos sintéticos permitieron probar sin tocar información operativa. Los nuevos casos comprobaron SQL, exportaciones, paginación y recuperación de errores. El PR número siete registra dos eventos de aprobación de una misma cuenta revisora. Main exige PR, aprobación y verificaciones actualizadas. La integración del cierre debe respetar esa política y la autorización de la propietaria. Conservo la deuda y las limitaciones documentadas. El resultado es un proceso de calidad repetible y revisable, sin cambiar la arquitectura. Muchas gracias.”

## Verificación del archivo real

- Ensayar con cronómetro; ajustar pausas para que dure entre 4:00 y 5:00. El guion no acredita la duración de un archivo inexistente.
- Mostrar la revisión y el run correctos al narrar resultados; confirmar cifras antes de grabar.
- Revisar voz, nitidez y resolución; ocultar credenciales y notificaciones ajenas.
- Exportar MP4, abrirlo y reproducirlo completo; comprobar duración y resolución antes de marcarlo entregado.

**Pronunciación:** pipeline: páip-lain; GitHub Actions: guít-jab ák-shons; Pull Request: pul ri-kuést; SonarQube: só-nar kiub; Quality Gate: kuóliti gueit; c8: si-éit; E2E: i-tu-i; SQLite: es-kiu-el-áit; main: mein.

## Cómo montar el video en Canva

Usa una presentación de video horizontal (16:9) de al menos 1280 × 720 píxeles. Importa **grabaciones de pantalla reales** y añade una pista de voz narrada por ti. Canva sirve para recortar clips, añadir títulos y exportar a MP4; las diapositivas estáticas por sí solas no sustituyen la demostración del pipeline.

**Material disponible para mostrar:**
- Repositorio público y PR #8 con sus commits, cambios y checks.
- [Ejecución técnica aprobada](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592) y su reporte de cobertura.
- [Panel SonarQube del PR #8](https://sonarcloud.io/dashboard?id=Acsa-Jael-Reyes-Gomez_SoporteTecnico-Calidad&pullRequest=8).
- Línea base y tabla de resultados en [Métricas de calidad](../calidad/METRICAS_CALIDAD.md).

**Tomas que conviene grabar:**
1. Repositorio y la rama de trabajo; mostrar un cambio documental real y su commit. Si haces una nueva demostración, abre un PR nuevo sin fusionarlo automáticamente y no modifiques `main` directamente.
2. PR y sección *Checks*; abrir el job para mostrar compilación, 146 pruebas, E2E, cobertura, análisis y artefactos. Si la ejecución tarda, se puede recortar la espera, sin alterar los resultados.
3. SonarQube del PR correcto con Quality Gate, cobertura nueva, bugs, code smells y duplicación.
4. Tabla de evolución: 25 casos **definidos** al inicio, antecedentes de 28/33/140 y 146 aprobados al cierre. No presentar una cobertura inicial inexistente.

**Montaje:** sigue el orden y los tiempos de los cinco segmentos anteriores (35 + 100 + 50 + 40 + 45 segundos = 4:30). Evita música que tape la voz, transiciones largas, datos personales y capturas demasiado pequeñas. Puedes acompañar la grabación con acercamientos a la sección relevante.

**Comprobación antes de entregar:** exporta MP4, reprodúcelo completo, verifica duración entre 4:00 y 5:00, resolución mínima 720p, voz clara y métricas visibles. El guion no sustituye al video. No declares un PR fusionado hasta que GitHub lo confirme.
