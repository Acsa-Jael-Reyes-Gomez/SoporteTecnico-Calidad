# Flujo de revisión e integración

1. Crear rama desde main y agrupar cambios relacionados.
2. Verificar localmente compilación, todas las pruebas, E2E, cobertura, tipos, lint y formato.
3. Publicar cambios autorizados en rama y abrir/actualizar PR; no escribir directamente en main.
4. Esperar checks: SonarQube corre en PR y push de main, con token obligatorio y espera del gate. Los otros push conservan todos los controles locales y reportes.
5. Obtener aprobación independiente y resolver conversaciones. Fusionar solo con autorización de la propietaria; después comprobar el push de main.

## Protección verificada por API

Main exige PR, una aprobación, check `Compilar, probar y verificar calidad`, checks actualizados y conversaciones resueltas. Aplica también a administradores; no permite force-push ni eliminación. No se cambia esta configuración.

PR7 contiene dos eventos APPROVED de la misma cuenta Acsa-Reyes y fue fusionado. Al corte documentado, PR #8 tenía sus [checks técnicos aprobados](https://github.com/Acsa-Jael-Reyes-Gomez/SoporteTecnico-Calidad/actions/runs/41690348592), y requería una revisión propia. Antes de fusionar, comprobar el estado actual y la aprobación independiente. No se intentó omitir la protección ni fusionar el PR durante el corte documentado.

El repositorio es público para lectura del docente. La estudiante debe entregar el enlace y los artefactos en la plataforma; el acceso público no acredita esa entrega manual.
