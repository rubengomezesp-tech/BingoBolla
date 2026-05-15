-- ============================================================================
-- BingoBolla v16 — MASTER GAME LOGIC (sin parches, versión definitiva)
-- Reescribe call_next_ball, tick_game, tick_waiting_game coherentes
-- ============================================================================

-- ============ STEP 0: LIMPIEZA — mata funciones viejas y games huérfanos ============
drop function if exists activate_waiting_games() cascade;

update games set status = 'finished'
where status in ('waiting','playing');

-- ============ STEP 1: CALL_NEXT_BALL — versión correcta ============
-- AHORA: si el game está 'waiting' y starts_at ya pasó, lo cambia a 'playing'
-- Detecta max_ball según variante de la sala (75 o 90)
create or replace function call_next_ball(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_max_ball int;
  v_next_ball int;
  v_sequence int;
  v_called int[];
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error','game_not_found'); end if;

  select * into v_room from rooms where id = v_game.room_id;

  -- max balls según variante
  v_max_ball := case when v_room.variant = 'bingo90' then 90 else 75 end;

  -- Si está waiting y ya llegó la hora → arrancar (transición waiting → playing)
  if v_game.status = 'waiting' then
    if v_game.starts_at > now() then
      return jsonb_build_object('waiting', true,
        'starts_in_s', extract(epoch from (v_game.starts_at - now())));
    end if;
    -- ¿Hay cartones? Si no, no arrancar (push schedule)
    if (select count(*) from cards where game_id = p_game_id) = 0 then
      update games set starts_at = now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval
        where id = p_game_id;
      return jsonb_build_object('no_players', true);
    end if;
    -- ¡Arrancar!
    update games set status = 'playing', starts_at = now() where id = p_game_id;
    v_game.status := 'playing';
  end if;

  if v_game.status != 'playing' then
    return jsonb_build_object('status', v_game.status);
  end if;

  -- Bolas ya sorteadas
  select coalesce(array_agg(ball_number), '{}'::int[]) into v_called
    from balls_called where game_id = p_game_id;

  -- ¿Terminó? (todas las bolas O ya hay ganador de bingo)
  if array_length(v_called, 1) >= v_max_ball or v_game.full_house_won_by is not null then
    update games set status = 'finished', ended_at = now() where id = p_game_id;
    -- Crear el siguiente waiting game inmediatamente
    insert into games (room_id, status, starts_at, seed_hash)
    values (v_room.id, 'waiting',
      now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval,
      encode(digest(gen_random_uuid()::text || now()::text, 'sha256'),'hex'));
    return jsonb_build_object('finished', true);
  end if;

  -- Sortear siguiente bola
  select n into v_next_ball
    from generate_series(1, v_max_ball) as n
    where not (n = any(v_called))
    order by random()
    limit 1;

  v_sequence := coalesce(array_length(v_called, 1), 0) + 1;

  insert into balls_called (game_id, ball_number, sequence)
  values (p_game_id, v_next_ball, v_sequence);

  -- Auto-evaluar ganadores tras cada bola
  begin
    perform auto_claim_wins(p_game_id);
  exception when others then null;
  end;

  return jsonb_build_object('ball', v_next_ball, 'sequence', v_sequence, 'ok', true);
end;
$$;
grant execute on function call_next_ball(uuid) to authenticated, anon;

-- ============ STEP 2: TICK_GAME — rate-limited, maneja waiting Y playing ============
create or replace function tick_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_last_ball_at timestamptz;
  v_interval_ms int;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error','game_not_found','ok',false); end if;

  -- Si waiting → intentar arrancar via call_next_ball
  if v_game.status = 'waiting' then
    return call_next_ball(p_game_id);
  end if;

  if v_game.status != 'playing' then
    return jsonb_build_object('status', v_game.status, 'ok', true);
  end if;

  select * into v_room from rooms where id = v_game.room_id;
  v_interval_ms := coalesce(v_room.ball_interval_ms, 3000);

  select max(called_at) into v_last_ball_at from balls_called where game_id = p_game_id;

  -- Rate limit: no sortear si no pasó el intervalo
  if v_last_ball_at is not null
     and (extract(epoch from (now() - v_last_ball_at)) * 1000) < v_interval_ms then
    return jsonb_build_object('throttled', true, 'ok', true);
  end if;

  return call_next_ball(p_game_id);
end;
$$;
grant execute on function tick_game(uuid) to authenticated, anon;

-- ============ STEP 3: TICK_WAITING_GAME — coherente ============
create or replace function tick_waiting_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_has_playing boolean;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error','game_not_found'); end if;
  if v_game.status != 'waiting' then return jsonb_build_object('status', v_game.status); end if;

  -- Si hay otra partida playing en la misma sala, esperar
  select exists(
    select 1 from games
    where room_id = v_game.room_id and status = 'playing' and id != p_game_id
  ) into v_has_playing;

  if v_has_playing then
    return jsonb_build_object('deferred_playing_active', true);
  end if;

  -- Delegar a call_next_ball (que maneja la transición waiting→playing)
  return call_next_ball(p_game_id);
end;
$$;
grant execute on function tick_waiting_game(uuid) to authenticated, anon;

-- ============ STEP 4: GLOBAL HEARTBEAT — mantiene todo vivo ============
create or replace function global_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_active uuid;
  v_g record;
begin
  for v_room in select id, schedule_interval_seconds from rooms where active = true loop
    -- ¿Hay game activo?
    select id into v_active from games
      where room_id = v_room.id and status in ('waiting','playing')
      order by created_at desc limit 1;

    if v_active is null then
      insert into games (room_id, status, starts_at, seed_hash)
      values (v_room.id, 'waiting',
        now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval,
        encode(digest(gen_random_uuid()::text || now()::text,'sha256'),'hex'));
    end if;

    -- Tick a TODOS los games activos de esta sala
    for v_g in select id from games where room_id = v_room.id and status in ('waiting','playing') loop
      begin
        perform tick_game(v_g.id);
      exception when others then null;
      end;
    end loop;
  end loop;
end;
$$;

-- ============ STEP 5: ENSURE_WAITING_GAME ============
create or replace function ensure_waiting_game(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_game_id uuid;
begin
  select * into v_room from rooms where id = p_room_id and active = true;
  if not found then return null; end if;

  select id into v_game_id from games
    where room_id = p_room_id and status in ('waiting','playing')
    order by created_at desc limit 1;
  if found then return v_game_id; end if;

  insert into games (room_id, status, starts_at, seed_hash)
  values (p_room_id, 'waiting',
    now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval,
    encode(digest(gen_random_uuid()::text || now()::text,'sha256'),'hex'))
  returning id into v_game_id;
  return v_game_id;
end;
$$;
grant execute on function ensure_waiting_game(uuid) to authenticated, anon;

-- ============ STEP 6: Crear waiting games frescos en todas las salas AHORA ============
do $$
declare r record;
begin
  for r in select id, schedule_interval_seconds from rooms where active = true loop
    insert into games (room_id, status, starts_at, seed_hash)
    values (r.id, 'waiting',
      now() + (coalesce(r.schedule_interval_seconds,60) || ' seconds')::interval,
      encode(digest(gen_random_uuid()::text || now()::text || r.id::text,'sha256'),'hex'));
  end loop;
end $$;

-- ============ STEP 7: Re-programar heartbeat (cada 5 segundos para más fluidez) ============
do $$
begin
  perform cron.unschedule('bingobolla-heartbeat');
exception when others then null;
end $$;

select cron.schedule('bingobolla-heartbeat', '5 seconds', $$select global_heartbeat();$$);

-- ============ STEP 8: VERIFICACIÓN ============
select '=== ESTADO FINAL ===' as seccion;
select r.name, r.variant, r.ball_interval_ms, r.schedule_interval_seconds,
  g.status, extract(epoch from (g.starts_at - now()))::int as seg_para_empezar,
  (select count(*) from cards where game_id = g.id) as cartones,
  (select count(*) from balls_called where game_id = g.id) as bolas
from rooms r
left join lateral (
  select id, status, starts_at from games
  where room_id = r.id and status in ('waiting','playing')
  order by created_at desc limit 1
) g on true
where r.active = true
order by r.name;

select '=== HEARTBEAT ===' as seccion;
select jobname, schedule, active from cron.job where jobname = 'bingobolla-heartbeat';
