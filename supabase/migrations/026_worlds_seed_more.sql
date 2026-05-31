-- ============================================================
-- 026_worlds_seed_more.sql · Mundos adicionales: Vegas + Tokyo
-- ============================================================
-- Seeding adicional, no destructivo. Permite que /mundos
-- muestre dinámicamente los tres mundos del MVP con su
-- unlock_level. Los nodos se sembrarán en migrations futuras.
-- ============================================================

insert into worlds (id, name, ordinal, theme, unlock_level, total_nodes, active)
values
  ('vegas_lights', 'Vegas Lights', 2, 'vegas', 5, 0, true),
  ('tokyo_rush',   'Tokyo Rush',   3, 'tokyo', 10, 0, true)
on conflict (id) do update
  set name         = excluded.name,
      ordinal      = excluded.ordinal,
      theme        = excluded.theme,
      unlock_level = excluded.unlock_level,
      active       = excluded.active;
