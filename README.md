# BingoBolla v12 — Visual Revolution + Fixes

## ¿Qué arregla?

### 1. ❌ → ✅ Error SQL `coin_packages does not exist`
La migración 009 crea la tabla si no existe + re-inserta los Diamond packages.

### 2. ❌ → ✅ Bolas no salían en producción
**Causa raíz**: el caller.mjs corría en tu Mac. En producción no había nadie llamando bolas.
**Solución MVP**: **Client-driven ticks**. Cada cliente conectado a una sala llama `/api/game/tick` cada 3 segundos. El backend SQL tiene rate-limiting interno (1 ball por interval_ms), así que si 10 clientes están viendo la misma sala, solo cae 1 bola cada 3s exactos.

Ventajas:
- Bingo 100% activo mientras alguien esté mirando
- No requiere servidor 24/7 ($0 extra)
- Cuando nadie mira, el juego pausa (eficiente)
- Funciona perfecto en Vercel hobby

### 3. ❌ → ✅ Bingo 90 renderizaba como 5x5
El RoomClient ahora **detecta `room.variant`** y renderiza:
- **Bingo 75** → grid 5×5 con headers BINGO + FREE center
- **Bingo 90** → grid 3×9 sin headers, con celdas vacías visibles

### 4. 🎨 Visual revolution (lo que pediste)

#### Marker animado tipo "rotulador"
Cuando una bola sale y marca un número en tu cartón:
- Aparece un **círculo SVG dibujándose** sobre el número (stroke animado)
- Doble trazo con leve rotación → look "hecho a mano"
- Color del marker = color de columna
- Glow drop-shadow del color
- El número pasa a fondo gradient + sombra

#### Bola mega-3D
- Highlight especular arriba izquierda
- Sombra interna abajo (volumen)
- Glow exterior del color
- **Entrada animada**: cae con bounce, escala, rotación
- **Pulse ring** mientras está activa

#### Confetti CSS-puro al ganar
60 partículas de 5 colores cayendo del techo cuando ganas (línea/doble/bingo).

#### 3 indicadores de premio visibles
Banda superior muestra los 3 patrones (Línea, Doble Línea, Bingo) con estado:
- Pendiente: `—`
- Activo: `...` con glow magenta
- Ganado: `✓` verde

#### "Just marked" spark
Cuando una bola te marca un número, ese celda **chispea** con un anillo amarillo que se expande.

### 5. 🎫 Tiras de 6 cartones (Bingo 90)
Botón "Tira de 6 cartones · -15%" en salas Bingo 90. Compra los 6 de una vez con descuento.

---

## Aplicación

### 1. Migración 009

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v12-visual-revolution.tar.gz
cat supabase/migrations/009_fixes_and_tick.sql | pbcopy
```

→ Supabase SQL Editor → Run.

### 2. Añadir CSS a globals.css

**IMPORTANTE**: Hay un archivo nuevo `src/styles/premium-animations.css`. Tienes 2 opciones:

**Opción A (simple)**: copia su contenido al final de `src/app/globals.css`:
```bash
cat src/styles/premium-animations.css >> src/app/globals.css
```

**Opción B**: importa desde el layout. En `src/app/layout.tsx` añade:
```tsx
import "@/styles/premium-animations.css";
```

### 3. Commit + push

```bash
git add .
git commit -m "feat(v12): visual revolution, marker animation, bingo 90 fix, client tick"
git push origin main
```

Vercel auto-deploya en ~2 min.

### 4. Test

1. Abre `bingobolla.com/room/<id de London 90>` en incógnito
2. Compra un cartón (debe verse **3x9** correctamente)
3. Las bolas deben empezar a caer cada ~3s (porque tu cliente está pinging)
4. Cuando una bola marca tu número → **círculo SVG se dibuja** + chispa
5. Si llegas a "1TG" → sonido tenso + tag animada gradient
6. Cuando ganas → CONFETTI + flash "¡BINGO!"

---

## Cosas que ahora se sienten "2026 AI-era"

| Antes | Ahora |
|---|---|
| Cuadritos planos con fondo gradient | SVG draws hand-drawn circle on top |
| Bolas planas con color sólido | 3D specular + inner shadow + drop glow |
| Bola actual quieta | Drop animation + pulse ring continuo |
| Sin feedback al marcar | Chispa amarilla en cell + animación pop |
| Sin celebración | 60-piece confetti CSS-puro |
| Premio "Línea" o "Bingo" texto | 3 indicators con estado visual claro |
| Bingo 90 roto | Bingo 90 3x9 correcto con tiras |

---

## Limitaciones honestas

1. **El cliente-driven tick necesita al menos 1 jugador activo en la sala**. Si NADIE entra, la sala se queda esperando. Para "atraer" — el lobby muestra "X jugadores" + countdown.

2. **`/api/game/tick` se llama cada 3s mientras estés en una sala**. En tu Vercel hobby (100GB bandwidth/mes), eso son ~28k requests/mes por usuario activo. Si tienes 100 usuarios concurrentes durante 1h → 360k requests/hora. Vercel hobby tiene 100k requests/día. **Limit alcanzable si tienes >50 concurrent users sostenidos**. Solución cuando llegues: Vercel Pro ($20/mes) o Railway con caller.mjs.

3. **El confetti es CSS-puro** → 60 divs por ganador. No tan bonito como canvas-confetti pero zero deps.

---

## Siguiente sprint (v13) — me dices cuando estés listo

- **Sala VIP Diamond Royale** (acceso solo con Diamonds, RTP 92%, jackpots big)
- **Mini-juegos entre rondas** (slot quick spin entre partidas de bingo)
- **Niveles + XP** sistema progresivo
- **Patrones especiales Bingo 75** (cruz, X, T, L)
- **Stripe webhook actualizado** para diamonds purchases
- **Mejora del lobby** para destacar las salas con jackpot acumulado más alto
