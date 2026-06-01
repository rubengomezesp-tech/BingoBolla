# BingoBolla — Deploy a Vercel + bingobolla.com

Tienes dominio comprado en Vercel y el repo en GitHub. Pasos exactos.

## 1. Conectar repo en Vercel

1. Ve a https://vercel.com/new
2. Click **Import Git Repository**
3. Selecciona `rubengomezesp-tech/BingoBolla`
4. **NO presiones Deploy todavía** — primero configura env vars

## 2. Environment Variables

### Donde ponerlas

- **Local Mac**: `/Users/rubenymarina/Documents/BingoBolla/.env.local`
- **Vercel**: Project -> **Settings -> Environment Variables**. Marca `Production`, `Preview` y `Development` salvo que quieras valores distintos por entorno.
- **Railway**: Project -> **Variables**. Usa los mismos nombres que en Vercel.
- **Supabase**: no pongas estas envs en Supabase salvo que despliegues Edge Functions. Para esta app viven en Next.js/Vercel/Railway/local.

En local, el formato es:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://atfsgvetqxjmmsokswja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=...
PERSONA_WEBHOOK_SECRET=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
WORLD_GAME_RUNS_REQUIRED=false
```

En producción cambia `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_APP_URL` a `https://bingobolla.com`.

### De donde salen

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Project Settings -> API -> Project URL | Publica, OK en browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase -> Project Settings -> API -> anon/public key | Publica, OK en browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Project Settings -> API -> service_role key | **Secreta**. Nunca `NEXT_PUBLIC_`, nunca Git |
| `NEXT_PUBLIC_SITE_URL` | URL canonica del entorno | Local: `http://localhost:3000`; Prod: `https://bingobolla.com` |
| `NEXT_PUBLIC_APP_URL` | Igual que `NEXT_PUBLIC_SITE_URL` | Fallback para redirects |
| `CRON_SECRET` | Generalo tu: `openssl rand -base64 32` | Lo usan `/api/cron/tick` y `/api/game/tick` con `Authorization: Bearer ...` |
| `PERSONA_WEBHOOK_SECRET` | Persona Dashboard -> Webhooks -> endpoint `/api/kyc/webhook` -> Signing secret | Si Persona aun no esta conectado, dejalo sin configurar hasta crear el webhook |
| `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys -> Secret key | `sk_test_...` o `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard -> Developers -> API keys -> Publishable key | `pk_test_...` o `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard -> Developers -> Webhooks -> endpoint `/api/stripe/webhook` -> Signing secret | `whsec_...` |
| `WORLD_GAME_RUNS_REQUIRED` | Valor manual | Local: `false`; Produccion: `true` cuando el flujo mundo este listo |

Click **Deploy**. Tarda ~2 min.

## 3. Asignar el dominio bingobolla.com

Como compraste el dominio en Vercel:

1. Project → **Settings → Domains**
2. Añade `bingobolla.com` (debería aparecer como sugerencia)
3. Añade `www.bingobolla.com` y configura como redirect a `bingobolla.com`
4. Vercel configura los DNS automáticamente (al estar comprado ahí)
5. Espera 1-5 min para que el certificado SSL se emita

## 4. Configurar Supabase Auth para producción

Critical para que el magic link funcione en producción:

1. https://supabase.com/dashboard/project/atfsgvetqxjmmsokswja/auth/url-configuration
2. **Site URL**: `https://bingobolla.com`
3. **Redirect URLs** (add both):
   - `https://bingobolla.com/auth/callback`
   - `https://www.bingobolla.com/auth/callback`
   - `http://localhost:3000/auth/callback` (para seguir trabajando en local)

## 5. Caller worker en producción

El `caller.mjs` corre en tu Mac. Necesita correr 24/7 en algún servidor. Opciones:

### Opción A — Railway (recomendado, $5/mes)
```bash
# Instala Railway CLI
brew install railwayapp/tap/railway

cd ~/bingobolla
railway login
railway init  # selecciona empty project
railway up    # sube y deploya

# Configura env vars en Railway dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY

# Configura el start command:
# node --env-file=.env scripts/caller.mjs
```

### Opción B — Vercel Cron Jobs (más simple pero menos preciso)
Convertir caller a endpoint y configurar cron. Hago la migración en v10 si quieres.

### Opción C — Supabase pg_cron (perfecto pero requiere refactor)
Mover toda la lógica del caller a funciones SQL + pg_cron. v10 también.

Para AHORA — mantén `npm run caller` corriendo en tu Mac mientras testeas en producción. No es ideal pero funciona.

## 6. Stripe webhook en producción

Cuando Stripe esté activo:

1. https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://bingobolla.com/api/stripe/webhook`
3. Eventos: `checkout.session.completed`
4. Copia el "Signing secret" → añade a Vercel env vars como `STRIPE_WEBHOOK_SECRET`
5. Redeploy

## 7. Probar producción

1. Abre https://bingobolla.com (debería cargar la landing)
2. `/login` → email → magic link **debería llegar con link a bingobolla.com**
3. Si llega a localhost o vercel.app → vuelve a paso 4

## 8. Continuous Deploy

Cada `git push origin main` → Vercel rebuilds automáticamente.
Preview deploys en cada PR.

---

## Checklist deploy

- [ ] Repo importado en Vercel
- [ ] Env vars configuradas (anon, service_role, supabase url, site_url)
- [ ] Build exitoso (Vercel dashboard verde)
- [ ] Dominio bingobolla.com asignado
- [ ] SSL emitido (candado verde en navegador)
- [ ] Supabase Auth redirect URLs actualizadas
- [ ] Magic link llega correctamente y redirige a bingobolla.com
- [ ] Onboarding funciona
- [ ] Lobby muestra salas
- [ ] Caller corriendo (local o Railway)
