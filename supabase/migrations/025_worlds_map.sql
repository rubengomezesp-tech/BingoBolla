-- ============================================================
-- 025_worlds_map.sql  ·  MÓDULO MUNDOS+MAPA · Backend M1
-- ============================================================
-- Tablas AISLADAS para el sistema de mundos y mapa de progresión.
-- NO toca bingo, dinero, EXP ni nada vivo. Cimiento de Bingo World.
--
-- Modelo:
--   worlds            → cada mundo (Miami Nights, Vegas, Tokyo...)
--   world_nodes       → cada nodo/nivel dentro de un mundo
--   player_world_progress → qué nodos completó cada jugador + estrellas
-- ============================================================

-- ---------- MUNDOS ----------
create table if not exists worlds (
  id            text primary key,             -- 'miami_nights'
  name          text not null,                -- 'Miami Nights'
  ordinal       int  not null,                -- orden: 1, 2, 3...
  theme         text not null default 'miami',
  bg_image_url  text,                          -- el render que generas tú
  unlock_level  int  not null default 1,       -- nivel de jugador para desbloquear
  total_nodes   int  not null default 0,       -- se calcula al insertar nodos
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- NODOS / NIVELES dentro de un mundo ----------
-- node_type: 'bingo' | 'minigame' | 'boss' | 'event' | 'reward'
create table if not exists world_nodes (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null references worlds(id) on delete cascade,
  node_index  int  not null,                  -- posición en el camino (1..N)
  node_type   text not null default 'bingo'
                check (node_type in ('bingo','minigame','boss','event','reward')),
  title       text not null,
  -- posición sobre la imagen de fondo, en % (0..100) para ser responsive
  pos_x       numeric(5,2) not null default 50,
  pos_y       numeric(5,2) not null default 50,
  -- a qué apunta el nodo (sala de bingo, tipo de minijuego, etc.)
  target_ref  text,                            -- ej: room_id o 'bolla_blast'
  -- recompensa al completar (sumada vía add_xp y monedas, en Módulo 2)
  reward_xp   int  not null default 25,
  reward_gold bigint not null default 100,
  -- estrellas: cuántas se pueden ganar en este nodo (1-3)
  max_stars   int  not null default 3,
  active      boolean not null default true,
  unique (world_id, node_index)
);

create index if not exists idx_world_nodes_world on world_nodes(world_id, node_index);

-- ---------- PROGRESO DEL JUGADOR EN EL MAPA ----------
create table if not exists player_world_progress (
  player_id    uuid not null references profiles on delete cascade,
  node_id      uuid not null references world_nodes(id) on delete cascade,
  completed    boolean not null default false,
  stars        int  not null default 0 check (stars between 0 and 3),
  best_score   bigint not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (player_id, node_id)
);

create index if not exists idx_pwp_player on player_world_progress(player_id);

-- ---------- RLS ----------
alter table worlds                enable row level security;
alter table world_nodes           enable row level security;
alter table player_world_progress enable row level security;

-- mundos y nodos: lectura pública (todos ven el mapa)
drop policy if exists "worlds readable" on worlds;
create policy "worlds readable" on worlds for select using (true);

drop policy if exists "nodes readable" on world_nodes;
create policy "nodes readable" on world_nodes for select using (true);

-- progreso: cada jugador ve y gestiona SOLO el suyo
drop policy if exists "own progress read" on player_world_progress;
create policy "own progress read" on player_world_progress
  for select using (auth.uid() = player_id);

drop policy if exists "own progress write" on player_world_progress;
create policy "own progress write" on player_world_progress
  for insert with check (auth.uid() = player_id);

drop policy if exists "own progress update" on player_world_progress;
create policy "own progress update" on player_world_progress
  for update using (auth.uid() = player_id);

-- ---------- FUNCIÓN: leer el mapa de un mundo para un jugador ----------
-- Devuelve cada nodo + si está completado + estrellas + si está
-- desbloqueado (nodo 1 siempre; los demás si el anterior está completado).
create or replace function get_world_map(p_world_id text)
returns table (
  node_id     uuid,
  node_index  int,
  node_type   text,
  title       text,
  pos_x       numeric,
  pos_y       numeric,
  target_ref  text,
  reward_xp   int,
  reward_gold bigint,
  max_stars   int,
  completed   boolean,
  stars       int,
  unlocked    boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  return query
  with nodes as (
    select wn.*,
           coalesce(pwp.completed, false) as is_completed,
           coalesce(pwp.stars, 0)         as got_stars
    from world_nodes wn
    left join player_world_progress pwp
      on pwp.node_id = wn.id and pwp.player_id = v_user
    where wn.world_id = p_world_id and wn.active = true
  )
  select
    n.id, n.node_index, n.node_type, n.title,
    n.pos_x, n.pos_y, n.target_ref,
    n.reward_xp, n.reward_gold, n.max_stars,
    n.is_completed, n.got_stars,
    -- desbloqueado si: es el primero, O el nodo anterior está completado
    (n.node_index = 1
      or exists (
        select 1 from nodes prev
        where prev.node_index = n.node_index - 1 and prev.is_completed
      )
    ) as unlocked
  from nodes n
  order by n.node_index;
end;
$$;

grant execute on function get_world_map(text) to authenticated, anon;

-- ---------- SEED: Mundo 1 = Miami Nights con 8 nodos ----------
-- (bg_image_url se rellena cuando integremos tu render)
insert into worlds (id, name, ordinal, theme, unlock_level, total_nodes)
values ('miami_nights', 'Miami Nights', 1, 'miami', 1, 8)
on conflict (id) do update set name = excluded.name;

-- 8 nodos de ejemplo siguiendo un camino (posiciones en % sobre el fondo).
-- node_type variado para que el mapa se sienta vivo desde el principio.
insert into world_nodes (world_id, node_index, node_type, title, pos_x, pos_y, target_ref, reward_xp, reward_gold) values
  ('miami_nights', 1, 'bingo',    'Primera Partida',  12, 82, null, 25, 100),
  ('miami_nights', 2, 'bingo',    'Calienta Motores', 24, 70, null, 25, 120),
  ('miami_nights', 3, 'minigame', 'Bolla Blast',      37, 74, 'bolla_blast', 30, 150),
  ('miami_nights', 4, 'bingo',    'Sala Tropical',    48, 58, null, 35, 180),
  ('miami_nights', 5, 'event',    'Fiesta Especial',  60, 62, 'event', 40, 220),
  ('miami_nights', 6, 'bingo',    'Reto de Patrones', 71, 46, null, 45, 260),
  ('miami_nights', 7, 'minigame', 'Numbers Rush',     82, 50, 'numbers', 50, 300),
  ('miami_nights', 8, 'boss',     'BOSS · Rey Bingo', 90, 30, 'boss', 100, 600)
on conflict (world_id, node_index) do nothing;

-- ============================================================
-- FIN M1 backend. Tablas + mapa de Miami Nights (8 nodos) listos.
-- get_world_map() devuelve el mapa con progreso y desbloqueo.
-- M2 = completar nodo (da EXP+monedas) enganchado al bingo real.
-- ============================================================
