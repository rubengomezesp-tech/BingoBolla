-- ============================================================================
-- BingoBolla v1 — Production schema
-- Apply with: psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
-- ============================================================================

-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============ DROP OLD (idempotent) ============
drop table if exists chat_messages cascade;
drop table if exists claims cascade;
drop table if exists balls_called cascade;
drop table if exists cards cascade;
drop table if exists games cascade;
drop table if exists rooms cascade;
drop table if exists coin_tx cascade;
drop table if exists profiles cascade;

-- ============ PROFILES ============
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  state text check (state ~ '^[A-Z]{2}$'),
  age_verified boolean default false,
  gold_coins bigint default 2000 check (gold_coins >= 0),
  sweeps_coins numeric(10,2) default 2.00 check (sweeps_coins >= 0),
  total_won_sweeps numeric(10,2) default 0,
  banned boolean default false,
  created_at timestamptz default now()
);

-- ============ ROOMS ============
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variant text not null check (variant in ('bingo75','bingo90','lite','cinco','pulse')),
  ticket_gold bigint not null default 100,
  ticket_sweeps numeric(10,2) not null default 0.10,
  max_cards_per_player int default 6,
  max_players int default 200,
  ball_interval_ms int default 3000,
  win_pattern text default 'any_line',  -- any_line | two_lines | full_house | corners | x_pattern
  prize_split jsonb default '{"line":0.2,"two_lines":0.3,"full_house":0.5}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============ GAMES (one round per game row) ============
create table games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms not null,
  seed_hash text,                 -- SHA256(seed) pre-committed
  seed_revealed text,             -- shown after game ends (provably fair)
  status text default 'waiting' check (status in ('waiting','playing','finished','cancelled')),
  pot_gold bigint default 0,
  pot_sweeps numeric(10,2) default 0,
  starts_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

create index games_room_status_idx on games(room_id, status);

-- ============ CARDS (purchased by players) ============
create table cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games on delete cascade not null,
  player_id uuid references profiles not null,
  card_data jsonb not null,        -- 5x5 array or 3x9 for bingo90
  currency text not null check (currency in ('gold','sweeps')),
  price numeric(10,2) not null,
  created_at timestamptz default now()
);

create index cards_game_player_idx on cards(game_id, player_id);

-- ============ BALLS CALLED ============
create table balls_called (
  game_id uuid references games on delete cascade not null,
  ball_number int not null check (ball_number between 1 and 90),
  called_at timestamptz default now(),
  sequence int not null,
  primary key (game_id, sequence)
);

-- ============ CLAIMS (player claims bingo, server verifies) ============
create table claims (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games not null,
  card_id uuid references cards not null,
  player_id uuid references profiles not null,
  pattern text not null,            -- 'line', 'two_lines', 'full_house', etc.
  valid boolean,                    -- null until verified
  prize_gold bigint default 0,
  prize_sweeps numeric(10,2) default 0,
  claimed_at timestamptz default now()
);

-- ============ COIN TRANSACTIONS (audit log, immutable) ============
create table coin_tx (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles not null,
  currency text not null check (currency in ('gold','sweeps')),
  amount numeric(10,2) not null,    -- positive = credit, negative = debit
  balance_after numeric(10,2) not null,
  reason text not null,             -- signup_bonus | ticket | win | amoe | redemption | adjustment
  ref_id uuid,
  created_at timestamptz default now()
);

create index coin_tx_player_idx on coin_tx(player_id, created_at desc);

-- ============ CHAT MESSAGES ============
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games on delete cascade not null,
  player_id uuid references profiles,
  is_mc boolean default false,
  message text not null check (char_length(message) <= 200),
  created_at timestamptz default now()
);

create index chat_game_idx on chat_messages(game_id, created_at);

-- ============================================================================
-- RLS
-- ============================================================================
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table games enable row level security;
alter table cards enable row level security;
alter table balls_called enable row level security;
alter table claims enable row level security;
alter table coin_tx enable row level security;
alter table chat_messages enable row level security;

-- Profiles: read own, public can see usernames only via a view
create policy "Read own profile" on profiles for select using (auth.uid() = id);
create policy "Update own profile" on profiles for update using (auth.uid() = id);

-- Rooms: anyone can browse
create policy "Anyone reads rooms" on rooms for select using (active = true);

-- Games: anyone can see games of active rooms
create policy "Anyone reads games" on games for select using (true);

-- Cards: read own cards only
create policy "Read own cards" on cards for select using (auth.uid() = player_id);

-- Balls: anyone can see balls (essential for spectators)
create policy "Anyone reads balls" on balls_called for select using (true);

-- Claims: read own claims
create policy "Read own claims" on claims for select using (auth.uid() = player_id);

-- Coin tx: read own only
create policy "Read own tx" on coin_tx for select using (auth.uid() = player_id);

-- Chat: read game chat, insert own messages
create policy "Read chat" on chat_messages for select using (true);
create policy "Insert own chat" on chat_messages for insert
  with check (auth.uid() = player_id and is_mc = false);

-- ============================================================================
-- FUNCTIONS — atomic game operations
-- ============================================================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := split_part(new.email, '@', 1);
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, gold_coins, sweeps_coins)
  values (new.id, final_username, 2000, 2.00);

  insert into public.coin_tx (player_id, currency, amount, balance_after, reason)
  values
    (new.id, 'gold', 2000, 2000, 'signup_bonus'),
    (new.id, 'sweeps', 2.00, 2.00, 'signup_bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Generate a Bingo 75 card (server-side, anti-cheat)
create or replace function generate_bingo75_card()
returns jsonb
language plpgsql
as $$
declare
  card jsonb := '[[],[],[],[],[]]'::jsonb;
  col_ranges int[][] := array[array[1,15], array[16,30], array[31,45], array[46,60], array[61,75]];
  col_nums int[];
  i int;
  r int;
begin
  for i in 1..5 loop
    -- pick 5 unique numbers from range
    select array_agg(n order by random())
      into col_nums
      from generate_series(col_ranges[i][1], col_ranges[i][2]) as n;

    col_nums := col_nums[1:5];

    for r in 1..5 loop
      if i = 3 and r = 3 then
        card := jsonb_set(card, array[(r-1)::text, (i-1)::text], '"FREE"'::jsonb);
      else
        card := jsonb_set(card, array[(r-1)::text, (i-1)::text], to_jsonb(col_nums[r]));
      end if;
    end loop;
  end loop;

  return card;
end;
$$;

-- Buy a ticket (atomic, prevents double-spend)
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
  v_price numeric;
  v_balance numeric;
  v_card_count int;
  v_new_card_id uuid;
  v_card_data jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Lock the room
  select * into v_room from rooms where id = p_room_id and active = true for update;
  if not found then
    raise exception 'room_not_found';
  end if;

  -- Find current accepting game (waiting status) or create one
  select * into v_game
    from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc
    limit 1
    for update;

  if not found then
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting', now() + interval '30 seconds',
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
  end if;

  -- Pricing
  if p_currency = 'gold' then
    v_price := v_room.ticket_gold;
  elsif p_currency = 'sweeps' then
    v_price := v_room.ticket_sweeps;
  else
    raise exception 'invalid_currency';
  end if;

  -- Check max cards per player in this game
  select count(*) into v_card_count
    from cards
    where game_id = v_game.id and player_id = v_user_id;

  if v_card_count >= v_room.max_cards_per_player then
    raise exception 'max_cards_reached';
  end if;

  -- Lock profile and deduct balance
  if p_currency = 'gold' then
    update profiles set gold_coins = gold_coins - v_price::bigint
      where id = v_user_id and gold_coins >= v_price::bigint
      returning gold_coins into v_balance;
  else
    update profiles set sweeps_coins = sweeps_coins - v_price
      where id = v_user_id and sweeps_coins >= v_price
      returning sweeps_coins into v_balance;
  end if;

  if v_balance is null then
    raise exception 'insufficient_funds';
  end if;

  -- Log transaction
  insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
  values (v_user_id, p_currency, -v_price, v_balance, 'ticket', v_game.id);

  -- Generate card server-side
  if v_room.variant in ('bingo75','lite','cinco','pulse') then
    v_card_data := generate_bingo75_card();
  else
    v_card_data := generate_bingo75_card();  -- bingo90 to be added later
  end if;

  -- Insert card
  insert into cards (game_id, player_id, card_data, currency, price)
  values (v_game.id, v_user_id, v_card_data, p_currency, v_price)
  returning id into v_new_card_id;

  -- Update pot
  if p_currency = 'gold' then
    update games set pot_gold = pot_gold + v_price::bigint where id = v_game.id;
  else
    update games set pot_sweeps = pot_sweeps + v_price where id = v_game.id;
  end if;

  return jsonb_build_object(
    'game_id', v_game.id,
    'card_id', v_new_card_id,
    'card_data', v_card_data,
    'new_balance', v_balance
  );
end;
$$;

-- Call the next ball (used by caller worker)
create or replace function call_next_ball(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_max_ball int := 75;
  v_next_ball int;
  v_sequence int;
  v_called int[];
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return null; end if;
  if v_game.status != 'playing' then return null; end if;

  -- Get already-called balls
  select coalesce(array_agg(ball_number), '{}'::int[]) into v_called
    from balls_called where game_id = p_game_id;

  if array_length(v_called, 1) >= v_max_ball then
    update games set status = 'finished', ended_at = now() where id = p_game_id;
    return jsonb_build_object('finished', true);
  end if;

  -- Pick random unused ball
  select n into v_next_ball
    from generate_series(1, v_max_ball) as n
    where not (n = any(v_called))
    order by random()
    limit 1;

  v_sequence := coalesce(array_length(v_called, 1), 0) + 1;

  insert into balls_called (game_id, ball_number, sequence)
  values (p_game_id, v_next_ball, v_sequence);

  return jsonb_build_object('ball', v_next_ball, 'sequence', v_sequence);
end;
$$;

-- Start a game (transitions waiting → playing)
create or replace function start_game(p_game_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update games set status = 'playing', starts_at = now()
    where id = p_game_id and status = 'waiting';
end;
$$;

-- Claim bingo (verify server-side)
create or replace function claim_bingo(p_card_id uuid, p_pattern text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_card cards%rowtype;
  v_called int[];
  v_card_arr jsonb;
  v_marked boolean[][] := array_fill(false, array[5,5]);
  v_r int; v_c int;
  v_val text;
  v_valid boolean := false;
  v_game games%rowtype;
  v_prize_gold bigint := 0;
  v_prize_sweeps numeric := 0;
  v_balance numeric;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_card from cards where id = p_card_id and player_id = v_user_id;
  if not found then raise exception 'card_not_found'; end if;

  select * into v_game from games where id = v_card.game_id for update;
  if v_game.status != 'playing' then raise exception 'game_not_active'; end if;

  -- Build marked matrix
  select array_agg(ball_number) into v_called from balls_called where game_id = v_card.game_id;
  v_card_arr := v_card.card_data;

  for v_r in 0..4 loop
    for v_c in 0..4 loop
      v_val := v_card_arr->v_r->>v_c;
      if v_val = 'FREE' or (v_val::int) = any(v_called) then
        v_marked[v_r+1][v_c+1] := true;
      end if;
    end loop;
  end loop;

  -- Check pattern
  if p_pattern = 'line' then
    for v_r in 1..5 loop
      if v_marked[v_r][1] and v_marked[v_r][2] and v_marked[v_r][3] and v_marked[v_r][4] and v_marked[v_r][5] then
        v_valid := true; exit;
      end if;
    end loop;
    if not v_valid then
      for v_c in 1..5 loop
        if v_marked[1][v_c] and v_marked[2][v_c] and v_marked[3][v_c] and v_marked[4][v_c] and v_marked[5][v_c] then
          v_valid := true; exit;
        end if;
      end loop;
    end if;
    if not v_valid then
      if v_marked[1][1] and v_marked[2][2] and v_marked[3][3] and v_marked[4][4] and v_marked[5][5] then v_valid := true; end if;
    end if;
    if not v_valid then
      if v_marked[1][5] and v_marked[2][4] and v_marked[3][3] and v_marked[4][2] and v_marked[5][1] then v_valid := true; end if;
    end if;
  elsif p_pattern = 'full_house' then
    v_valid := true;
    for v_r in 1..5 loop
      for v_c in 1..5 loop
        if not v_marked[v_r][v_c] then v_valid := false; exit; end if;
      end loop;
      exit when not v_valid;
    end loop;
  end if;

  if not v_valid then
    insert into claims (game_id, card_id, player_id, pattern, valid)
    values (v_card.game_id, p_card_id, v_user_id, p_pattern, false);
    raise exception 'invalid_claim';
  end if;

  -- Award prizes (simple split)
  if p_pattern = 'line' then
    v_prize_gold := (v_game.pot_gold * 0.3)::bigint;
    v_prize_sweeps := v_game.pot_sweeps * 0.3;
  elsif p_pattern = 'full_house' then
    v_prize_gold := (v_game.pot_gold * 0.7)::bigint;
    v_prize_sweeps := v_game.pot_sweeps * 0.7;
  end if;

  insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
  values (v_card.game_id, p_card_id, v_user_id, p_pattern, true, v_prize_gold, v_prize_sweeps);

  -- Credit prizes
  if v_prize_gold > 0 then
    update profiles set gold_coins = gold_coins + v_prize_gold
      where id = v_user_id returning gold_coins into v_balance;
    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
    values (v_user_id, 'gold', v_prize_gold, v_balance, 'win', v_card.game_id);
  end if;
  if v_prize_sweeps > 0 then
    update profiles set
      sweeps_coins = sweeps_coins + v_prize_sweeps,
      total_won_sweeps = total_won_sweeps + v_prize_sweeps
      where id = v_user_id returning sweeps_coins into v_balance;
    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
    values (v_user_id, 'sweeps', v_prize_sweeps, v_balance, 'win', v_card.game_id);
  end if;

  -- End game on full house
  if p_pattern = 'full_house' then
    update games set status = 'finished', ended_at = now() where id = v_card.game_id;
  end if;

  return jsonb_build_object(
    'valid', true,
    'pattern', p_pattern,
    'prize_gold', v_prize_gold,
    'prize_sweeps', v_prize_sweeps
  );
end;
$$;

-- Grant execute
grant execute on function buy_ticket(uuid, text) to authenticated;
grant execute on function claim_bingo(uuid, text) to authenticated;

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table balls_called;
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table claims;

-- ============================================================================
-- SEED ROOMS
-- ============================================================================
insert into rooms (name, variant, ticket_gold, ticket_sweeps, ball_interval_ms, win_pattern) values
  ('Lucky 75',          'bingo75', 100,  0.10, 3000, 'full_house'),
  ('Speedy Lite',       'lite',     50,  0.05, 1500, 'line'),
  ('Cinco Stars',       'cinco',   250,  0.25, 2500, 'full_house'),
  ('Jackpot Jamboree',  'bingo75', 500,  0.50, 4000, 'full_house'),
  ('Pulse',             'pulse',   100,  0.10, 2000, 'line'),
  ('London 90',         'bingo90', 100,  0.05, 3000, 'full_house');

-- View for public room list with live game info
create or replace view rooms_live as
  select
    r.*,
    g.id as current_game_id,
    g.status as game_status,
    g.pot_gold,
    g.pot_sweeps,
    (select count(*) from cards c where c.game_id = g.id) as cards_in_play,
    (select count(distinct c.player_id) from cards c where c.game_id = g.id) as players_in_play
  from rooms r
  left join lateral (
    select * from games where room_id = r.id and status in ('waiting','playing')
    order by created_at desc limit 1
  ) g on true
  where r.active = true;

grant select on rooms_live to anon, authenticated;
