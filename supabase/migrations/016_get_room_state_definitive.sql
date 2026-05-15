-- ============================================================================
-- BingoBolla v17 — get_room_state DEFINITIVO
-- El parche viejo devolvía valores HARDCODEADOS (purchase_open=false siempre,
-- my_cards=[] siempre, playing_game={} en vez de null). Esto lo arregla.
-- ============================================================================

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
  v_purchase_closes_in_s numeric := 0;
  v_secs_to_start numeric;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found then return jsonb_build_object('error','room_not_found'); end if;

  -- Playing game (el más reciente realmente en juego)
  select * into v_playing from games
    where room_id = p_room_id and status = 'playing'
    order by created_at desc limit 1;

  -- Waiting game (el próximo a empezar)
  select * into v_waiting from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1;

  -- Bolas del playing game (en orden de sequence)
  if v_playing.id is not null then
    select coalesce(jsonb_agg(
      jsonb_build_object('ball_number', ball_number, 'sequence', sequence)
      order by sequence
    ), '[]'::jsonb)
    into v_playing_balls
    from balls_called where game_id = v_playing.id;
  else
    v_playing_balls := '[]'::jsonb;
  end if;

  -- Cartones del usuario en el playing game
  if v_playing.id is not null and v_user_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'game_id', game_id, 'card_data', card_data, 'currency', currency
    )), '[]'::jsonb)
    into v_playing_cards
    from cards where game_id = v_playing.id and player_id = v_user_id;
  else
    v_playing_cards := '[]'::jsonb;
  end if;

  -- Cartones del usuario en el waiting game
  if v_waiting.id is not null and v_user_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'game_id', game_id, 'card_data', card_data, 'currency', currency
    )), '[]'::jsonb)
    into v_waiting_cards
    from cards where game_id = v_waiting.id and player_id = v_user_id;
  else
    v_waiting_cards := '[]'::jsonb;
  end if;

  -- Chat (últimos 80 del game activo)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cm.id, 'player_id', cm.player_id, 'is_mc', cm.is_mc,
    'message', cm.message, 'created_at', cm.created_at,
    'username', coalesce(p.username, 'MC')
  ) order by cm.created_at asc), '[]'::jsonb)
  into v_chat
  from chat_messages cm
  left join profiles p on p.id = cm.player_id
  where cm.game_id = coalesce(v_playing.id, v_waiting.id);

  -- ========= VENTANA DE COMPRA (el cálculo que faltaba) =========
  -- Puedes comprar si hay waiting game y faltan MÁS de 5s para empezar
  if v_waiting.id is not null then
    v_secs_to_start := extract(epoch from (v_waiting.starts_at - now()));
    v_purchase_closes_in_s := greatest(0, v_secs_to_start - 5);
    v_purchase_open := v_secs_to_start > 5;
  end if;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    -- playing_game = NULL si no hay (NO {} — eso confundía al cliente)
    'playing_game', case when v_playing.id is not null then jsonb_build_object(
      'id', v_playing.id,
      'pot_gold', v_playing.pot_gold,
      'pot_sweeps', v_playing.pot_sweeps,
      'line_won_by', v_playing.line_won_by,
      'two_lines_won_by', v_playing.two_lines_won_by,
      'full_house_won_by', v_playing.full_house_won_by,
      'starts_at', v_playing.starts_at,
      'balls', v_playing_balls
    ) else null end,
    'waiting_game', case when v_waiting.id is not null then jsonb_build_object(
      'id', v_waiting.id,
      'pot_gold', v_waiting.pot_gold,
      'pot_sweeps', v_waiting.pot_sweeps,
      'starts_at', v_waiting.starts_at
    ) else null end,
    'my_cards_playing', v_playing_cards,
    'my_cards_waiting', v_waiting_cards,
    'chat', v_chat,
    'purchase_open', v_purchase_open,
    'purchase_closes_in_s', round(v_purchase_closes_in_s)
  );
end;
$$;

grant execute on function get_room_state(uuid) to authenticated, anon;

-- ============ Limpieza + waiting games frescos ============
update games set status = 'finished'
where status in ('waiting','playing')
  and id not in (
    select distinct on (room_id) id from games
    where status in ('waiting','playing')
    order by room_id, created_at desc
  );

-- Asegura un waiting fresco en cada sala (con margen para comprar)
do $$
declare r record; v_active uuid;
begin
  for r in select id, schedule_interval_seconds from rooms where active = true loop
    select id into v_active from games
      where room_id = r.id and status in ('waiting','playing')
      order by created_at desc limit 1;
    if v_active is null then
      insert into games (room_id, status, starts_at, seed_hash)
      values (r.id, 'waiting',
        now() + (greatest(coalesce(r.schedule_interval_seconds,60), 45) || ' seconds')::interval,
        encode(digest(gen_random_uuid()::text || now()::text || r.id::text,'sha256'),'hex'));
    end if;
  end loop;
end $$;

-- ============ VERIFICACIÓN ============
select '=== get_room_state Speedy Lite ===' as seccion;
select jsonb_pretty(get_room_state((select id from rooms where name='Speedy Lite' limit 1)));

select '=== ESTADO SALAS ===' as seccion;
select r.name, r.ball_interval_ms as ball_ms, r.schedule_interval_seconds as sched_s,
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
