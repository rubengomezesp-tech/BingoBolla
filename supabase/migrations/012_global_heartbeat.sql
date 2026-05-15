-- ============================================================================
-- v12 — Global heartbeat: mantiene todas las salas activas 24/7
-- Usa pg_cron de Supabase (sin necesidad de Vercel cron ni clients)
-- ============================================================================

-- 1. Habilitar pg_cron (Supabase free tier lo soporta)
create extension if not exists pg_cron with schema extensions;

-- 2. Función global: para cada sala activa, asegura que hay un waiting/playing game
create or replace function global_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_active_game uuid;
  v_playing_game record;
begin
  -- Para cada sala activa
  for v_room in select id, schedule_interval_seconds, ball_interval_ms from rooms where active = true loop

    -- ¿Hay algún game activo (waiting o playing)?
    select id into v_active_game from games
      where room_id = v_room.id and status in ('waiting','playing')
      order by created_at desc limit 1;

    if v_active_game is null then
      -- No hay nada → crear waiting game
      insert into games (room_id, status, starts_at, seed_hash)
      values (
        v_room.id,
        'waiting',
        now() + (coalesce(v_room.schedule_interval_seconds, 60) || ' seconds')::interval,
        encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex')
      );
    end if;

    -- Hacer tick a games en estado 'playing' (drop next ball si interval pasó)
    for v_playing_game in select id from games where room_id = v_room.id and status = 'playing' loop
      perform tick_game(v_playing_game.id);
    end loop;

    -- Hacer tick a waiting games (auto-start si starts_at pasó)
    for v_playing_game in select id from games where room_id = v_room.id and status = 'waiting' loop
      perform tick_waiting_game(v_playing_game.id);
    end loop;

  end loop;
end;
$$;

-- 3. Programar el job cada 10 segundos
-- Primero borrar si ya existe (idempotente)
do $$
begin
  perform cron.unschedule('bingobolla-heartbeat');
exception when others then
  null;  -- no existía
end;
$$;

select cron.schedule(
  'bingobolla-heartbeat',
  '10 seconds',
  $$select global_heartbeat();$$
);

-- 4. Ejecutar una vez ahora para llenar las salas
select global_heartbeat();

-- 5. Verifica
select jobname, schedule, active from cron.job where jobname = 'bingobolla-heartbeat';
select r.name, g.status, g.starts_at
from rooms r
left join lateral (
  select status, starts_at from games
  where room_id = r.id and status in ('waiting','playing')
  order by created_at desc limit 1
) g on true
where r.active = true
order by r.name;
