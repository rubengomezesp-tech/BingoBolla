-- ============================================================================
-- BingoBolla v10 — Spectator Mode + 5s purchase cutoff
-- ============================================================================

-- ============ STEP 1: Reduce schedule_interval to something more reasonable ============
-- 90s between rounds is too long; tombola.es uses ~20-30s.
-- Adjust per room type
update rooms set schedule_interval_seconds = 30 where variant in ('lite');           -- speedy lite: 30s
update rooms set schedule_interval_seconds = 45 where variant = 'bingo75';           -- 75: 45s
update rooms set schedule_interval_seconds = 60 where variant in ('bingo90', 'pulse', 'cinco');  -- 90/pulse/cinco: 60s

-- ============ STEP 2: buy_ticket with 5s cutoff ============
create or replace function buy_ticket(
  p_room_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_game games%rowtype;
  v_profile profiles%rowtype;
  v_limits rg_limits%rowtype;
  v_spend_24h record;
  v_spend_7d record;
  v_price numeric;
  v_balance numeric;
  v_card_count int;
  v_new_card_id uuid;
  v_card_data jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile.banned then raise exception 'account_banned'; end if;
  if exists (select 1 from self_exclusions where player_id = v_user_id and active = true) then
    raise exception 'self_excluded';
  end if;

  if p_currency = 'sweeps' then
    if v_profile.kyc_status not in ('self_declared','verified') then raise exception 'kyc_required'; end if;
    if v_profile.state is null then raise exception 'state_required'; end if;
    if is_state_excluded(v_profile.state) then raise exception 'state_excluded'; end if;
  end if;

  select * into v_room from rooms where id = p_room_id and active = true for update;
  if not found then raise exception 'room_not_found'; end if;

  -- Find waiting game (the one we'll join). Always buys for next round, never for playing.
  select * into v_game from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1 for update;

  if not found then
    -- Create a new waiting game. Starts in schedule_interval_seconds from now.
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting',
            now() + (v_room.schedule_interval_seconds || ' seconds')::interval,
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
  end if;

  -- ⏰ 5-SECOND CUTOFF: reject if game is about to start
  if v_game.starts_at <= now() + interval '5 seconds' then
    raise exception 'purchase_window_closed';
  end if;

  if p_currency = 'gold' then v_price := v_room.ticket_gold;
  elsif p_currency = 'sweeps' then v_price := v_room.ticket_sweeps;
  else raise exception 'invalid_currency'; end if;

  -- RG limits (sweeps only)
  if p_currency = 'sweeps' then
    select * into v_limits from rg_limits where player_id = v_user_id;
    if v_limits is not null then
      if v_limits.daily_wager_limit is not null then
        select * into v_spend_24h from player_spend_24h where player_id = v_user_id;
        if (coalesce(v_spend_24h.wagered_sweeps_24h, 0) + v_price) > v_limits.daily_wager_limit then
          raise exception 'daily_wager_limit_reached';
        end if;
      end if;
      if v_limits.weekly_wager_limit is not null then
        select * into v_spend_7d from player_spend_7d where player_id = v_user_id;
        if (coalesce(v_spend_7d.wagered_sweeps_7d, 0) + v_price) > v_limits.weekly_wager_limit then
          raise exception 'weekly_wager_limit_reached';
        end if;
      end if;
    end if;
  end if;

  select count(*) into v_card_count from cards
    where game_id = v_game.id and player_id = v_user_id;
  if v_card_count >= v_room.max_cards_per_player then
    raise exception 'max_cards_reached';
  end if;

  if p_currency = 'gold' then
    update profiles set gold_coins = gold_coins - v_price::bigint
      where id = v_user_id and gold_coins >= v_price::bigint
      returning gold_coins into v_balance;
  else
    update profiles set sweeps_coins = sweeps_coins - v_price
      where id = v_user_id and sweeps_coins >= v_price
      returning sweeps_coins into v_balance;
  end if;
  if v_balance is null then raise exception 'insufficient_funds'; end if;

  insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
  values (v_user_id, p_currency, -v_price, v_balance, 'ticket', v_game.id);

  if v_room.variant = 'bingo90' then
    v_card_data := generate_bingo90_card();
  else
    v_card_data := generate_bingo75_card();
  end if;

  insert into cards (game_id, player_id, card_data, currency, price)
  values (v_game.id, v_user_id, v_card_data, p_currency, v_price)
  returning id into v_new_card_id;

  if p_currency = 'gold' then
    update games set pot_gold = pot_gold + v_price::bigint where id = v_game.id;
  else
    update games set pot_sweeps = pot_sweeps + v_price where id = v_game.id;
  end if;

  return jsonb_build_object(
    'game_id', v_game.id,
    'game_starts_at', v_game.starts_at,
    'card_id', v_new_card_id,
    'card_data', v_card_data,
    'variant', v_room.variant,
    'new_balance', v_balance
  );
end;
$$;
grant execute on function buy_ticket(uuid, text) to authenticated;

-- ============ STEP 3: buy_strip with 5s cutoff ============
create or replace function buy_strip(
  p_room_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_game games%rowtype;
  v_profile profiles%rowtype;
  v_unit_price numeric;
  v_total_price numeric;
  v_strip_discount numeric := 0.15;
  v_balance numeric;
  v_card_count int;
  v_new_cards uuid[];
  v_new_card_id uuid;
  v_card_data jsonb;
  v_cards_data jsonb := '[]'::jsonb;
  i int;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile.banned then raise exception 'account_banned'; end if;
  if exists (select 1 from self_exclusions where player_id = v_user_id and active = true) then
    raise exception 'self_excluded';
  end if;

  if p_currency = 'sweeps' then
    if v_profile.kyc_status not in ('self_declared','verified') then raise exception 'kyc_required'; end if;
    if v_profile.state is null then raise exception 'state_required'; end if;
    if is_state_excluded(v_profile.state) then raise exception 'state_excluded'; end if;
  end if;

  select * into v_room from rooms where id = p_room_id and active = true for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.variant != 'bingo90' then raise exception 'strips_only_for_bingo90'; end if;

  select * into v_game from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1 for update;
  if not found then
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting',
            now() + (v_room.schedule_interval_seconds || ' seconds')::interval,
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
  end if;

  -- ⏰ 5-second cutoff
  if v_game.starts_at <= now() + interval '5 seconds' then
    raise exception 'purchase_window_closed';
  end if;

  v_unit_price := case when p_currency = 'gold' then v_room.ticket_gold else v_room.ticket_sweeps end;
  v_total_price := v_unit_price * 6 * (1 - v_strip_discount);

  select count(*) into v_card_count from cards
    where game_id = v_game.id and player_id = v_user_id;
  if (v_card_count + 6) > v_room.max_cards_per_player then
    raise exception 'max_cards_reached';
  end if;

  if p_currency = 'gold' then
    update profiles set gold_coins = gold_coins - v_total_price::bigint
      where id = v_user_id and gold_coins >= v_total_price::bigint
      returning gold_coins into v_balance;
  else
    update profiles set sweeps_coins = sweeps_coins - v_total_price
      where id = v_user_id and sweeps_coins >= v_total_price
      returning sweeps_coins into v_balance;
  end if;
  if v_balance is null then raise exception 'insufficient_funds'; end if;

  insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
  values (v_user_id, p_currency, -v_total_price, v_balance, 'strip', v_game.id);

  for i in 1..6 loop
    v_card_data := generate_bingo90_card();
    insert into cards (game_id, player_id, card_data, currency, price, is_strip_card)
      values (v_game.id, v_user_id, v_card_data, p_currency, v_unit_price * (1 - v_strip_discount), true)
      returning id into v_new_card_id;
    v_new_cards := array_append(v_new_cards, v_new_card_id);
    v_cards_data := v_cards_data || jsonb_build_object('id', v_new_card_id, 'data', v_card_data);
  end loop;

  if p_currency = 'gold' then
    update games set pot_gold = pot_gold + v_total_price::bigint where id = v_game.id;
  else
    update games set pot_sweeps = pot_sweeps + v_total_price where id = v_game.id;
  end if;

  return jsonb_build_object(
    'game_id', v_game.id,
    'game_starts_at', v_game.starts_at,
    'card_ids', v_new_cards,
    'cards', v_cards_data,
    'total_price', v_total_price,
    'discount', v_strip_discount,
    'new_balance', v_balance
  );
end;
$$;
grant execute on function buy_strip(uuid, text) to authenticated;

-- ============ STEP 4: tick_waiting_game defers if playing exists ============
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

  -- Defer if another game in this room is currently playing
  select exists(
    select 1 from games
    where room_id = v_game.room_id and status = 'playing' and id != p_game_id
  ) into v_has_playing;

  if v_has_playing then
    select * into v_room from rooms where id = v_game.room_id;
    -- Push starts_at forward to keep this game in waiting
    update games set starts_at = greatest(starts_at, now() + interval '20 seconds') where id = p_game_id;
    return jsonb_build_object('deferred_playing_active', true);
  end if;

  if v_game.starts_at > now() then return jsonb_build_object('waiting', true, 'starts_in_s', extract(epoch from (v_game.starts_at - now()))); end if;

  select count(*) into v_card_count from cards where game_id = p_game_id;
  if v_card_count >= 1 then
    return call_next_ball(p_game_id);
  end if;

  update games set starts_at = now() + interval '30 seconds' where id = p_game_id;
  return jsonb_build_object('no_players', true);
end;
$$;
grant execute on function tick_waiting_game(uuid) to authenticated, anon;

-- ============ STEP 5: Get room state — returns BOTH games ============
-- Used by frontend to render spectator mode + queue
create or replace function get_room_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_playing games%rowtype;
  v_waiting games%rowtype;
  v_my_cards_playing int;
  v_my_cards_waiting int;
  v_user_id uuid := auth.uid();
  v_balls_count int := 0;
  v_purchase_open boolean := true;
  v_purchase_closes_in_s numeric;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found then return jsonb_build_object('error', 'room_not_found'); end if;

  -- Get playing game (most recent if multiple — should only be one)
  select * into v_playing from games
    where room_id = p_room_id and status = 'playing'
    order by started_at desc limit 1;

  if v_playing.id is not null then
    select count(*) into v_balls_count from balls_called where game_id = v_playing.id;
  end if;

  -- Get next waiting game
  select * into v_waiting from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1;

  -- Check if purchase window is open
  if v_waiting.id is not null then
    v_purchase_closes_in_s := extract(epoch from (v_waiting.starts_at - now() - interval '5 seconds'));
    v_purchase_open := v_purchase_closes_in_s > 0;
  end if;

  -- User's cards
  if v_user_id is not null then
    if v_playing.id is not null then
      select count(*) into v_my_cards_playing from cards
        where game_id = v_playing.id and player_id = v_user_id;
    end if;
    if v_waiting.id is not null then
      select count(*) into v_my_cards_waiting from cards
        where game_id = v_waiting.id and player_id = v_user_id;
    end if;
  end if;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'playing_game', case when v_playing.id is not null then jsonb_build_object(
      'id', v_playing.id,
      'pot_gold', v_playing.pot_gold,
      'pot_sweeps', v_playing.pot_sweeps,
      'balls_count', v_balls_count,
      'line_won_by', v_playing.line_won_by,
      'two_lines_won_by', v_playing.two_lines_won_by,
      'full_house_won_by', v_playing.full_house_won_by,
      'started_at', v_playing.started_at
    ) end,
    'waiting_game', case when v_waiting.id is not null then jsonb_build_object(
      'id', v_waiting.id,
      'pot_gold', v_waiting.pot_gold,
      'pot_sweeps', v_waiting.pot_sweeps,
      'starts_at', v_waiting.starts_at
    ) end,
    'my_cards_playing', coalesce(v_my_cards_playing, 0),
    'my_cards_waiting', coalesce(v_my_cards_waiting, 0),
    'purchase_open', v_purchase_open,
    'purchase_closes_in_s', coalesce(v_purchase_closes_in_s, 0)
  );
end;
$$;
grant execute on function get_room_state(uuid) to authenticated, anon;
