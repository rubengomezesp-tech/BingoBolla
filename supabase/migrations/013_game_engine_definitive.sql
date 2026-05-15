-- ============================================================================
-- BingoBolla v13 — Game Engine Definitive
-- Algoritmos optimizados por variante + room state completo
-- ============================================================================

-- ============ STEP 1: AJUSTAR PARÁMETROS DE JUEGO POR VARIANTE ============

-- Speedy Lite: rápido, 1.5s/bola, 30s entre rondas (~75s/partida)
update rooms set
  ball_interval_ms = 1500,
  schedule_interval_seconds = 30,
  max_cards_per_player = 4
where variant = 'lite';

-- Bingo 75 (Lucky, Jackpot): velocidad media, 2.5s/bola, 45s entre rondas
update rooms set
  ball_interval_ms = 2500,
  schedule_interval_seconds = 45,
  max_cards_per_player = 6
where variant = 'bingo75';

-- Bingo 90 (London): velocidad clásica, 3s/bola, 60s entre rondas
update rooms set
  ball_interval_ms = 3000,
  schedule_interval_seconds = 60,
  max_cards_per_player = 6
where variant = 'bingo90';

-- Cinco Stars: velocidad media, 2.5s/bola, 60s entre rondas
update rooms set
  ball_interval_ms = 2500,
  schedule_interval_seconds = 60,
  max_cards_per_player = 5
where variant = 'cinco';

-- Pulse: velocidad rápida, 2s/bola, 60s entre rondas
update rooms set
  ball_interval_ms = 2000,
  schedule_interval_seconds = 60,
  max_cards_per_player = 5
where variant = 'pulse';

-- ============ STEP 2: GET_ROOM_STATE — VERSIÓN DEFINITIVA ============
-- Devuelve TODO lo necesario para hidratar el cliente en una sola query

drop function if exists get_room_state(uuid);

create or replace function get_room_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_playing games%rowtype;
  v_waiting games%rowtype;
  v_playing_balls jsonb;
  v_playing_cards jsonb;
  v_waiting_cards jsonb;
  v_chat jsonb;
  v_purchase_open boolean := false;
  v_purchase_closes_in_s numeric;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found then return jsonb_build_object('error', 'room_not_found'); end if;

  -- Playing game
  select * into v_playing from games
    where room_id = p_room_id and status = 'playing'
    order by created_at desc limit 1;

  -- Waiting game
  select * into v_waiting from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1;

  -- Balls del playing game (todas, en orden)
  if v_playing.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'ball_number', ball_number,
      'sequence', sequence
    ) order by sequence), '[]'::jsonb)
    into v_playing_balls
    from balls_called
    where game_id = v_playing.id;
  else
    v_playing_balls := '[]'::jsonb;
  end if;

  -- Cards del user en playing game
  if v_playing.id is not null and v_user_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'game_id', game_id,
      'card_data', card_data,
      'currency', currency
    )), '[]'::jsonb)
    into v_playing_cards
    from cards
    where game_id = v_playing.id and player_id = v_user_id;
  else
    v_playing_cards := '[]'::jsonb;
  end if;

  -- Cards del user en waiting game
  if v_waiting.id is not null and v_user_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'game_id', game_id,
      'card_data', card_data,
      'currency', currency
    )), '[]'::jsonb)
    into v_waiting_cards
    from cards
    where game_id = v_waiting.id and player_id = v_user_id;
  else
    v_waiting_cards := '[]'::jsonb;
  end if;

  -- Chat (últimos 80 mensajes del juego más reciente)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cm.id,
    'player_id', cm.player_id,
    'is_mc', cm.is_mc,
    'message', cm.message,
    'created_at', cm.created_at,
    'username', coalesce(p.username, 'MC')
  ) order by cm.created_at asc), '[]'::jsonb)
  into v_chat
  from chat_messages cm
  left join profiles p on p.id = cm.player_id
  where cm.game_id = coalesce(v_playing.id, v_waiting.id);

  -- Purchase window
  if v_waiting.id is not null then
    v_purchase_closes_in_s := extract(epoch from (v_waiting.starts_at - now() - interval '5 seconds'));
    v_purchase_open := v_purchase_closes_in_s > 0;
  end if;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'playing_game', case when v_playing.id is not null then jsonb_build_object(
      'id', v_playing.id,
      'pot_gold', v_playing.pot_gold,
      'pot_sweeps', v_playing.pot_sweeps,
      'line_won_by', v_playing.line_won_by,
      'two_lines_won_by', v_playing.two_lines_won_by,
      'full_house_won_by', v_playing.full_house_won_by,
      'starts_at', v_playing.starts_at,
      'balls', v_playing_balls
    ) end,
    'waiting_game', case when v_waiting.id is not null then jsonb_build_object(
      'id', v_waiting.id,
      'pot_gold', v_waiting.pot_gold,
      'pot_sweeps', v_waiting.pot_sweeps,
      'starts_at', v_waiting.starts_at
    ) end,
    'my_cards_playing', v_playing_cards,
    'my_cards_waiting', v_waiting_cards,
    'chat', v_chat,
    'purchase_open', v_purchase_open,
    'purchase_closes_in_s', coalesce(v_purchase_closes_in_s, 0)
  );
end;
$$;

grant execute on function get_room_state(uuid) to authenticated, anon;

-- ============ STEP 3: HEARTBEAT MEJORADO ============
-- Ya no solo crea waiting games, también hace tick a todos los playing

create or replace function global_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_active_game uuid;
  v_playing record;
  v_waiting record;
begin
  for v_room in select id, schedule_interval_seconds from rooms where active = true loop
    -- ¿Hay game activo?
    select id into v_active_game from games
      where room_id = v_room.id and status in ('waiting','playing')
      order by created_at desc limit 1;

    -- Si no, crear waiting
    if v_active_game is null then
      insert into games (room_id, status, starts_at, seed_hash)
      values (
        v_room.id, 'waiting',
        now() + (coalesce(v_room.schedule_interval_seconds, 60) || ' seconds')::interval,
        encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex')
      );
    end if;

    -- Tick a playing games (drop next ball si interval pasó)
    for v_playing in select id from games where room_id = v_room.id and status = 'playing' loop
      begin
        perform tick_game(v_playing.id);
      exception when others then null;
      end;
    end loop;

    -- Tick a waiting (auto-start si llegó starts_at y hay players)
    for v_waiting in select id from games where room_id = v_room.id and status = 'waiting' loop
      begin
        perform tick_waiting_game(v_waiting.id);
      exception when others then null;
      end;
    end loop;
  end loop;
end;
$$;

-- ============ STEP 4: AUTO-START AGRESIVO ============
-- Si waiting game llega a starts_at y NO hay cartones, lo dejamos pasar
-- Si tiene cartones, debe iniciar inmediatamente
create or replace function tick_waiting_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_card_count int;
  v_has_playing boolean;
  v_room rooms%rowtype;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error', 'game_not_found'); end if;
  if v_game.status != 'waiting' then return jsonb_build_object('status', v_game.status); end if;

  -- Si hay otro game playing en la sala, deferir
  select exists(
    select 1 from games
    where room_id = v_game.room_id and status = 'playing' and id != p_game_id
  ) into v_has_playing;

  if v_has_playing then
    -- Push starts_at hacia el futuro
    update games set starts_at = now() + interval '20 seconds' where id = p_game_id and starts_at < now() + interval '15 seconds';
    return jsonb_build_object('deferred_playing_active', true);
  end if;

  -- Si starts_at aún no llegó, esperar
  if v_game.starts_at > now() then
    return jsonb_build_object('waiting', true, 'starts_in_s', extract(epoch from (v_game.starts_at - now())));
  end if;

  -- starts_at pasó. ¿Hay cartones?
  select count(*) into v_card_count from cards where game_id = p_game_id;

  if v_card_count >= 1 then
    -- ¡Iniciar partida! call_next_ball cambia el status a 'playing'
    return call_next_ball(p_game_id);
  end if;

  -- Sin cartones: push starts_at 30s adelante
  select * into v_room from rooms where id = v_game.room_id;
  update games set starts_at = now() + (coalesce(v_room.schedule_interval_seconds, 30) || ' seconds')::interval
    where id = p_game_id;
  return jsonb_build_object('no_players_pushed', true);
end;
$$;

-- ============ STEP 5: VERIFICA TODO ============
select '=== ROOMS CONFIG ===' as section;
select name, variant, ball_interval_ms, schedule_interval_seconds, max_cards_per_player
  from rooms where active = true order by ticket_sweeps;

select '=== HEARTBEAT STATUS ===' as section;
select jobname, active,
  (select max(start_time) from cron.job_run_details where jobid = job.jobid) as last_run
from cron.job where jobname = 'bingobolla-heartbeat';

select '=== ACTIVE GAMES ===' as section;
select r.name, g.status, g.starts_at,
  extract(epoch from (g.starts_at - now()))::int as seg_para_empezar,
  (select count(*) from cards where game_id = g.id) as cards
from rooms r
left join lateral (
  select id, status, starts_at from games
  where room_id = r.id and status in ('waiting','playing')
  order by created_at desc limit 1
) g on true
where r.active = true
order by r.name;
