# BingoBolla v10 — Tombola Edition

## ¿Qué hay en este drop?

### 1. Bingo 90 propio (estilo tombola.es)
- Cartones 3×9 con **exactamente 15 números** (5 por fila)
- Columnas con rangos correctos: 1-9, 10-19, ..., 80-90
- Números dentro de cada columna ordenados ascendente
- Generador SQL `generate_bingo90_card()` reescrito

### 2. Tres premios por partida
| Patrón | % del player pool | Cuándo |
|---|---|---|
| Línea | 15% | Primera fila completa |
| **Doble línea** ✨ NUEVO | 25% | Dos filas completas |
| Bingo completo | 60% | Cartón entero |

Total: 100% del player pool. Tu RTP 85% se aplica al pot total → 85% va a jugadores, 15% house.

### 3. Tiras (compra de 6 cartones)
- Función `buy_strip()` compra 6 cartones de bingo 90 a la vez
- Descuento **15% por tira** (incentivo)
- Bloquea para variantes != bingo90

### 4. Vercel Cron — caller en producción
- `/api/cron/tick` endpoint que hace lo que hace `caller.mjs`
- Programado cada **1 minuto** via `vercel.json`
- Dropea hasta 20 bolas por tick (catch-up mode)
- Limpia ghost games, programa rondas, posts MC messages
- **MVP**: 1 min granularidad → bingo será más lento que ideal. Para producción real → Railway.

### 5. Engine TypeScript actualizado
- Soporta Bingo 75 + 90 unificado
- Calcula `to_line`, `to_two_lines`, `to_full_house`
- Helper `ball90Class()` para colorear bolas 1-90

## Cómo aplicar

```bash
cd ~/bingobolla
tar -xzf ~/Downloads/bingobolla-v10-tombola.tar.gz

# 1. Migración
cat supabase/migrations/007_bingo90_tombola_edition.sql | pbcopy
# → Supabase SQL Editor → Run

# 2. Verifica que el AUDIT.md está bien
cat AUDIT.md

# 3. Commit y push (auto-deploy a Vercel)
git add .
git commit -m "feat(v10): Bingo 90 proper, two_lines pattern, strips, cron endpoint"
git push origin main
```

## Después del push

### Configurar CRON_SECRET en Vercel
1. https://vercel.com/discipline1/bingobolla/settings/environment-variables
2. Add **`CRON_SECRET`** = (genera con: `openssl rand -hex 32`)
3. Redeploy

### Verifica que cron está activo
1. https://vercel.com/discipline1/bingobolla/settings/cron-jobs
2. Debes ver "1 cron job" con path `/api/cron/tick`
3. Espera 1 min → click "View Logs" → debe ejecutarse y devolver `{ok: true, stats: {...}}`

### Detener el caller local
Ya no necesitas `npm run caller` en tu Mac. El cron de Vercel se encarga.

## Limitaciones del cron de 1 min

- Bolas tardan ~3s en producción ideal → con cron 1/min, parece pausa larga entre bolas (catch-up)
- Para experiencia fluida tipo tombola: hay que pasar a Railway/Fly ($5/mes) o pg_cron en Supabase Pro

## Siguiente sprint (v11)

- UI nueva sala con layout tipo tombola (caller central grande, 3 indicadores de premios visibles)
- Mini-juegos entre partidas (slots simples)
- Concursos chat
- Patrones especiales Bingo 75 (cruz, X, T, L)
- Sistema de niveles + XP
