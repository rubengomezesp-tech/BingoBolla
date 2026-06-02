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
