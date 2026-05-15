-- ============================================================================
-- BingoBolla v7 — Tombola Edition: Bingo 90 + Doble Línea + Tiras
-- ============================================================================

-- ============ STEP 1: PATTERNS UPDATE ============
-- Enable two_lines pattern in all 90 rooms
update rooms set
  patterns_enabled = array['line','two_lines','full_house'],
  pattern_rewards = '{"line": 0.15, "two_lines": 0.25, "full_house": 0.60}'::jsonb
where variant = 'bingo90';

-- Keep 75 with just line + full_house
update rooms set
  patterns_enabled = array['line','full_house'],
  pattern_rewards = '{"line": 0.30, "full_house": 0.70}'::jsonb
where variant in ('bingo75', 'lite', 'cinco', 'pulse');

-- ============ STEP 2: PROPER BINGO 90 GENERATOR ============
-- 3 rows × 9 cols, exactly 15 numbers (5 per row, 1-3 per column)
-- Column ranges: col 1 = 1-9, col 2 = 10-19, ..., col 9 = 80-90
-- Numbers within a column sorted ascending top to bottom

create or replace function generate_bingo90_card()
returns jsonb
language plpgsql
volatile
as $$
declare
  card jsonb := '[[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]'::jsonb;
  col_distribution int[] := array[2,2,2,2,2,2,1,1,1];  -- sums to 15, will shuffle
  rows_remaining int[] := array[5,5,5];
  c int;
  i int;
  picks_count int;
  pool_lo int;
  pool_hi int;
  picks int[];
  chosen_rows int[];
  available_rows int[];
  attempts int := 0;
begin
  -- Shuffle column distribution
  select array_agg(n order by random()) into col_distribution from unnest(col_distribution) n;

  -- For each column, assign picks_count numbers to picks_count rows
  for c in 1..9 loop
    picks_count := col_distribution[c];

    -- Find rows that still have space, prefer those with most space (balanced)
    select array_agg(r order by rows_remaining[r] desc, random())
      into available_rows
      from generate_series(1,3) r
      where rows_remaining[r] > 0;

    if array_length(available_rows, 1) < picks_count then
      -- Edge case: not enough rows available. Adjust to what's possible.
      picks_count := array_length(available_rows, 1);
    end if;

    -- Take first picks_count rows, sorted ascending so numbers go top→bottom in column
    chosen_rows := (select array_agg(r order by r) from unnest(available_rows[1:picks_count]) r);

    -- Pick numbers from column range
    pool_lo := case when c = 1 then 1 else (c-1)*10 end;
    pool_hi := case when c = 9 then 90 else c*10 - 1 end;

    select array_agg(n order by n) into picks
      from (
        select n from generate_series(pool_lo, pool_hi) n order by random() limit picks_count
      ) y;

    -- Assign to card, sorted top-to-bottom
    for i in 1..picks_count loop
      card := jsonb_set(card, array[(chosen_rows[i]-1)::text, (c-1)::text], to_jsonb(picks[i]));
      rows_remaining[chosen_rows[i]] := rows_remaining[chosen_rows[i]] - 1;
    end loop;
  end loop;

  return card;
end;
$$;

-- ============ STEP 3: UPDATE buy_ticket TO ROUTE BY VARIANT ============
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
    if v_profile.kyc_status not in ('self_declared','verified') then
      raise exception 'kyc_required';
    end if;
    if v_profile.state is null then raise exception 'state_required'; end if;
    if is_state_excluded(v_profile.state) then raise exception 'state_excluded'; end if;
  end if;

  select * into v_room from rooms where id = p_room_id and active = true for update;
  if not found then raise exception 'room_not_found'; end if;

  select * into v_game from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1 for update;
  if not found then
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting', now() + interval '30 seconds',
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
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

  -- Generate card based on room variant
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
    'card_id', v_new_card_id,
    'card_data', v_card_data,
    'variant', v_room.variant,
    'new_balance', v_balance
  );
end;
$$;
grant execute on function buy_ticket(uuid, text) to authenticated;

-- ============ STEP 4: STRIP PURCHASE (TIRAS) ============
-- Buy 6 cards at once at 15% discount, all in same game

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
  v_limits rg_limits%rowtype;
  v_spend_24h record;
  v_unit_price numeric;
  v_total_price numeric;
  v_strip_discount numeric := 0.15;  -- 15% off when buying 6 at once
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

  -- Strips only for Bingo 90 (tombola tradition)
  if v_room.variant != 'bingo90' then raise exception 'strips_only_for_bingo90'; end if;

  select * into v_game from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1 for update;
  if not found then
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting', now() + interval '30 seconds',
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
  end if;

  v_unit_price := case when p_currency = 'gold' then v_room.ticket_gold else v_room.ticket_sweeps end;
  v_total_price := v_unit_price * 6 * (1 - v_strip_discount);  -- 6 cards with discount

  -- Check max cards limit
  select count(*) into v_card_count from cards
    where game_id = v_game.id and player_id = v_user_id;
  if (v_card_count + 6) > v_room.max_cards_per_player then
    raise exception 'max_cards_reached';
  end if;

  -- RG wager limit
  if p_currency = 'sweeps' then
    select * into v_limits from rg_limits where player_id = v_user_id;
    if v_limits is not null and v_limits.daily_wager_limit is not null then
      select * into v_spend_24h from player_spend_24h where player_id = v_user_id;
      if (coalesce(v_spend_24h.wagered_sweeps_24h, 0) + v_total_price) > v_limits.daily_wager_limit then
        raise exception 'daily_wager_limit_reached';
      end if;
    end if;
  end if;

  -- Deduct balance
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

  -- Create 6 cards
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
    'card_ids', v_new_cards,
    'cards', v_cards_data,
    'total_price', v_total_price,
    'unit_price', v_unit_price * (1 - v_strip_discount),
    'discount', v_strip_discount,
    'new_balance', v_balance
  );
end;
$$;
grant execute on function buy_strip(uuid, text) to authenticated;

-- Add is_strip_card column to cards (idempotent)
alter table cards add column if not exists is_strip_card boolean default false;

-- ============ STEP 5: AUTO_CLAIM WITH TWO_LINES ============
create or replace function auto_claim_wins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_called int[];
  v_card cards%rowtype;
  v_check jsonb;
  v_player_pool_gold bigint;
  v_player_pool_sweeps numeric;
  v_prize_gold bigint;
  v_prize_sweeps numeric;
  v_new_balance numeric;
  v_pct numeric;
begin
  select * into v_game from games where id = new.game_id for update;
  if v_game.status != 'playing' then return new; end if;

  select * into v_room from rooms where id = v_game.room_id;
  if not v_room.auto_claim then return new; end if;

  select array_agg(ball_number) into v_called from balls_called where game_id = new.game_id;

  v_player_pool_gold := ((coalesce(v_room.rollover_gold, 0) + v_game.pot_gold) * v_room.rtp)::bigint;
  v_player_pool_sweeps := (coalesce(v_room.rollover_sweeps, 0) + v_game.pot_sweeps) * v_room.rtp;

  for v_card in select * from cards where game_id = new.game_id loop
    v_check := check_card_patterns(v_card.card_data, v_called, v_room.variant);

    -- LINE
    if (v_check->>'line')::boolean and v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.15);
      v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
      v_prize_sweeps := v_player_pool_sweeps * v_pct;

      update games set line_won_by = v_card.player_id, line_won_at = now()
        where id = v_game.id and line_won_by is null
        returning * into v_game;

      if v_game.line_won_by = v_card.player_id then
        insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
          values (v_game.id, v_card.id, v_card.player_id, 'line', true, v_prize_gold, v_prize_sweeps);

        if v_prize_gold > 0 then
          update profiles set gold_coins = gold_coins + v_prize_gold where id = v_card.player_id
            returning gold_coins into v_new_balance;
          insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
            values (v_card.player_id, 'gold', v_prize_gold, v_new_balance, 'win_line', v_game.id);
        end if;
        if v_prize_sweeps > 0 then
          update profiles set
            sweeps_coins = sweeps_coins + v_prize_sweeps,
            total_won_sweeps = total_won_sweeps + v_prize_sweeps
            where id = v_card.player_id returning sweeps_coins into v_new_balance;
          insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
            values (v_card.player_id, 'sweeps', v_prize_sweeps, v_new_balance, 'win_line', v_game.id);
        end if;

        update player_stats set
          total_wins = total_wins + 1, lines_won = lines_won + 1,
          total_gold_won = total_gold_won + v_prize_gold,
          total_sweeps_won = total_sweeps_won + v_prize_sweeps,
          current_streak = current_streak + 1,
          best_streak = greatest(best_streak, current_streak + 1),
          last_played = now(), updated_at = now()
          where player_id = v_card.player_id;
      end if;
    end if;

    -- TWO LINES (bingo 90)
    if (v_check->>'two_lines')::boolean and v_game.two_lines_won_by is null and 'two_lines' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'two_lines')::numeric, 0.25);
      v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
      v_prize_sweeps := v_player_pool_sweeps * v_pct;

      update games set two_lines_won_by = v_card.player_id, two_lines_won_at = now()
        where id = v_game.id and two_lines_won_by is null
        returning * into v_game;

      if v_game.two_lines_won_by = v_card.player_id then
        insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
          values (v_game.id, v_card.id, v_card.player_id, 'two_lines', true, v_prize_gold, v_prize_sweeps);

        if v_prize_gold > 0 then
          update profiles set gold_coins = gold_coins + v_prize_gold where id = v_card.player_id
            returning gold_coins into v_new_balance;
          insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
            values (v_card.player_id, 'gold', v_prize_gold, v_new_balance, 'win_two_lines', v_game.id);
        end if;
        if v_prize_sweeps > 0 then
          update profiles set
            sweeps_coins = sweeps_coins + v_prize_sweeps,
            total_won_sweeps = total_won_sweeps + v_prize_sweeps
            where id = v_card.player_id returning sweeps_coins into v_new_balance;
          insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
            values (v_card.player_id, 'sweeps', v_prize_sweeps, v_new_balance, 'win_two_lines', v_game.id);
        end if;

        update player_stats set
          total_wins = total_wins + 1, two_lines_won = two_lines_won + 1,
          total_gold_won = total_gold_won + v_prize_gold,
          total_sweeps_won = total_sweeps_won + v_prize_sweeps,
          last_played = now(), updated_at = now()
          where player_id = v_card.player_id;
      end if;
    end if;

    -- FULL HOUSE
    if (v_check->>'full_house')::boolean and v_game.full_house_won_by is null and 'full_house' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.60);
      v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
      v_prize_sweeps := v_player_pool_sweeps * v_pct;

      update games set
        full_house_won_by = v_card.player_id, full_house_won_at = now(),
        status = 'finished', ended_at = now()
        where id = v_game.id and full_house_won_by is null
        returning * into v_game;

      if v_game.full_house_won_by = v_card.player_id then
        insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
          values (v_game.id, v_card.id, v_card.player_id, 'full_house', true, v_prize_gold, v_prize_sweeps);

        if v_prize_gold > 0 then
          update profiles set gold_coins = gold_coins + v_prize_gold where id = v_card.player_id
            returning gold_coins into v_new_balance;
          insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
            values (v_card.player_id, 'gold', v_prize_gold, v_new_balance, 'win_full_house', v_game.id);
        end if;
        if v_prize_sweeps > 0 then
          update profiles set
            sweeps_coins = sweeps_coins + v_prize_sweeps,
            total_won_sweeps = total_won_sweeps + v_prize_sweeps
            where id = v_card.player_id returning sweeps_coins into v_new_balance;
          insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
            values (v_card.player_id, 'sweeps', v_prize_sweeps, v_new_balance, 'win_full_house', v_game.id);
        end if;

        update player_stats set
          total_wins = total_wins + 1, full_houses_won = full_houses_won + 1,
          total_gold_won = total_gold_won + v_prize_gold,
          total_sweeps_won = total_sweeps_won + v_prize_sweeps,
          current_streak = current_streak + 1,
          best_streak = greatest(best_streak, current_streak + 1),
          last_played = now(), updated_at = now()
          where player_id = v_card.player_id;
      end if;
    end if;
  end loop;

  -- Settlement on finish
  if v_game.status = 'finished' then
    declare
      v_line_pct numeric := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.15);
      v_2l_pct numeric := coalesce((v_room.pattern_rewards->>'two_lines')::numeric, 0.25);
      v_fh_pct numeric := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.60);
      v_unpaid_pct numeric := 0;
      v_house_gold bigint;
      v_house_sweeps numeric;
      v_new_rollover_gold bigint := 0;
      v_new_rollover_sweeps numeric := 0;
    begin
      if v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then v_unpaid_pct := v_unpaid_pct + v_line_pct; end if;
      if v_game.two_lines_won_by is null and 'two_lines' = any(v_room.patterns_enabled) then v_unpaid_pct := v_unpaid_pct + v_2l_pct; end if;
      if v_game.full_house_won_by is null then v_unpaid_pct := v_unpaid_pct + v_fh_pct; end if;

      v_new_rollover_gold := (v_player_pool_gold * v_unpaid_pct)::bigint;
      v_new_rollover_sweeps := v_player_pool_sweeps * v_unpaid_pct;

      v_house_gold := ((coalesce(v_room.rollover_gold,0) + v_game.pot_gold) - v_player_pool_gold)::bigint;
      v_house_sweeps := (coalesce(v_room.rollover_sweeps,0) + v_game.pot_sweeps) - v_player_pool_sweeps;

      update rooms set
        rollover_gold = v_new_rollover_gold,
        rollover_sweeps = v_new_rollover_sweeps,
        house_take_gold = house_take_gold + v_house_gold,
        house_take_sweeps = house_take_sweeps + v_house_sweeps
        where id = v_room.id;

      update games set next_round_starts_at = now() + (v_room.schedule_interval_seconds || ' seconds')::interval
        where id = v_game.id;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_claim on balls_called;
create trigger trg_auto_claim
  after insert on balls_called
  for each row execute function auto_claim_wins();

-- Verify
select '=== Pattern config ===' as section;
select name, variant, rtp, patterns_enabled, pattern_rewards from rooms order by name;
