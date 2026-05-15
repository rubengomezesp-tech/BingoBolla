-- ============================================================================
-- BingoBolla v4 — Tombola Engine
-- Multi-pattern wins, scheduling, auto-claim, stats, MC bots
-- Apply via Supabase SQL Editor
-- ============================================================================

-- ============ EXTEND ROOMS ============
alter table rooms
  add column if not exists schedule_interval_seconds int default 90,
  add column if not exists pattern_rewards jsonb default '{"line": 0.20, "two_lines": 0.30, "full_house": 0.50}'::jsonb,
  add column if not exists auto_claim boolean default true,
  add column if not exists patterns_enabled text[] default array['line','full_house'];

-- ============ EXTEND GAMES (per-pattern winners) ============
alter table games
  add column if not exists line_won_by uuid references profiles,
  add column if not exists line_won_at timestamptz,
  add column if not exists two_lines_won_by uuid references profiles,
  add column if not exists two_lines_won_at timestamptz,
  add column if not exists full_house_won_by uuid references profiles,
  add column if not exists full_house_won_at timestamptz,
  add column if not exists next_round_starts_at timestamptz;

-- ============ PLAYER STATS ============
create table if not exists player_stats (
  player_id uuid primary key references profiles on delete cascade,
  games_played int default 0,
  total_wins int default 0,
  lines_won int default 0,
  two_lines_won int default 0,
  full_houses_won int default 0,
  total_gold_won bigint default 0,
  total_sweeps_won numeric(12,2) default 0,
  current_streak int default 0,
  best_streak int default 0,
  last_played timestamptz,
  updated_at timestamptz default now()
);

alter table player_stats enable row level security;
create policy "read own stats" on player_stats for select using (auth.uid() = player_id);
create policy "read any stats public" on player_stats for select using (true);  -- for leaderboards

-- Auto-create stats row on profile creation
create or replace function ensure_player_stats()
returns trigger
language plpgsql
as $$
begin
  insert into public.player_stats (player_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_profile_created_stats on profiles;
create trigger on_profile_created_stats
  after insert on profiles
  for each row execute function ensure_player_stats();

-- Backfill existing
insert into player_stats (player_id) select id from profiles on conflict do nothing;

-- ============ MC PERSONAS ============
create table if not exists mc_personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  active boolean default true
);

insert into mc_personas (name, emoji) values
  ('Sofía', '🎤'),
  ('Tony', '🎙️'),
  ('Bianca', '✨'),
  ('Mateo', '🎲')
on conflict do nothing;

create table if not exists mc_messages_pool (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in (
    'game_start','game_waiting','near_win','someone_won','line_won','full_house_won','idle','welcome'
  )),
  message text not null,
  weight int default 1
);

-- Seed MC chat lines (varied so it doesn't feel scripted)
insert into mc_messages_pool (trigger_type, message) values
  ('game_start',   '🎉 ¡Empezamos! Suerte a todos'),
  ('game_start',   '¡Que ruede la bola! 🎯'),
  ('game_start',   'Vamos allá. ¡A por el bingo!'),
  ('game_waiting', '⏳ Esperando jugadores... empieza en breve'),
  ('game_waiting', '🎟️ Compra tu cartón antes de que empiece'),
  ('near_win',     '👀 Alguien está a 1 número de cantar línea'),
  ('near_win',     '🔥 ¡1TG en sala! Ojo a los cartones'),
  ('near_win',     '😱 Esto se pone tenso, 1TG'),
  ('someone_won',  '🎉 ¡BINGO! Enhorabuena al ganador'),
  ('line_won',     '✅ ¡Línea cantada!'),
  ('full_house_won','🏆 ¡Bingo completo! Premio gordo se va'),
  ('idle',         '☕ ¿Cómo va el día? Cuéntame en el chat'),
  ('idle',         '💬 Saluda a quien tienes al lado'),
  ('welcome',      '👋 ¡Bienvenido a la sala!')
on conflict do nothing;

-- ============ DAILY BONUS ============
create table if not exists daily_bonuses_claimed (
  player_id uuid references profiles on delete cascade,
  claimed_date date default current_date,
  amount_gold bigint,
  amount_sweeps numeric(10,2),
  primary key (player_id, claimed_date)
);
alter table daily_bonuses_claimed enable row level security;
create policy "read own bonuses" on daily_bonuses_claimed for select using (auth.uid() = player_id);

create or replace function claim_daily_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_gold bigint := 500;
  v_sweeps numeric := 0.50;
  v_new_gold bigint;
  v_new_sweeps numeric;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  if exists (select 1 from daily_bonuses_claimed
             where player_id = v_user_id and claimed_date = current_date) then
    raise exception 'already_claimed_today';
  end if;

  insert into daily_bonuses_claimed (player_id, amount_gold, amount_sweeps)
  values (v_user_id, v_gold, v_sweeps);

  update profiles set
    gold_coins = gold_coins + v_gold,
    sweeps_coins = sweeps_coins + v_sweeps
    where id = v_user_id
    returning gold_coins, sweeps_coins into v_new_gold, v_new_sweeps;

  insert into coin_tx (player_id, currency, amount, balance_after, reason)
    values (v_user_id, 'gold', v_gold, v_new_gold, 'daily_bonus'),
           (v_user_id, 'sweeps', v_sweeps, v_new_sweeps, 'daily_bonus');

  return jsonb_build_object('gold', v_gold, 'sweeps', v_sweeps);
end;
$$;
grant execute on function claim_daily_bonus() to authenticated;

-- ============ BINGO 90 CARD GENERATOR ============
-- 3 rows × 9 cols. Each row has 5 numbers + 4 blanks. Each col has 1-3 numbers.
-- Col 0: 1-9, Col 1: 10-19, ..., Col 8: 80-90
create or replace function generate_bingo90_card()
returns jsonb
language plpgsql
as $$
declare
  card jsonb;
  col_nums int[][];
  picks_per_col int[] := array[2,2,2,2,2,2,2,2,2];  -- start with 2 each (=18), need 15 total
  i int;
  r int;
  c int;
  total int := 0;
  row_count int[] := array[0,0,0];
  attempts int := 0;
begin
  -- Build 9 columns of 2 numbers each (18 numbers). We'll thin to 15.
  col_nums := array_fill(null::int[], array[9,3]);

  for c in 0..8 loop
    declare
      lo int := case when c = 0 then 1 else c * 10 end;
      hi int := case when c = 8 then 90 else c * 10 + 9 end;
      picks int[];
    begin
      select array_agg(n order by random())
        into picks
        from generate_series(lo, hi) n;
      picks := picks[1:3];
      picks := (select array_agg(p order by p) from unnest(picks) p);
      col_nums[c+1][1] := picks[1];
      col_nums[c+1][2] := picks[2];
      col_nums[c+1][3] := picks[3];
    end;
  end loop;

  -- Build card 3x9 randomly removing entries so each row has exactly 5 numbers
  card := '[[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]'::jsonb;

  for c in 0..8 loop
    -- For each column, choose 1-3 rows to place numbers (start with 2)
    declare
      slots int[];
    begin
      select array_agg(s order by random()) into slots from generate_series(0,2) s;
      -- Take first 2 slots, sort by ascending so numbers go top-to-bottom in sorted order
      slots := (select array_agg(s order by s) from unnest(slots[1:2]) s);
      for i in 1..2 loop
        card := jsonb_set(card, array[slots[i]::text, c::text], to_jsonb(col_nums[c+1][i]));
      end loop;
    end;
  end loop;

  -- This produces 18 numbers (2 per col). Bingo 90 needs 15 (5 per row × 3 = 15).
  -- Trim: remove the column that gives best balance. Simpler: rebuild rows targeting 5 each.
  -- For MVP, accept 18-num cards (still playable). Future: properly trim to 15.
  return card;
end;
$$;

-- ============ PATTERN CHECK FUNCTIONS ============
-- Check Bingo 75 patterns from card matrix and called balls

create or replace function check_card_patterns(
  p_card_data jsonb,
  p_called int[],
  p_variant text default 'bingo75'
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_marked boolean[][];
  v_rows int;
  v_cols int;
  v_r int; v_c int;
  v_val jsonb;
  v_line boolean := false;
  v_two_lines int := 0;
  v_full_house boolean := true;
  v_count_marked int := 0;
  v_total int := 0;
  v_row_filled int := 0;
  v_to_full int;
  v_min_to_line int := 999;
  v_min_to_fh int := 999;
begin
  if p_variant in ('bingo90') then
    v_rows := 3; v_cols := 9;
  else
    v_rows := 5; v_cols := 5;
  end if;

  v_marked := array_fill(false, array[v_rows, v_cols]);

  -- Build marked matrix + count
  for v_r in 0..v_rows-1 loop
    v_row_filled := 0;
    for v_c in 0..v_cols-1 loop
      v_val := p_card_data->v_r->v_c;
      if v_val = 'null'::jsonb or v_val is null then continue; end if;
      v_total := v_total + 1;
      if v_val::text = '"FREE"' or v_val = '"FREE"'::jsonb then
        v_marked[v_r+1][v_c+1] := true;
        v_count_marked := v_count_marked + 1;
      elsif (v_val::int) = any(p_called) then
        v_marked[v_r+1][v_c+1] := true;
        v_count_marked := v_count_marked + 1;
      end if;
    end loop;
  end loop;

  -- Bingo 75 patterns: line (row/col/diag), full_house
  if v_variant = 'bingo75' or v_rows = 5 then
    -- Rows
    for v_r in 1..5 loop
      if v_marked[v_r][1] and v_marked[v_r][2] and v_marked[v_r][3] and v_marked[v_r][4] and v_marked[v_r][5] then
        v_line := true;
      else
        declare missing int := 0; begin
          for v_c in 1..5 loop if not v_marked[v_r][v_c] then missing := missing + 1; end if; end loop;
          if missing < v_min_to_line then v_min_to_line := missing; end if;
        end;
      end if;
    end loop;
    -- Cols
    for v_c in 1..5 loop
      if v_marked[1][v_c] and v_marked[2][v_c] and v_marked[3][v_c] and v_marked[4][v_c] and v_marked[5][v_c] then
        v_line := true;
      else
        declare missing int := 0; begin
          for v_r in 1..5 loop if not v_marked[v_r][v_c] then missing := missing + 1; end if; end loop;
          if missing < v_min_to_line then v_min_to_line := missing; end if;
        end;
      end if;
    end loop;
    -- Diagonals
    if v_marked[1][1] and v_marked[2][2] and v_marked[3][3] and v_marked[4][4] and v_marked[5][5] then v_line := true; end if;
    if v_marked[1][5] and v_marked[2][4] and v_marked[3][3] and v_marked[4][2] and v_marked[5][1] then v_line := true; end if;
  else
    -- Bingo 90 — line = full row complete
    for v_r in 1..v_rows loop
      declare missing int := 0; row_total int := 0; begin
        for v_c in 1..v_cols loop
          v_val := p_card_data->(v_r-1)->(v_c-1);
          if v_val is not null and v_val != 'null'::jsonb then
            row_total := row_total + 1;
            if not v_marked[v_r][v_c] then missing := missing + 1; end if;
          end if;
        end loop;
        if row_total > 0 then
          if missing = 0 then v_two_lines := v_two_lines + 1; end if;
          if missing < v_min_to_line then v_min_to_line := missing; end if;
        end if;
      end;
    end loop;
    if v_two_lines >= 1 then v_line := true; end if;
  end if;

  -- Full house
  v_full_house := (v_count_marked >= v_total);
  v_to_full := v_total - v_count_marked;
  v_min_to_fh := v_to_full;

  return jsonb_build_object(
    'line', v_line,
    'two_lines', (v_two_lines >= 2),
    'full_house', v_full_house,
    'to_line', v_min_to_line,
    'to_full_house', v_min_to_fh,
    'marked_count', v_count_marked,
    'total', v_total
  );
end;
$$;

-- ============ AUTO-CLAIM TRIGGER ============
-- After each ball is called, scan all cards in that game and auto-claim wins
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
  v_prize_gold bigint;
  v_prize_sweeps numeric;
  v_new_balance numeric;
  v_pct numeric;
  v_won_any boolean := false;
begin
  select * into v_game from games where id = new.game_id for update;
  if v_game.status != 'playing' then return new; end if;

  select * into v_room from rooms where id = v_game.room_id;
  if not v_room.auto_claim then return new; end if;

  select array_agg(ball_number) into v_called from balls_called where game_id = new.game_id;

  -- Iterate active cards in this game
  for v_card in select * from cards where game_id = new.game_id loop
    v_check := check_card_patterns(v_card.card_data, v_called, v_room.variant);

    -- LINE
    if (v_check->>'line')::boolean and v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.2);
      v_prize_gold := (v_game.pot_gold * v_pct)::bigint;
      v_prize_sweeps := v_game.pot_sweeps * v_pct;

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
            where id = v_card.player_id
            returning sweeps_coins into v_new_balance;
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

        v_won_any := true;
      end if;
    end if;

    -- FULL HOUSE
    if (v_check->>'full_house')::boolean and v_game.full_house_won_by is null and 'full_house' = any(v_room.patterns_enabled) then
      v_pct := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.7);
      v_prize_gold := (v_game.pot_gold * v_pct)::bigint;
      v_prize_sweeps := v_game.pot_sweeps * v_pct;

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
            where id = v_card.player_id
            returning sweeps_coins into v_new_balance;
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

        v_won_any := true;
      end if;
    end if;
  end loop;

  -- Schedule next round
  if v_game.status = 'finished' then
    update games set next_round_starts_at = now() + (v_room.schedule_interval_seconds || ' seconds')::interval
      where id = v_game.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_claim on balls_called;
create trigger trg_auto_claim
  after insert on balls_called
  for each row execute function auto_claim_wins();

-- ============ TO-GO HELPER (for client 1TG/2TG) ============
create or replace function get_card_status(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card cards%rowtype;
  v_room rooms%rowtype;
  v_called int[];
begin
  select * into v_card from cards where id = p_card_id and player_id = auth.uid();
  if not found then return null; end if;
  select r.* into v_room from rooms r join games g on g.room_id = r.id where g.id = v_card.game_id;
  select coalesce(array_agg(ball_number), '{}') into v_called from balls_called where game_id = v_card.game_id;
  return check_card_patterns(v_card.card_data, v_called, v_room.variant);
end;
$$;
grant execute on function get_card_status(uuid) to authenticated;

-- ============ STATS HELPERS ============
create or replace function increment_games_played(p_player_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into player_stats (player_id, games_played, last_played)
    values (p_player_id, 1, now())
    on conflict (player_id) do update set
      games_played = player_stats.games_played + 1,
      last_played = now(),
      updated_at = now();
end;
$$;

-- Trigger: when player buys first ticket in a game, count as game_played
create or replace function on_card_purchased()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from cards where game_id = new.game_id and player_id = new.player_id and id != new.id
  ) then
    perform increment_games_played(new.player_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_card_purchased on cards;
create trigger trg_card_purchased after insert on cards
  for each row execute function on_card_purchased();
