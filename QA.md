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
E2E_USER_EMAIL="usuario@example.com" E2E_USER_PASSWORD="..." npm run test:e2e:seed
E2E_USER_EMAIL="usuario@example.com" E2E_USER_PASSWORD="..." npm run test:e2e:smoke
```

`npm run test:e2e:seed` requiere `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el
entorno local/CI. Crea o repara el usuario de smoke, confirma email, asegura perfil 21+ y ejecuta
`service_submit_onboarding`; nunca debe ejecutarse desde cliente ni exponer la service role.

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

P6 deploy producción `dpl_EyMCuB6NqCQkpDd8oWj9qNbZhgwv` quedó `Ready` y aliasado a
`https://www.bingobolla.com`. Smoke contra producción:
`E2E_BASE_URL="https://www.bingobolla.com" npm run test:e2e:smoke` terminó con 10 tests OK y
1 omitido por falta de credenciales E2E.

## P7 signup/onboarding

P7 alinea el alta completa a 21+ en UI, API y migración SQL. `/signup` envía el callback de email a
`/auth/callback?next=/onboarding`, conserva referral y persiste evidencia inicial de +21/términos en
metadata para que `handle_new_user` la copie a `profiles`.

La migración `20260602220728_p7_onboarding_age_and_referral_activation.sql`:
- añade `profiles.signup_age_gate_confirmed`, `profiles.terms_accepted_at` y `profiles.terms_version`;
- redefine `submit_onboarding` para exigir 21+;
- marca `community_referrals.status = 'onboarded'` y `activated_at` al completar onboarding;
- hace backfill de referidos ya onboarded.

Verificación local P7:
- `npx tsc --noEmit`: OK.
- `git diff --check`: OK.
- `npm run build`: OK.
- `npm run test:e2e:smoke`: 11 tests OK y 1 omitido por falta de credenciales E2E.
- `supabase migration list --local` y `supabase db lint --local` no pudieron ejecutarse porque no hay
  Postgres local en `127.0.0.1:54322`; `psql` tampoco está instalado.

P7 aplicado manualmente en Supabase producción el 2026-06-02:
- `profiles.signup_age_gate_confirmed` existe.
- `submit_onboarding(date,text,text)` exige `v_age < 21`.
- `handle_new_user()` persiste `terms_accepted_at`.
- Deploy producción `dpl_8wGqTWZ2ftm6HcprCYC8XqgyooLK` quedó `Ready` y aliasado a
  `https://www.bingobolla.com`.
- Smoke contra producción: `E2E_BASE_URL="https://www.bingobolla.com" npm run test:e2e:smoke`
  terminó con 11 tests OK y 1 omitido por falta de credenciales E2E.

## P8 authenticated launch gate

P8 añade `scripts/ensure-e2e-user.mjs` y el script `npm run test:e2e:seed` para preparar un usuario
E2E real con service role: email confirmado, perfil 21+, términos persistidos, estado permitido,
`kyc_status = self_declared` y onboarding ejecutado por RPC.

El smoke autenticado ya no acepta silenciosamente usuarios que caigan en `/onboarding`: si se definen
`E2E_USER_EMAIL` y `E2E_USER_PASSWORD`, debe llegar a `/lobby` y recorrer `/lobby`, `/mundos` y
`/account`.

Verificación producción P8:
- `npm run test:e2e:seed`: OK con usuario E2E de producción.
- `E2E_BASE_URL="https://www.bingobolla.com" npm run test:e2e:smoke`: 12 tests OK, 0 omitidos.

## P9 Miami world continuity

P9 cubre la continuidad visual y jugable de `/mundomiami`:
- el CTA/nodo activo emite estado de lanzamiento antes de abrir el overlay seguro;
- el mapa refuerza el flujo con path runner, pulso de nodo y feedback de conexión;
- `/play/neural-cascade` ya no es placeholder: carga el minijuego real con vuelta a `/mundomiami`;
- Ball Match usa tokens originales generados con imagegen en `public/game-assets/ballmatch-tokens/`;
- el smoke autenticado entra en `/mundomiami`, verifica `Miami Nights` y abre `.go-shell` desde el CTA.

Para validar P9 en producción:

```bash
E2E_BASE_URL="https://www.bingobolla.com" E2E_USER_EMAIL="usuario@example.com" E2E_USER_PASSWORD="..." npm run test:e2e:smoke
```
