# Decisiones técnicas

## ¿Por qué mantuve Electron?

El sistema ya era una aplicación de escritorio. Preferí conservar su estructura y dedicar el proyecto a mejorar las pruebas y la calidad, en lugar de volver a desarrollar todo desde cero.

## ¿Por qué SQLite?

La aplicación trabaja con una base local. SQLite permite realizar las pruebas con bases temporales y datos ficticios sin tocar la información de trabajo.

## ¿Por qué GitHub Actions?

Porque ejecuta automáticamente las verificaciones cuando se realizan cambios y guarda los resultados para revisarlos.

## ¿Por qué SonarQube y c8?

SonarQube ayuda a encontrar problemas en el código y c8 muestra qué parte del código incluido en la medición fue ejecutada por las pruebas.

Estas herramientas se complementan, pero sus porcentajes de cobertura no deben confundirse.
