# BingoBolla v16 — Master Game Logic (definitivo, sin parches)

## EL BUG RAÍZ encontrado

`call_next_ball` tenía esta línea como segunda instrucción:

```sql
if v_game.status != 'playing' then return null; end if;
```

Es decir: **la función que sortea bolas se negaba a funcionar si el game no estaba ya en `playing`**. Pero NADIE cambiaba el game de `waiting` → `playing`. Resultado: comprabas cartón, llegaba la hora, y el juego se quedaba congelado para siempre en `waiting`.

Además:
- `call_next_ball` tenía `v_max_ball := 75` hardcodeado → London 90 imposible
- `/api/game/tick` comprobaba `game.status === 'active'` (estado que NO existe en el constraint) → nunca llamaba a `tick_game`
- `FloatingBubbles` generaba `Math.random()` en `useMemo` (corre en server Y cliente) → React #418 hydration mismatch

## Lo que arregla v16

### SQL maestro (015_master_game_logic.sql)
Reescribe TODA la lógica del juego coherente:

1. **`call_next_ball`**: ahora SÍ hace la transición `waiting`→`playing` cuando llega `starts_at` y hay cartones. Detecta 75 vs 90 según `room.variant`. Al terminar, crea el siguiente waiting game automáticamente.
2. **`tick_game`**: si waiting → delega a call_next_ball. Si playing → rate-limited sortea bola.
3. **`tick_waiting_game`**: coherente, defiere si hay otra partida playing.
4. **`global_heartbeat`**: hace tick a TODOS los games activos cada 5s (pg_cron).
5. **`ensure_waiting_game`**: idempotente.
6. Borra la función vieja `activate_waiting_games`.
7. Limpia todos los games huérfanos y crea waiting frescos.

### Endpoint /api/game/tick correcto
Usa `tick_game` (que maneja todo internamente). Service role. Devuelve 200 siempre (no spam de 500).

### FloatingBubbles sin hydration error
Random solo en cliente (useEffect + useState). SSR renderiza vacío.

## Aplicación

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v16-master-logic.tar.gz
```

### 1. SQL maestro (CRÍTICO — esto arregla el juego)

```bash
cat supabase/migrations/015_master_game_logic.sql | pbcopy
```
→ Supabase SQL Editor → New query → Cmd+V → **Run**

Espera ~10s. Al final verás las 6 salas con waiting games frescos + heartbeat activo.

### 2. Build + deploy

```bash
npm run build && git add -A && git commit -m "fix(v16): master game logic - waiting->playing transition + correct tick + hydration fix" && git push origin main && vercel --prod
```

## Test (debe funcionar al 100%)

1. Hard refresh `bingobolla.com/lobby` (Cmd+Shift+R)
2. Entra **Speedy Lite** (la más rápida: 1.5s/bola, arranca en 30s)
3. Banner "🎫 Compra tu cartón · empieza en 0:XX"
4. **Compra 1 cartón** (gold)
5. Espera el countdown a 0
6. **Game arranca automáticamente** → banner cambia a "🎯 Tu partida está en curso"
7. **Bolas empiezan a salir** cada 1.5s
8. Tu cartón se marca solo con SVG animado
9. Si completas línea/bingo → confetti

Si Speedy Lite funciona, todas funcionan (misma lógica, distinto interval).

## Por qué esta vez SÍ

- El bug era que `call_next_ball` se negaba a arrancar games waiting
- Ahora `call_next_ball` ES quien hace la transición
- El endpoint usa el estado correcto (`playing`, no `active`)
- pg_cron hace heartbeat cada 5s → aunque nadie esté en la sala, el juego avanza
- Sin hydration error → el cliente hidrata bien → realtime funciona
