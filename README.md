# BingoBolla v15 — Final Maraton

## Lo que se arregla

### 1. Sala vacía sin botones → Sala completa funcional
**Causa raíz**: `RoomClient` hacía 4 queries serializadas tras montarse. Antes de la primera respuesta, `state` era `null` → pantalla negra.

**Fix**: `page.tsx` server-side llama `get_room_state` en el server y pasa el estado HIDRATADO al cliente. Primer paint = todo visible.

### 2. Algoritmos por variante calibrados

| Sala | Ball interval | Schedule | Duración estimada |
|---|---|---|---|
| Speedy Lite | 1.5s | 30s | ~1:15 |
| Lucky 75 / Jackpot | 2.5s | 45s | ~2:20 |
| London 90 | 3s | 60s | ~4:00 |
| Cinco Stars | 2.5s | 60s | ~2:20 |
| Pulse | 2s | 60s | ~1:40 |

### 3. Comprar coins funcional con Stripe
- `/store` rediseñado con 3 secciones (Gold + Sweeps + Diamonds)
- `/api/checkout` crea sesión Stripe
- `/api/stripe/webhook` procesa pago → llama `credit_purchase` SQL
- Idempotente (no doble-acredita)

### 4. `get_room_state` definitivo
Devuelve EN UNA SOLA QUERY:
- room config
- playing_game con TODAS sus balls
- waiting_game con starts_at
- tus cards en playing y waiting
- chat (últimos 80)
- purchase_open flag + countdowns

### 5. Sin double-loading
- Server hidrata
- Realtime mantiene state
- Polling cada 8s como fallback
- Sin "useEffect que dispara fetch" en mount

## Aplicación

### 1. Extraer y mover archivos

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v15-final-maraton.tar.gz
```

### 2. Migraciones SQL (en orden)

```bash
cat supabase/migrations/013_game_engine_definitive.sql | pbcopy
```
→ Supabase SQL Editor → Run

```bash
cat supabase/migrations/014_credit_purchase.sql | pbcopy
```
→ Supabase SQL Editor → Run

### 3. Build + deploy

```bash
npm run build && git add -A && git commit -m "feat(v15): server-hydrated rooms + store + game engine" && git push origin main && vercel --prod
```

### 4. Verificar Stripe webhook URL

En [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):
- Endpoint: `https://www.bingobolla.com/api/stripe/webhook`
- Events: `checkout.session.completed`
- Si no existe, créalo y copia el `STRIPE_WEBHOOK_SECRET` a Vercel env vars

## Test post-deploy

1. Hard refresh `bingobolla.com/lobby` (Cmd+Shift+R)
2. Click **London 90** → debe verse INMEDIATAMENTE:
   - Banner "🎫 Compra tu cartón · empieza en 0:XX"
   - Botones de comprar
   - Chat a la derecha
3. Compra 1 cartón → aparece en "En cola"
4. Espera countdown → cuando llega a 0 y eres el único, **automáticamente comienza la partida**
5. Las bolas caen cada 3 segundos (Bingo 90)
6. Cuando bola marca tu número → SVG dibujado animado
7. Visita `/store` → 3 secciones con paquetes
8. Click un paquete → te redirige a Stripe Checkout
9. Tras pago → vuelves a `/store/success` con saldo actualizado
