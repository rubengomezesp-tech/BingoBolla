-- BingoBolla schema v1
-- Run this in: Supabase Dashboard → SQL Editor → New query

-- ============ PROFILES ============
create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique,
  state text,
  age_verified boolean default false,
  gold_coins bigint default 1000,
  sweeps_coins numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ============ ROOMS ============
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variant text check (variant in ('bingo75','bingo90','lite','cinco','pulse')),
  ticket_gold bigint default 100,
  ticket_sweeps numeric(10,2) default 0.10,
  max_players int default 200,
  status text default 'waiting',
  created_at timestamptz default now()
);

-- ============ GAMES ============
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms,
  seed_hash text,
  balls_drawn int[] default '{}',
  winner_id uuid references profiles,
  prize_gold bigint default 0,
  prize_sweeps numeric(10,2) default 0,
  started_at timestamptz,
  finished_at timestamptz
);

-- ============ CARDS ============
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games,
  player_id uuid references profiles,
  card_data jsonb not null,
  currency text check (currency in ('gold','sweeps')),
  created_at timestamptz default now()
);

-- ============ COIN TRANSACTIONS ============
create table if not exists coin_tx (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles,
  currency text check (currency in ('gold','sweeps')),
  amount numeric(10,2),
  reason text,
  ref_id uuid,
  created_at timestamptz default now()
);

-- ============ RLS ============
alter table profiles enable row level security;
alter table cards enable row level security;
alter table coin_tx enable row level security;
alter table rooms enable row level security;

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on profiles;
create policy "Users insert own profile" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users read own cards" on cards;
create policy "Users read own cards" on cards
  for select using (auth.uid() = player_id);

drop policy if exists "Users read own tx" on coin_tx;
create policy "Users read own tx" on coin_tx
  for select using (auth.uid() = player_id);

drop policy if exists "Anyone reads rooms" on rooms;
create policy "Anyone reads rooms" on rooms
  for select using (true);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, gold_coins, sweeps_coins)
  values (new.id, 1000, 0);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
