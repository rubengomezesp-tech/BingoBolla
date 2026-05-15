# BingoBolla v14 — Final Fix Bundle

## El diagnóstico real

Después de revisar TODO tu stack:

| Síntoma | Causa real |
|---|---|
| "La ronda empieza en —" sin contador | No había `waiting_game` en la sala. El RoomClient esperaba uno que nunca se creaba. |
| No salía botón "comprar cartón" | Mismo problema: sin waiting_game, no hay nada que mostrar. |
| `/forgot-password` → 404 | La página nunca se creó en v11. |
| UI "anticuada" | Las animaciones premium estaban en CSS pero faltaba: aurora background, burbujas flotantes, glass morphism reforzado. |

## Lo que arregla v14

### 1. Auto-create waiting_game al entrar a sala
- **SQL nuevo**: `ensure_waiting_game(room_id)` — idempotente
- **page.tsx actualizado**: llama RPC al entrar
- Resultado: **al entrar a CUALQUIER sala, si no hay game activo, se crea uno automáticamente**

### 2. `/forgot-password` + `/auth/reset` reales
- `/forgot-password`: form para pedir enlace de recuperación
- `/auth/reset`: form para setear nueva contraseña tras click en enlace
- Validación de token automática vía Supabase

### 3. Aurora + Bubbles UI premium
- **AuroraBackground**: 3 blobs gradient animados (magenta + cyan + violet) drifting infinitamente
- **FloatingBubbles**: 10-12 burbujas decorativas subiendo de fondo con colores tematicos
- **Glass-premium**: backdrop-filter blur 24px + saturate 180% (look "frosted glass" real)
- **Gradient-border**: borde rainbow animado para elementos destacados
- **Magnetic buttons**: hover lift + spring easing
- **Text gradient rainbow**: animado horizontal
- **Loader orbit**: 2 anillos contra-rotando

## Aplicación

### 1. SQL: ejecutar migración 011

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v14-final-fix.tar.gz
cat supabase/migrations/011_ensure_waiting_game.sql | pbcopy
```

→ Supabase SQL Editor → **Run**.

Verifica:
```sql
select proname from pg_proc where proname = 'ensure_waiting_game';
-- Debe devolver 1 fila
```

### 2. Añadir CSS premium a globals.css

```bash
cat src/styles/aurora-premium.css >> src/app/globals.css
```

### 3. Verifica integración FloatingBubbles en layout

Para que las burbujas aparezcan en TODA la app, edita `src/app/layout.tsx`. Busca el `<body>` y añade los componentes:

```tsx
import { AuroraBackground, FloatingBubbles } from "@/components/FloatingBubbles";

// Dentro del <body>:
<body className={...}>
  <AuroraBackground />
  <FloatingBubbles count={12} />
  {children}
</body>
```

(Si prefieres burbujas solo en login/lobby, no en `room`, déjalas dentro de cada página que las quiera.)

### 4. Build + deploy

```bash
npm run build
# Si pasa:
vercel --prod
```

### 5. Limpieza inicial de games huérfanos (una sola vez)

Si ves que en tu lobby algunas salas aparecen siempre "playing" pero sin actividad:

```sql
update games set status = 'finished'
where status in ('waiting','playing')
  and created_at < now() - interval '15 minutes';
```

## Test después de deploy

1. Hard refresh: **Cmd+Shift+R** en bingobolla.com
2. Login con tu cuenta
3. Entra a **London 90**
4. **Resultado esperado**:
   - Banner "🎫 Compra tu cartón · empieza en 0:59" (contador real descontando)
   - Botones "🪙 100" y "💎 $1" visibles
   - Aurora animado de fondo (gradientes drifting)
   - 12 burbujas flotando suavemente de abajo a arriba
5. Compra 1 cartón → debe verse en grid 3×9
6. Espera ~3s → bolas empiezan a caer
7. Cuando una bola marca tu número → círculo SVG dibujado animado

## Si algo NO funciona

| Problema | Solución |
|---|---|
| Burbujas no se ven | Falta integrar `<FloatingBubbles />` en layout.tsx o en cada página |
| Aurora no se ve | Verifica `cat src/app/globals.css | grep aurora-bg` → debe haber matches |
| Contador no aparece | La migración 011 no se aplicó. Verifica con la query del paso 1 |
| Bolas no salen | Lee `Vercel → Functions → Logs` → busca `/api/game/tick` para ver si hay errores |
| Forgot password redirige a 404 después de email | Faltó configurar redirect URL en Supabase: Auth Settings → URL Configuration → añade `https://bingobolla.com/auth/reset` a redirect URLs |
