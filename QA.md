# BingoBolla QA

## P1 smoke

Playwright cubre las rutas base sin depender de usuarios sembrados:

```bash
npm run test:e2e:install
npm run test:e2e:smoke
```

El smoke valida:
- `/` expone `lang="es"` y metadata base de BingoBolla.
- `/login` renderiza el formulario actual de email y contraseña.
- `/lobby`, `/mundos` y `/account` redirigen a `/login` cuando no hay sesión.
- `/limites` y `/auto-exclusion` siguen redirigiendo a rutas canónicas.
- `/signup?ref=...` mantiene visible el código de invitación normalizado.
- `/amigos` redirige al flujo social canónico `/invitar`.
- `manifest.webmanifest` y `sw.js` están disponibles.

Para activar el recorrido autenticado:

```bash
E2E_USER_EMAIL="usuario@example.com" E2E_USER_PASSWORD="..." npm run test:e2e:smoke
```

Si `E2E_BASE_URL` no está definido, Playwright compila producción y levanta `next start` en el puerto `3102`. Para probar contra una URL ya levantada:

```bash
E2E_BASE_URL="https://www.bingobolla.com" npm run test:e2e:smoke
```

## Dependency audit

`npm audit --audit-level=moderate` sigue marcando `postcss <8.5.10` dentro de `next@16.2.6`.
Al 2026-06-02, `next@latest` sigue en `postcss@8.4.31`; `next@canary` ya usa
`postcss@8.5.10`. No se recomienda `npm audit fix --force` porque propone un cambio
incompatible de Next. Revalidar cuando Next estable incluya `postcss@8.5.10` o superior.

## P4/P5 community referrals

La migración `20260602211419_community_referrals.sql` crea la base server-only de referidos:
`profiles.referral_code`, `community_referrals`, trigger de signup desde `referral_code` y RPC
`service_get_community_referral_stats`.

P5 aplicado manualmente en Supabase producción el 2026-06-02:
- `profiles.referral_code` existe.
- `community_referrals` existe.
- `profiles_total = 4`.
- `profiles_without_referral_code = 0`.
- `distinct_referral_codes = 4`.
- `service_get_community_referral_stats(id)` devuelve `ok: true` con `referral_code`.
- Deploy producción `dpl_GfWDXAHaeXEJdqGUPuYahQMFHEnB` quedó `Ready` y aliasado a
  `https://www.bingobolla.com`.
- Smoke contra producción: `E2E_BASE_URL="https://www.bingobolla.com" npm run test:e2e:smoke`
  terminó con 10 tests OK y 1 omitido por falta de credenciales E2E.
- Check directo: `/signup?ref=codexqa20260602` devuelve 200 y muestra
  `Invitacion activa codexqa20260602`.
- Check directo: `/invitar` sin sesión redirige a `/login`.

En esta rama no se pudo ejecutar `supabase db lint --local` porque no hay Postgres local en
`127.0.0.1:54322`, Docker no está disponible y el repo no está linkeado con un project ref de Supabase.

## P6 auth entrypoint

`/login` usa el cliente canónico de acceso con contraseña y Magic Link. La creación de cuentas ya no
existe inline en `/login`: el enlace de registro apunta a `/signup`, donde se preservan referral,
confirmación +21 y aceptación de términos.

El smoke valida que `/login` muestra `Contraseña`, `Magic Link`, `Iniciar sesión` y que `Regístrate`
apunta a `/signup`. También conserva la prueba de `/signup?ref=...` para confirmar que el código de
invitación sigue visible.
