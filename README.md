# BingoBolla v13 — Spectator Mode

## ¿Qué hace?

Estilo tombola.es. Entras a una sala con partida ya empezada:

- **Ves las bolas saliendo en tiempo real** (espectador)
- **No puedes comprar cartones** para la partida en curso
- Puedes **comprar para la siguiente ronda** mientras miras
- A **<5 segundos** del comienzo: ventana cerrada, espera la próxima
- Cuando la partida actual termina y empieza la siguiente: tus cartones en cola se activan automáticamente

## 5 modos del UI según estado

| Modo | Cuándo | Banner |
|---|---|---|
| `live` | Tu cartón jugando | 🎯 ¡Tu partida está en curso! |
| `spectator-queue` | Mirando + ventana compra abierta | 👀 Compra para la siguiente · cierra en Xs |
| `spectator-locked` | Mirando + <5s para empezar | ⏰ Ventana cerrada · espera próxima |
| `wait-with-cards` | Tus cartones en cola, sin partida activa | ⏱️ X cartones listos · empieza en X:XX |
| `buy` | Solo waiting game, ventana abierta | 🎫 Compra tu cartón · empieza en X:XX |

## Aplicación

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v13-spectator-mode.tar.gz

# Migración SQL
cat supabase/migrations/010_spectator_mode.sql | pbcopy
# → Supabase SQL Editor → Run

# Reemplaza el RoomClient
# (sobrescribe el existente en src/app/room/[id]/RoomClient.tsx)

git add .
git commit -m "feat(v13): spectator mode + 5s purchase cutoff + queue"
git push origin main
```

## Cambios SQL críticos

1. **`buy_ticket` y `buy_strip`** ahora rechazan si la waiting game empieza en <5s con error `purchase_window_closed`
2. **`tick_waiting_game`** defiere arranque si hay otra partida `playing` en la misma sala
3. **`get_room_state(p_room_id)`** nuevo RPC que devuelve playing + waiting + flags en una sola llamada
4. **`schedule_interval_seconds`** ajustado por variante:
   - lite: 30s
   - bingo75: 45s
   - bingo90 / pulse / cinco: 60s

## Test post-deploy

1. Abre 2 navegadores incógnito con 2 cuentas distintas
2. **Cuenta A** entra a London 90, compra cartón → empieza la partida
3. **Cuenta B** entra a London 90 (con partida ya empezando) → debe ver:
   - Banner "👀 Mirando la partida actual"
   - Bolas saliendo en tiempo real
   - Botón "Comprar para la siguiente ronda"
4. Cuenta B compra → banner cambia a "X cartones en cola"
5. Cuando la partida de A termina → la nueva ronda empieza con cartones de B activos
6. Cuenta C entra justo cuando faltan 3s → ve "⏰ Ventana cerrada"

## Limitaciones

- El refresh del estado (`get_room_state`) se hace cada 8s + realtime de games. Cambios de estado del juego pueden tardar hasta 8s en aparecer en clientes sin actividad.
- Si dos jugadores compran en el mismo instante a 5.1s del comienzo, uno puede entrar y otro recibir `purchase_window_closed`. Es el comportamiento esperado.
