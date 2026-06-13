-- ============================================================
-- 20260612000000_worlds_chapters_5.sql
-- Campaña de 100 niveles · 5 mundos-capítulo (20 niveles cada uno)
-- ============================================================
-- BingoBolla World es una campaña continua estilo Candy Crush de 100
-- niveles que atraviesa 5 ciudades temáticas. El minijuego Ball Match
-- (public/games/ballmatch.html) aplica la temática por nivel global:
--   Miami  1-20 · Vegas 21-40 · Tokyo 41-60 · Rio 61-80 · Aurora 81-100
--
-- Esta migración deja la tabla `worlds` alineada con esa estructura.
-- Es idempotente (upsert) y NO toca nodos, dinero, bingo ni progreso.
-- Las coordenadas hand-placed del mapa Miami quedan intactas.
-- ============================================================

insert into worlds (id, name, ordinal, theme, unlock_level, total_nodes, active)
values
  ('miami_nights',  'Miami Nights',  1, 'miami',   1,  20, true),
  ('vegas_lights',  'Vegas Lights',  2, 'vegas',   4,  20, true),
  ('tokyo_rush',    'Tokyo Rush',    3, 'tokyo',   8,  20, true),
  ('rio_carnival',  'Rio Carnival',  4, 'rio',     12, 20, true),
  ('aurora_galaxy', 'Aurora Galaxy', 5, 'aurora',  16, 20, true)
on conflict (id) do update
  set name         = excluded.name,
      ordinal      = excluded.ordinal,
      theme        = excluded.theme,
      unlock_level = excluded.unlock_level,
      total_nodes  = excluded.total_nodes,
      active       = excluded.active;

-- ============================================================
-- FIN · /mundos mostrará los 5 mundos-capítulo con su nivel de
-- desbloqueo. Cada mundo enlaza al juego temático en su nivel inicial.
-- ============================================================
