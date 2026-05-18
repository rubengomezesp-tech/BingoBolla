# Plan de ejecución “hacerlo todo” (P0 → P2)

## P0 (hoy)
- Ejecutar `npm run check:repo` y confirmar 100% de rutas críticas e infraestructura base.
- Cerrar auditoría funcional de `AUDIT.md` ruta por ruta con evidencia (fecha + responsable + resultado).
- Rotar secretos sensibles antes de abrir tráfico real.
- Validar flujo completo: `login → lobby → room/[id] → store → store/success`.

### Resultado esperado P0
- Build verde y check de repo verde.
- Auditoría funcional con estado claro (OK/BLOQUEADO) por ruta crítica.

## P1 (esta semana)
- Limpiar o archivar archivos `*.bak*` que no aporten valor operativo.
- Añadir smoke tests de navegación y auth para rutas críticas.
- Añadir checklist de deploy (migraciones, build, verificación post deploy).

## P2 (hardening)
- Métricas de salud (errores API, tiempo de respuesta, partidas activas).
- Alertas sobre cron/tick y degradación de partidas.
- Pruebas E2E para slots y compra.

## Comandos base
```bash
npm run check:repo
npm run build
```
