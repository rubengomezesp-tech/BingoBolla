# BingoBolla — Deploy a Vercel + bingobolla.com

Tienes dominio comprado en Vercel y el repo en GitHub. Pasos exactos.

## 1. Conectar repo en Vercel

1. Ve a https://vercel.com/new
2. Click **Import Git Repository**
3. Selecciona `rubengomezesp-tech/BingoBolla`
4. **NO presiones Deploy todavía** — primero configura env vars

## 2. Environment Variables

En la pantalla de import, scrollea a "Environment Variables" y añade:

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://atfsgvetqxjmmsokswja.supabase.co` | público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (tu anon key) | público, OK exponer |
| `SUPABASE_SERVICE_ROLE_KEY` | (tu NUEVA service_role) | **secret** — solo en Vercel, nunca en git |
| `NEXT_PUBLIC_SITE_URL` | `https://bingobolla.com` | |
| `STRIPE_SECRET_KEY` | `sk_test_...` (cuando lo tengas) | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | |

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
