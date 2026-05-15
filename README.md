# BingoBolla v19 — Slots Premium + Fix Lobby

## 1. Sobre los errores de la consola (imagen 2)

```
The AudioContext was not allowed to start. It must be resumed after a user gesture
```

**NO es un bug.** Es la política anti-autoplay de Chrome: bloquea el sonido hasta que el usuario hace clic. No rompe nada — el bingo funciona perfecto (las bolas salían en tu captura). En las slots ya lo arreglé: el audio se inicializa en el primer clic del botón GIRAR, así que no spamea consola.

## 2. Fix lobby duplicados

`ensure_waiting_game` ahora usa `pg_advisory_xact_lock` por sala → dos requests simultáneas nunca crean 2 games. Incluido en la migración. También limpia los huérfanos actuales.

## 3. SLOTS — 3 máquinas premium

Diseñé 3 con identidad propia, mecánica moderna, RNG server-side:

### 🎰 Neon 777 — Clásica synthwave
- 3×3, 5 líneas, **Gold**, RTP 94%
- Neón rosa/cyan. 7 = jackpot (×100), WILD sustituye (×150)
- Ritmo rápido, apuesta 5–500

### 🗿 Aztec Gold — Aventura
- 5×3, 20 líneas, **Sweeps**, RTP 95%
- Tema azteca oro/jade. Scatter (idolo): 3+ = **10 giros gratis con x2**
- Máscara = jackpot (×300 en 5)

### 💎 Diamond Royale — VIP
- 5×3, 25 líneas, **Diamonds**, RTP 96%
- Art-déco lujo. **Multiplicador progresivo** por racha: x1→x2→x3→x5
- Diamante rosa = jackpot (×500), WILD (×750)

### Lógica server-side (anti-trampa)
- `spin_slot(machine, currency, bet)` → RPC atómico
- RNG con pesos por símbolo → controla el RTP real
- Debita apuesta → calcula líneas → acredita premio → registra spin, TODO en una transacción
- Free spins y multiplicadores con estado server-side (`slot_sessions`)
- El cliente NO puede manipular resultados (solo muestra lo que devuelve el server)

### Animación (se siente vivo)
- Rodillos giran con blur, **paran en cascada** izquierda→derecha (140ms offset)
- Símbolos ganadores pulsan con glow del color del símbolo
- Contador de ganancia sube animado (easing cúbico)
- **BIG WIN** (≥15× apuesta): pantalla especial + 40 partículas + sonido ascendente
- Sonido sintetizado por Web Audio (beeps de giro/parada/win), sin archivos
- Auto-spin con parada automática si se acaba el saldo

## Aplicación

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v19-slots.tar.gz
```

### 1. SQL

```bash
cat supabase/migrations/018_slots_engine.sql | pbcopy
```
→ Supabase SQL Editor → Run

Verás las 3 máquinas creadas al final.

### 2. Build + deploy

```bash
npm run build && git add -A && git commit -m "feat(v19): slots premium (3 maquinas RNG server-side) + fix lobby dup" && git push origin main && vercel --prod
```

## Test

1. `bingobolla.com/slots` → 3 máquinas
2. Entra **Neon 777** (Gold, la más barata para probar)
3. Apuesta 5 → GIRAR
4. Rodillos giran y paran en cascada
5. Si ganas: símbolos pulsan, contador sube, sonido
6. Prueba auto-spin
7. Para free spins: juega **Aztec Gold** hasta que salgan 3 idolos 🪙

## Pendiente futuro (no urgente)

- Rotar `SUPABASE_SERVICE_ROLE_KEY` (se pegó en chat) antes de abrir a usuarios reales
- Enlazar slots desde el menú principal / lobby
- Jackpot progresivo compartido entre jugadores
