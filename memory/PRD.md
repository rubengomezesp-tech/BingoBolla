# BingoBolla — PRD

## Original problem statement
"Crea una app móvil: quiero mires código y repo actual y me lleves a la dirección correcta del proyecto BingoBolla."
El usuario quiere distribuir BingoBolla como **app nativa iOS + Android** sin reescribir el código actual de Next.js 16 + Supabase SSR.
MVP móvil: login, lobby, mapa de mundos (Miami → Vegas por niveles), sala de bingo.

## Idioma de comunicación
**Español** — siempre.

## Arquitectura confirmada
- **Frontend / Backend único**: Next.js 16 (App Router, React 19, Server Components, `force-dynamic`)
- **DB / Auth / Storage / RPC**: Supabase
- **Pagos**: Stripe
- **Hosting web**: Vercel (`https://www.bingobolla.com`)
- **Móvil**: **Capacitor 8** wrapper apuntando a la URL de producción → un solo deploy sirve web + iOS + Android.
- **PWA**: `manifest.json` + `sw.js` ya presentes (mejorables).

## Decisiones clave
- ❌ NO usar `next export` / static export → la app depende de Server Components y Supabase SSR.
- ✅ Capacitor remote URL wrapper (`server.url: https://www.bingobolla.com`).
- ✅ Plataformas nativas (`/ios`, `/android`) se generan en la Mac del usuario (Capacitor 8 requiere Node ≥22, contenedor tiene Node 20).

## Estado actual

### ✅ Completado en esta sesión (31-may-2026)
- Eliminada carpeta vacía `/app/BingoBolla/` (Xcode huérfano).
- Creado `/app/capacitor.config.ts` con `appId=com.bingobolla.app`, server remoto `https://www.bingobolla.com`, allowNavigation a dominios propios + Supabase, configuración SplashScreen + StatusBar + Push.
- Añadidos scripts npm: `cap:add:ios`, `cap:add:android`, `cap:sync`, `cap:open:ios`, `cap:open:android`, `cap:run:ios`, `cap:run:android` (y variantes).
- Actualizado `.gitignore` para ignorar keystores, `google-services.json`, `GoogleService-Info.plist`.
- Creado `/app/MOBILE_BUILD.md` (231 líneas) — guía completa paso a paso para que el usuario genere los proyectos nativos, firme y suba a TestFlight / Play Console en su Mac.

### ✅ Completado en sesión actual (feb-2026)
- **AudioContext autoplay fix** — `lib/sound/index.ts` y `lib/sounds/index.ts` ahora instancian `AudioContext` solo después de un gesto (`gestureUnlocked` flag activado por `pointerdown`/`click`).
- **PWA mejorada** — `sw.js` con estrategias network-first (HTML), cache-first (assets) y SWR (imágenes); `PWARegister.tsx` con banner de instalación reutilizable (cooldown 14 días).
- **Progresión de mundos por nivel** ✅ (este turno):
  - Nueva migration `026_worlds_seed_more.sql` que siembra Vegas Lights (`unlock_level=5`) y Tokyo Rush (`unlock_level=10`).
  - `/app/src/app/mundos/page.tsx` ahora consulta la tabla `worlds` (con fallback estático de 3 mundos), compara `xp.level >= unlock_level` y muestra `🔒 NIVEL X REQUERIDO` cuando bloqueado.
  - Click bloqueado (`preventDefault` + `aria-disabled`) cuando el mundo está locked.
  - `data-testid` añadidos: `world-card-<id>`, `world-status-<id>`.
  - `tsc --noEmit` ✅ limpio; `next build` compila `/mundos` sin errores.

### ⏳ Pendiente para el usuario (en su Mac, fuera de este contenedor)
1. Actualizar Node a v22+.
2. `npm install && npm run cap:add:ios && npm run cap:add:android`.
3. Configurar firma Xcode (Team Apple Dev) + generar keystore Android.
4. Reemplazar iconos / splash con assets de `/public/icons/`.
5. Archive en Xcode → TestFlight; `gradlew bundleRelease` → Play Console.

## Backlog priorizado

### P1 — Próxima sesión
- **Notificaciones Push**: integrar APNs (iOS) + FCM (Android) en flujo de juego (cuando el bingo está por empezar, premio ganado, etc.).
- **Smoke test E2E en producción Vercel** (login → lobby → mapa mundos → sala bingo) tras el deploy del cambio de progresión.

### P2 — Más mundos y nodos
- Sembrar nodos (`world_nodes`) reales para Vegas Lights y Tokyo Rush en una migration posterior.
- Páginas de mundo individuales (`/mundovegas`, `/mundotokyo`) cuando sus nodos estén sembrados.
- Consolidar las dos librerías de audio duplicadas (`lib/sound/` + `lib/sounds/`) en una sola.

### P3 — Producción y cumplimiento
- Política de privacidad y términos legales para tiendas (obligatorio).
- Geo-fencing si los premios reales tienen restricciones por país.
- Localización ES/EN para reseñas de App Store / Play.

## Archivos clave
- `/app/capacitor.config.ts` — config wrapper
- `/app/MOBILE_BUILD.md` — guía de build móvil
- `/app/next.config.ts` — Next.js config (limpio)
- `/app/public/manifest.json` — manifest PWA
- `/app/public/sw.js` — service worker
- `/app/src/components/PWARegister.tsx` — registro PWA + audio (tiene el bug AudioContext)
- `/app/supabase/migrations/` — 26+ migraciones (XP, jackpots, mundos)

## Integraciones
- Supabase (Auth, DB, RPC, Storage) — claves en `.env.local` del usuario.
- Stripe (pagos) — claves en `.env.local` del usuario.
- Capacitor 8 (wrapper móvil) — sin claves externas.
- Push Notifications (futuro) — requerirá APNs Key + Firebase project.

## Credenciales de test
N/A — la auth corre 100% sobre Supabase del usuario.
