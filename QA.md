# BingoBolla QA

## P1 smoke

Playwright cubre las rutas base sin depender de usuarios sembrados:

```bash
npm run test:e2e:install
npm run test:e2e:smoke
```

El smoke valida:
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
