# BingoBolla

BingoBolla is a Next.js 16 App Router project for a social bingo and worlds experience. The production app runs on Vercel with Supabase, Stripe, a Vercel cron caller, responsible-gaming account flows, world nodes, rewards, slots, and admin operations.

## Stack

- Next.js 16.2 with Turbopack
- React 19
- Supabase Auth, Postgres, RLS and service-role server routes
- Stripe checkout and webhooks
- Playwright smoke coverage
- Capacitor scaffolding for native sync

## Local Commands

```bash
npm install
npm run build
npm run test:e2e:install
npm run test:e2e:smoke
```

The smoke test builds the production app and starts `next start` on port `3102` unless `E2E_BASE_URL` is set.

## Production Notes

- Vercel cron is registered in `vercel.json` for `/api/cron/tick`.
- `CRON_SECRET` and `ADMIN_EMAILS` must exist in Vercel.
- Admin access is controlled by the `ADMIN_EMAILS` environment variable.
- Environment setup details live in `VERCEL_DEPLOY.md`.
- QA and audit notes live in `QA.md` and `AUDIT.md`.

## Repo Hygiene

Legacy local installers, old backup snapshots, and the unrelated USA Puzzle Tour prototype were moved to `archive/legacy-p3/` during the P3 cleanup. They are preserved for reference, but the active app lives in the root Next.js project, `src/`, `public/`, `supabase/`, and supporting config files.

Future ad hoc backups such as `*.bak*`, `*.backup`, and `install_*.sh` are ignored so they do not re-enter the active source tree.
