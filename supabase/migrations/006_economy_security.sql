-- ============================================================================
-- BingoBolla v6 — Security fixes + Prize economy with RTP + Rollover
-- Apply via Supabase SQL Editor
-- ============================================================================

-- ============ FIX SECURITY DEFINER VIEW (Supabase advisor critical) ============
-- The original rooms_live view ran with creator's permissions (postgres),
-- bypassing RLS. Recreate with security_invoker so it uses caller's permissions.
drop view if exists rooms_live;

create view rooms_live with (security_invoker = true) as
  select
    r.*,
    g.id as current_game_id,
    g.status as game_status,
    g.pot_gold,
    g.pot_sweeps,
    g.starts_at as current_game_starts_at,
    (r.rollover_gold + coalesce(g.pot_gold, 0)) as effective_pot_gold,
    (r.rollover_sweeps + coalesce(g.pot_sweeps, 0)) as effective_pot_sweeps,
    (select count(*) from cards c where c.game_id = g.id) as cards_in_play,
    (select count(distinct c.player_id) from cards c where c.game_id = g.id) as players_in_play
  from rooms r
  left join lateral (
    select * from games where room_id = r.id and status in ('waiting','playing')
    order by created_at desc limit 1
  ) g on true
  where r.active = true;

grant select on rooms_live to anon, authenticated;

-- Note: this view will fail until rollover columns exist (added below). Re-run after.

-- ============ EXTEND ROOMS WITH ECONOMY FIELDS ============
alter table rooms
  add column if not exists rtp numeric(4,3) default 0.850 check (rtp between 0.500 and 1.000),
  add column if not exists rollover_gold bigint default 0 check (rollover_gold >= 0),
  add column if not exists rollover_sweeps numeric(12,2) default 0 check (rollover_sweeps >= 0),
  add column if not exists min_players_for_sweeps int default 2,
  add column if not exists house_take_gold bigint default 0,
  add column if not exists house_take_sweeps numeric(12,2) default 0;

-- Re-create the view now that rollover columns exist
drop view if exists rooms_live;
create view rooms_live with (security_invoker = true) as
  select
    r.*,
    g.id as current_game_id,
    g.status as game_status,
    g.pot_gold,
    g.pot_sweeps,
    g.starts_at as current_game_starts_at,
    (r.rollover_gold + coalesce(g.pot_gold, 0)) as effective_pot_gold,
    (r.rollover_sweeps + coalesce(g.pot_sweeps, 0)) as effective_pot_sweeps,
    (select count(*) from cards c where c.game_id = g.id) as cards_in_play,
    (select count(distinct c.player_id) from cards c where c.game_id = g.id) as players_in_play
  from rooms r
  left join lateral (
    select * from games where room_id = r.id and status in ('waiting','playing')
    order by created_at desc limit 1
  ) g on true
  where r.active = true;
grant select on rooms_live to anon, authenticated;

-- ============ CLEANUP OLD GHOST GAMES (caller bug residual) ============
delete from games
where status = 'waiting'
  and created_at < now() - interval '5 minutes'
  and id not in (select distinct game_id from cards);

-- ============ NEW PRIZE COMPUTATION WITH RTP ============
-- Replace auto_claim_wins to apply RTP and accumulate rollovers properly

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

  -- Effective pot = room rollover + this game's pot (rollover gets consumed when game finishes)
  -- player_pool = effective_pot × rtp
  v_player_pool_gold := ((coalesce(v_room.rollover_gold, 0) + v_game.pot_gold) * v_room.rtp)::bigint;
  v_player_pool_sweeps := (coalesce(v_room.rollover_sweeps, 0) + v_game.pot_sweeps) * v_room.rtp;

  for v_card in select * from cards where game_id = new.game_id loop
    v_check := check_card_patterns(v_card.card_data, v_called, v_room.variant);

    -- LINE
    if (v_check->>'line')::boolean and v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.30);
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
          total_wins = total_wins + 1,
          lines_won = lines_won + 1,
          total_gold_won = total_gold_won + v_prize_gold,
          total_sweeps_won = total_sweeps_won + v_prize_sweeps,
          current_streak = current_streak + 1,
          best_streak = greatest(best_streak, current_streak + 1),
          last_played = now(),
          updated_at = now()
          where player_id = v_card.player_id;
      end if;
    end if;

    -- FULL HOUSE
    if (v_check->>'full_house')::boolean and v_game.full_house_won_by is null and 'full_house' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.70);
      v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
      v_prize_sweeps := v_player_pool_sweeps * v_pct;

      update games set
        full_house_won_by = v_card.player_id,
        full_house_won_at = now(),
        status = 'finished',
        ended_at = now()
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
          total_wins = total_wins + 1,
          full_houses_won = full_houses_won + 1,
          total_gold_won = total_gold_won + v_prize_gold,
          total_sweeps_won = total_sweeps_won + v_prize_sweeps,
          current_streak = current_streak + 1,
          best_streak = greatest(best_streak, current_streak + 1),
          last_played = now(),
          updated_at = now()
          where player_id = v_card.player_id;
      end if;
    end if;
  end loop;

  -- When game finishes: settle rollover + house take
  if v_game.status = 'finished' then
    declare
      v_line_pct numeric := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.30);
      v_fh_pct numeric := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.70);
      v_unpaid_pct numeric := 0;
      v_house_gold bigint;
      v_house_sweeps numeric;
      v_rollover_gold bigint := 0;
      v_rollover_sweeps numeric := 0;
    begin
      -- Calculate unpaid prize portions → these stay in player pool (rollover)
      if v_game.line_won_by is null then
        v_unpaid_pct := v_unpaid_pct + v_line_pct;
      end if;
      if v_game.full_house_won_by is null then
        v_unpaid_pct := v_unpaid_pct + v_fh_pct;
      end if;

      v_rollover_gold := (v_player_pool_gold * v_unpaid_pct)::bigint;
      v_rollover_sweeps := v_player_pool_sweeps * v_unpaid_pct;

      -- House take is the (1 - rtp) portion always
      v_house_gold := ((coalesce(v_room.rollover_gold,0) + v_game.pot_gold) - v_player_pool_gold)::bigint;
      v_house_sweeps := (coalesce(v_room.rollover_sweeps,0) + v_game.pot_sweeps) - v_player_pool_sweeps;

      update rooms set
        rollover_gold = v_rollover_gold,
        rollover_sweeps = v_rollover_sweeps,
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

-- ============ TRACK HOUSE TAKE TRANSACTIONS ============
create table if not exists house_ledger (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games,
  room_id uuid references rooms,
  gold_taken bigint default 0,
  sweeps_taken numeric(12,2) default 0,
  rtp_applied numeric(4,3),
  created_at timestamptz default now()
);

-- ============ UPDATE PATTERN_REWARDS DEFAULTS TO RATIONAL VALUES ============
-- line=30%, full_house=70% of PLAYER POOL (not raw pot)
update rooms set
  pattern_rewards = '{"line": 0.30, "full_house": 0.70}'::jsonb,
  rtp = 0.850  -- 85% RTP — industry standard
where rtp is null or pattern_rewards = '{"line": 0.20, "full_house": 0.70}'::jsonb
   or pattern_rewards = '{"line":0.2,"two_lines":0.3,"full_house":0.5}'::jsonb;

-- ============ EFFECTIVE POT VIEW (for display) ============
create or replace view room_pots with (security_invoker = true) as
  select
    r.id as room_id,
    r.name,
    r.rtp,
    r.rollover_gold,
    r.rollover_sweeps,
    coalesce(g.pot_gold, 0) as current_pot_gold,
    coalesce(g.pot_sweeps, 0) as current_pot_sweeps,
    r.rollover_gold + coalesce(g.pot_gold, 0) as total_pot_gold,
    r.rollover_sweeps + coalesce(g.pot_sweeps, 0) as total_pot_sweeps,
    ((r.rollover_gold + coalesce(g.pot_gold, 0)) * r.rtp)::bigint as expected_player_pool_gold,
    (r.rollover_sweeps + coalesce(g.pot_sweeps, 0)) * r.rtp as expected_player_pool_sweeps
  from rooms r
  left join lateral (
    select pot_gold, pot_sweeps from games
    where room_id = r.id and status in ('waiting', 'playing')
    order by created_at desc limit 1
  ) g on true
  where r.active = true;
grant select on room_pots to anon, authenticated;

-- ============ HOUSE STATS (admin only — for monitoring) ============
create or replace function house_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_house_take_gold', coalesce(sum(house_take_gold), 0),
    'total_house_take_sweeps', coalesce(sum(house_take_sweeps), 0),
    'avg_rtp', coalesce(avg(rtp), 0.85),
    'total_rollover_gold', coalesce(sum(rollover_gold), 0),
    'total_rollover_sweeps', coalesce(sum(rollover_sweeps), 0),
    'active_rooms', count(*)
  ) into result from rooms where active = true;
  return result;
end;
$$;
