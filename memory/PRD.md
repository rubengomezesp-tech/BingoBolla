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

### ⏳ Pendiente para el usuario (en su Mac, fuera de este contenedor)
1. Actualizar Node a v22+.
2. `npm install && npm run cap:add:ios && npm run cap:add:android`.
3. Configurar firma Xcode (Team Apple Dev) + generar keystore Android.
4. Reemplazar iconos / splash con assets de `/public/icons/`.
5. Archive en Xcode → TestFlight; `gradlew bundleRelease` → Play Console.

## Backlog priorizado

### P1 — Próxima sesión
- **Fix AudioContext warning**: mover `initAudio()` en `/app/src/components/PWARegister.tsx` desde `useEffect` a un gesto del usuario (click en el lobby).
- **Mejorar PWA**: cache de assets en `sw.js` + prompt de instalación en `PWARegister.tsx`.
- **Notificaciones Push**: integrar APNs (iOS) + FCM (Android) en flujo de juego (cuando el bingo está por empezar, premio ganado, etc.).

### P2 — Progresión de mundos
- Implementar desbloqueo de mundos por XP/nivel en `/app/src/app/mundos/page.tsx`:
  - Miami Nights → Lv 1 (activo).
  - Vegas Lights → Lv 5.
  - Tokyo Rush → Lv 10.
  - etc.
- Conectar con migraciones existentes `023_xp_hooks.sql` y `025_worlds_map.sql`.

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
