# BingoBolla — Auditoría de Rutas Producción

Test cada link en **bingobolla.com** (sesión iniciada). Marca lo que NO funcione.

## Rutas que TIENEN que funcionar

### 🏠 Lobby (`/lobby`)
- [ ] Logo "BingoBolla" → debe llevar a `/`
- [ ] Pill 🪙 con balance Gold → debe llevar a `/store`
- [ ] Pill 💎 con balance Sweeps → debe llevar a `/store`
- [ ] Avatar "R" arriba derecha → debe llevar a `/account`
- [ ] Botón "🎁 Bonus diario" → ejecuta RPC `claim_daily_bonus`, suma coins, recarga la página
- [ ] Click en cualquier tarjeta de sala → debe llevar a `/room/[id]`

### 👤 Mi cuenta (`/account`)
- [ ] "← Lobby" → vuelve a `/lobby`
- [ ] Stats visibles: partidas, victorias, bingos, mejor racha
- [ ] Tile "Límites de juego" → `/account/limits`
- [ ] Tile "Auto-exclusión" → `/account/exclude`
- [ ] Tile "Sesiones activas" → `/account/sessions`
- [ ] Tile "Mis premios" → `/account/prizes`
- [ ] Tile "Diamonds" → `/account/diamonds`
- [ ] Tile "Tienda" → `/store`
- [ ] Mensaje 1-800-GAMBLER visible

### ⚖️ Límites (`/account/limits`)
- [ ] Form con inputs: depósitos diario/semanal/mensual, apuestas, pérdidas, sesión
- [ ] Botón "Guardar límites" → ejecuta RPC `upsert_rg_limits`

### 🚫 Auto-exclusión (`/account/exclude`)
- [ ] 6 opciones: 24h, 7d, 30d, 6m, 1y, permanente
- [ ] Botón "Continuar" → muestra confirmación
- [ ] Botón "Sí, excluirme" → ejecuta `request_self_exclusion`, sign out, redirect

### 🔐 Sesiones (`/account/sessions`)
- [ ] Lista de dispositivos conectados
- [ ] Botón "Cerrar todas las sesiones" → signOut scope=global, redirect login

### 🎮 Sala (`/room/[id]`)
- [ ] Header con nombre de sala, balance, botón mute
- [ ] "← Lobby" → vuelve a `/lobby`
- [ ] Tarjeta "Empieza en X:XX" o "JUGANDO"
- [ ] Botón "Comprar cartón 🪙" o "💎"
- [ ] Cartón visible una vez comprado
- [ ] Chat lateral (desktop) o abajo (móvil)
- [ ] Shortcuts del chat: GL all, 1TG, 2TG, WTG, TY, GG

### 💰 Tienda (`/store`)
- [ ] Lista de paquetes de coins
- [ ] Click compra → Stripe Checkout
- [ ] Tras pagar → redirect a `/store/success`

### 🆔 Onboarding (`/onboarding`)
- [ ] Form: fecha nacimiento, estado, país
- [ ] Submit → guarda KYC self-declared → redirect lobby

### 🔑 Login (`/login`)
- [ ] Input email
- [ ] Input contraseña
- [ ] Submit con credenciales válidas → `/lobby`

### 🎯 Landing (`/`)
- [ ] Landing premium dark con CTA "Start Playing"
- [ ] CTA lleva a `/login`

## Problemas conocidos en producción AHORA

## Smoke automatizado P1

Ejecuta:

```bash
npm run test:e2e:smoke
```

Esto cubre login, protección de `/lobby`, `/mundos`, `/account`, aliases de juego responsable y assets PWA. Con `E2E_USER_EMAIL` y `E2E_USER_PASSWORD` también recorre sesión real.

## Limpieza P3

Los backups `.bak*`, scripts `install_*.sh` y el prototipo legacy USA Puzzle Tour se movieron a `archive/legacy-p3/`. La app activa queda en el proyecto Next.js raíz, `src/`, `public/`, `supabase/` y la configuración asociada.

## Comunidad P4/P5

La capa social empieza por invitaciones medibles: `/invitar` muestra código, enlace, progreso y últimos registros; `/signup?ref=` conserva el código; la migración P4 registra referidos en Supabase con acceso server-only. P5 aplicó la migración en producción y verificó 4 perfiles con 4 códigos únicos, 0 perfiles sin `referral_code`, tabla `community_referrals` y RPC `service_get_community_referral_stats` operativo. El deploy `dpl_GfWDXAHaeXEJdqGUPuYahQMFHEnB` quedó `Ready` en Vercel y el smoke público pasó contra `https://www.bingobolla.com`.

### 🔴 Caller worker no corre
**Síntoma**: Salas dicen "EMPIEZA PRONTO" pero nunca empiezan, las bolas no salen.
**Causa**: El caller corre en tu Mac local, no en producción.
**Solución**: v10 incluye `/api/cron/tick` y `vercel.json` registra un cron cada minuto. Requiere `CRON_SECRET` en Vercel y plan Vercel Pro/Enterprise para frecuencia de 1 minuto. NO es ideal (bingo lento) pero funciona sin servidor extra.

### 🟡 Bingo 90 (London 90) usa generador incompleto
**Síntoma**: Cartones aparecen vacíos o con números mal distribuidos.
**Solución**: v10 incluye nuevo generador Bingo 90 correcto (3x9, 15 números).

### 🟢 Bingo 75 funciona
Cartones 5x5, FREE center, números 1-75 distribuidos correctamente por columna BINGO.

## Cómo probar Bingo de forma real

1. Abre bingobolla.com en incógnito
2. Login con email
3. Verifica que llegas a /lobby
4. Click una sala (recomendado: Speedy Lite, es la más barata)
5. Click "Comprar cartón 🪙" (te quedan ~2000 Gold)
6. Espera el countdown (debe aparecer "EMPIEZA EN X:XX")
7. Si el caller funciona → bolas saldrán y la partida transcurre
8. Si NO funciona → la sala se queda en waiting

**Reporta**: ¿en qué número del checklist se rompe la experiencia?
