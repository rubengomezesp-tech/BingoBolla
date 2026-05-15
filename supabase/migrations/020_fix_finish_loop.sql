-- ============================================================================
-- BingoBolla v21 — FIX cuelgue al terminar + ciclo infinito + histórico
-- ============================================================================
-- BUG: call_next_ball leía v_called ANTES de insertar la bola. Al llegar a la
-- bola 90, la condición ">= max_ball" daba false (tenía 89) → se colgaba en
-- playing 90/90 sin crear el siguiente waiting.
-- ============================================================================

-- ===== STEP 0: DESATASCAR games colgados AHORA =====
do $$
declare g record; v_room rooms%rowtype; v_max int;
begin
  for g in select gm.id, gm.room_id,
      (select count(*) from balls_called where game_id=gm.id) as bolas
    from games gm where gm.status='playing'
  loop
    select * into v_room from rooms where id=g.room_id;
    v_max := case when v_room.variant='bingo90' then 90 else 75 end;
    if g.bolas >= v_max then
      update games set status='finished', ended_at=now() where id=g.id;
    end if;
  end loop;
  -- waiting fresco en cada sala que no tenga uno activo
  for g in select id, schedule_interval_seconds from rooms where active=true loop
    if not exists (select 1 from games where room_id=g.id and status in ('waiting','playing')) then
      insert into games (room_id,status,starts_at,seed_hash)
      values (g.id,'waiting',
        now()+(coalesce(g.schedule_interval_seconds,60)||' seconds')::interval,
        encode(digest(gen_random_uuid()::text||now()::text||g.id::text,'sha256'),'hex'));
    end if;
  end loop;
end $$;

-- ===== STEP 1: call_next_ball CORREGIDO =====
-- Clave: cuenta las bolas DESPUÉS de considerar la que se va a sortear,
-- y SIEMPRE crea el siguiente waiting al terminar (cualquier motivo).
create or replace function call_next_ball(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_max_ball int;
  v_next_ball int;
  v_sequence int;
  v_called int[];
  v_count int;
begin
  select * into v_game from games where id=p_game_id for update;
  if not found then return jsonb_build_object('error','game_not_found'); end if;

  select * into v_room from rooms where id=v_game.room_id;
  v_max_ball := case when v_room.variant='bingo90' then 90 else 75 end;

  -- waiting → playing
  if v_game.status='waiting' then
    if v_game.starts_at > now() then
      return jsonb_build_object('waiting',true,
        'starts_in_s',extract(epoch from (v_game.starts_at-now())));
    end if;
    if (select count(*) from cards where game_id=p_game_id)=0 then
      update games set starts_at=now()+(coalesce(v_room.schedule_interval_seconds,60)||' seconds')::interval
        where id=p_game_id;
      return jsonb_build_object('no_players',true);
    end if;
    update games set status='playing', starts_at=now() where id=p_game_id;
    v_game.status:='playing';
  end if;

  if v_game.status!='playing' then
    return jsonb_build_object('status',v_game.status);
  end if;

  select coalesce(array_agg(ball_number),'{}'::int[]), count(*)
    into v_called, v_count
    from balls_called where game_id=p_game_id;

  -- ¿Terminó? Recargar full_house_won_by (el trigger pudo cambiarlo)
  select full_house_won_by into v_game.full_house_won_by from games where id=p_game_id;

  if v_count >= v_max_ball or v_game.full_house_won_by is not null then
    update games set status='finished', ended_at=now()
      where id=p_game_id and status='playing';
    -- SIEMPRE crear el siguiente waiting (sin importar nada)
    if not exists (select 1 from games where room_id=v_room.id and status in ('waiting','playing')) then
      insert into games (room_id,status,starts_at,seed_hash)
      values (v_room.id,'waiting',
        now()+(coalesce(v_room.schedule_interval_seconds,60)||' seconds')::interval,
        encode(digest(gen_random_uuid()::text||now()::text,'sha256'),'hex'));
    end if;
    return jsonb_build_object('finished',true);
  end if;

  -- Sortear siguiente
  select n into v_next_ball
    from generate_series(1,v_max_ball) as n
    where not (n = any(v_called))
    order by random() limit 1;

  -- Seguridad: si no hay bola libre, terminar igual
  if v_next_ball is null then
    update games set status='finished', ended_at=now() where id=p_game_id;
    if not exists (select 1 from games where room_id=v_room.id and status in ('waiting','playing')) then
      insert into games (room_id,status,starts_at,seed_hash)
      values (v_room.id,'waiting',
        now()+(coalesce(v_room.schedule_interval_seconds,60)||' seconds')::interval,
        encode(digest(gen_random_uuid()::text||now()::text,'sha256'),'hex'));
    end if;
    return jsonb_build_object('finished',true,'reason','no_balls_left');
  end if;

  v_sequence := v_count + 1;
  insert into balls_called (game_id,ball_number,sequence)
  values (p_game_id,v_next_ball,v_sequence);

  -- ¿Esta bola fue la última? Cerrar inmediatamente y crear siguiente
  if v_sequence >= v_max_ball then
    update games set status='finished', ended_at=now() where id=p_game_id;
    if not exists (select 1 from games where room_id=v_room.id and status in ('waiting','playing')) then
      insert into games (room_id,status,starts_at,seed_hash)
      values (v_room.id,'waiting',
        now()+(coalesce(v_room.schedule_interval_seconds,60)||' seconds')::interval,
        encode(digest(gen_random_uuid()::text||now()::text,'sha256'),'hex'));
    end if;
  end if;

  return jsonb_build_object('ball',v_next_ball,'sequence',v_sequence,'ok',true);
end; $$;
grant execute on function call_next_ball(uuid) to authenticated, anon, service_role;

-- ===== STEP 2: RED DE SEGURIDAD en global_heartbeat =====
-- Antes de tickear, cierra cualquier playing con bolas completas y crea waiting
create or replace function global_heartbeat()
returns void language plpgsql security definer set search_path=public as $$
declare v_room record; v_g record; v_max int;
begin
  for v_room in select id, schedule_interval_seconds, variant from rooms where active=true loop
    v_max := case when v_room.variant='bingo90' then 90 else 75 end;

    -- Cerrar games playing colgados (bolas completas)
    for v_g in select id from games where room_id=v_room.id and status='playing'
      and (select count(*) from balls_called where game_id=games.id) >= v_max
    loop
      update games set status='finished', ended_at=now() where id=v_g.id;
    end loop;

    -- Garantizar un game activo (waiting o playing)
    if not exists (select 1 from games where room_id=v_room.id and status in ('waiting','playing')) then
      insert into games (room_id,status,starts_at,seed_hash)
      values (v_room.id,'waiting',
        now()+(coalesce(v_room.schedule_interval_seconds,60)||' seconds')::interval,
        encode(digest(gen_random_uuid()::text||now()::text,'sha256'),'hex'));
    end if;

    -- Tick a todos los activos
    for v_g in select id from games where room_id=v_room.id and status in ('waiting','playing') loop
      begin perform tick_game(v_g.id); exception when others then null; end;
    end loop;
  end loop;
end; $$;

-- ===== STEP 3: HISTÓRICO de premios del usuario =====
create or replace function my_prize_history()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid := auth.uid();
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'pattern', c.pattern,
    'prize_gold', c.prize_gold,
    'prize_sweeps', c.prize_sweeps,
    'claimed_at', c.claimed_at,
    'room', r.name
  ) order by c.claimed_at desc), '[]'::jsonb)
  from claims c
  join games g on g.id=c.game_id
  join rooms r on r.id=g.room_id
  where c.player_id=v_user_id and c.valid=true
  limit 50);
end; $$;
grant execute on function my_prize_history() to authenticated;

-- ===== VERIFICACIÓN =====
select '=== ESTADO FINAL ===' as t;
select r.name, g.status,
  extract(epoch from (g.starts_at-now()))::int as seg,
  (select count(*) from balls_called where game_id=g.id) as bolas
from rooms r
left join lateral (select id,status,starts_at from games
  where room_id=r.id and status in ('waiting','playing')
  order by created_at desc limit 1) g on true
where r.active=true order by r.name;
