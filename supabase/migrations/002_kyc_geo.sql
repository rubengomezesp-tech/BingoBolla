-- ============================================================================
-- BingoBolla v2 — KYC + Geolocation
-- Apply AFTER 001_init.sql via Supabase SQL Editor
-- ============================================================================

-- ============ EXTEND PROFILES ============
alter table profiles
  add column if not exists date_of_birth date,
  add column if not exists country text default 'US',
  add column if not exists kyc_status text default 'unverified'
    check (kyc_status in ('unverified','self_declared','pending','verified','rejected')),
  add column if not exists kyc_provider text,
  add column if not exists kyc_provider_id text,
  add column if not exists kyc_verified_at timestamptz,
  add column if not exists last_ip text,
  add column if not exists last_ip_state text,
  add column if not exists last_ip_country text,
  add column if not exists last_ip_at timestamptz;

-- ============ EXCLUDED STATES (jurisdictional blocks) ============
create table if not exists excluded_states (
  state text primary key,
  reason text,
  blocks_sweeps boolean default true,
  blocks_signup boolean default false
);

insert into excluded_states (state, reason, blocks_sweeps, blocks_signup) values
  ('WA', 'Washington gambling laws restrict sweepstakes', true, true),
  ('ID', 'Idaho restricts sweepstakes promotions', true, true),
  ('NV', 'Nevada protects regulated gambling licensees', true, true),
  ('MI', 'Michigan recently legislated against sweeps casinos', true, true)
on conflict (state) do update
  set reason = excluded.reason,
      blocks_sweeps = excluded.blocks_sweeps,
      blocks_signup = excluded.blocks_signup;

alter table excluded_states enable row level security;
create policy "anyone reads excluded states" on excluded_states for select using (true);

-- ============ HELPER FUNCTIONS ============
create or replace function is_state_excluded(p_state text)
returns boolean
language sql
stable
as $$
  select exists (select 1 from excluded_states where state = p_state and blocks_sweeps = true);
$$;

create or replace function calculate_age(p_dob date)
returns int
language sql
immutable
as $$
  select extract(year from age(p_dob))::int;
$$;

-- ============ SELF-DECLARED ONBOARDING ============
create or replace function submit_onboarding(
  p_date_of_birth date,
  p_state text,
  p_country text default 'US'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_age int;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_country != 'US' then raise exception 'unsupported_country'; end if;
  if p_state !~ '^[A-Z]{2}$' then raise exception 'invalid_state'; end if;

  v_age := calculate_age(p_date_of_birth);
  if v_age < 18 then raise exception 'underage' using errcode = 'P0001'; end if;

  -- Block at signup if state is hard-blocked
  if exists (select 1 from excluded_states where state = p_state and blocks_signup = true) then
    raise exception 'state_blocked';
  end if;

  update profiles set
    date_of_birth = p_date_of_birth,
    state = p_state,
    country = p_country,
    age_verified = (v_age >= 18),
    kyc_status = 'self_declared',
    kyc_provider = 'self',
    kyc_verified_at = now()
  where id = v_user_id;

  return jsonb_build_object(
    'verified', true,
    'state', p_state,
    'age', v_age,
    'can_use_sweeps', not is_state_excluded(p_state)
  );
end;
$$;

-- ============ UPDATE buy_ticket TO ENFORCE KYC + GEO ============
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
  v_price numeric;
  v_balance numeric;
  v_card_count int;
  v_new_card_id uuid;
  v_card_data jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile.banned then raise exception 'account_banned'; end if;

  -- Sweeps require KYC + non-excluded state
  if p_currency = 'sweeps' then
    if v_profile.kyc_status not in ('self_declared','verified') then
      raise exception 'kyc_required';
    end if;
    if v_profile.state is null then raise exception 'state_required'; end if;
    if is_state_excluded(v_profile.state) then raise exception 'state_excluded'; end if;
  end if;

  select * into v_room from rooms where id = p_room_id and active = true for update;
  if not found then raise exception 'room_not_found'; end if;

  select * into v_game
    from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1
    for update;

  if not found then
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting', now() + interval '30 seconds',
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
  end if;

  if p_currency = 'gold' then v_price := v_room.ticket_gold;
  elsif p_currency = 'sweeps' then v_price := v_room.ticket_sweeps;
  else raise exception 'invalid_currency'; end if;

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

  v_card_data := generate_bingo75_card();

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
    'new_balance', v_balance
  );
end;
$$;

grant execute on function buy_ticket(uuid, text) to authenticated;
grant execute on function submit_onboarding(date, text, text) to authenticated;
grant execute on function is_state_excluded(text) to authenticated, anon;

-- ============ AMOE (Alternative Method of Entry) - free sweeps via mail ============
create table if not exists amoe_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles,
  amount_sweeps numeric(10,2) default 1.00,
  status text default 'pending' check (status in ('pending','approved','rejected','mailed')),
  postcard_received_at date,
  notes text,
  created_at timestamptz default now()
);
alter table amoe_requests enable row level security;
create policy "Read own AMOE" on amoe_requests for select using (auth.uid() = player_id);
