-- ============================================================================
-- BingoBolla v8 — Power Trio: Diamonds + Slots
-- ============================================================================

-- ============ DIAMONDS (super moneda) ============
alter table profiles
  add column if not exists diamonds numeric(12,2) default 0,
  add column if not exists diamonds_lifetime_purchased numeric(12,2) default 0,
  add column if not exists diamonds_lifetime_redeemed numeric(12,2) default 0;

create table if not exists diamond_tx (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  amount numeric(10,2) not null,  -- positive=in, negative=out
  balance_after numeric(12,2) not null,
  reason text not null check (reason in ('purchase','redeem_request','redeem_processed','wager','win_line','win_two_lines','win_full_house','admin_credit','admin_debit')),
  ref_id uuid,
  created_at timestamptz default now()
);

create index diamond_tx_player_idx on diamond_tx(player_id, created_at desc);
alter table diamond_tx enable row level security;
create policy "read own diamond tx" on diamond_tx for select using (auth.uid() = player_id);

-- Redemption queue (admin processes manually until automated payouts)
create table if not exists diamond_redemptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  diamonds_amount numeric(10,2) not null check (diamonds_amount >= 100),
  usd_amount numeric(10,2) not null,  -- diamonds_amount * 0.08
  status text default 'pending' check (status in ('pending','approved','rejected','paid')),
  payment_method text,  -- 'paypal','bank_transfer','stripe'
  payment_details jsonb,
  admin_notes text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index diamond_redemptions_player_idx on diamond_redemptions(player_id, created_at desc);
create index diamond_redemptions_status_idx on diamond_redemptions(status, created_at);
alter table diamond_redemptions enable row level security;
create policy "read own redemptions" on diamond_redemptions for select using (auth.uid() = player_id);

-- ============ REQUEST REDEMPTION ============
create or replace function request_diamond_redemption(
  p_diamond_amount numeric,
  p_payment_method text,
  p_payment_details jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_usd_amount numeric;
  v_new_balance numeric;
  v_redemption_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile.banned then raise exception 'account_banned'; end if;
  if v_profile.kyc_status != 'verified' then raise exception 'kyc_verification_required'; end if;
  if p_diamond_amount < 100 then raise exception 'minimum_redemption_100_diamonds'; end if;
  if p_diamond_amount > v_profile.diamonds then raise exception 'insufficient_diamonds'; end if;
  if p_payment_method not in ('paypal','bank_transfer') then raise exception 'invalid_payment_method'; end if;

  -- Calculate USD: 1 Diamond = $0.08 redeem rate (20% house margin)
  v_usd_amount := p_diamond_amount * 0.08;

  -- Lock diamonds (move to pending)
  update profiles set
    diamonds = diamonds - p_diamond_amount,
    diamonds_lifetime_redeemed = diamonds_lifetime_redeemed + p_diamond_amount
    where id = v_user_id and diamonds >= p_diamond_amount
    returning diamonds into v_new_balance;
  if v_new_balance is null then raise exception 'insufficient_diamonds'; end if;

  insert into diamond_redemptions (player_id, diamonds_amount, usd_amount, payment_method, payment_details)
    values (v_user_id, p_diamond_amount, v_usd_amount, p_payment_method, p_payment_details)
    returning id into v_redemption_id;

  insert into diamond_tx (player_id, amount, balance_after, reason, ref_id)
    values (v_user_id, -p_diamond_amount, v_new_balance, 'redeem_request', v_redemption_id);

  return jsonb_build_object(
    'redemption_id', v_redemption_id,
    'diamonds_redeemed', p_diamond_amount,
    'usd_amount', v_usd_amount,
    'status', 'pending',
    'estimated_processing', '3-5 business days'
  );
end;
$$;
grant execute on function request_diamond_redemption(numeric, text, jsonb) to authenticated;

-- ============ CREDIT DIAMONDS (used by Stripe webhook on purchase) ============
create or replace function credit_diamonds(
  p_player_id uuid,
  p_amount numeric,
  p_reference uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
begin
  update profiles set
    diamonds = diamonds + p_amount,
    diamonds_lifetime_purchased = diamonds_lifetime_purchased + p_amount
    where id = p_player_id
    returning diamonds into v_new_balance;

  insert into diamond_tx (player_id, amount, balance_after, reason, ref_id)
    values (p_player_id, p_amount, v_new_balance, 'purchase', p_reference);

  return jsonb_build_object('ok', true, 'new_balance', v_new_balance);
end;
$$;
-- Only service_role calls this (from webhook)
revoke all on function credit_diamonds(uuid, numeric, uuid) from public, authenticated;

-- ============ SLOT MACHINES ============
create table if not exists slot_machines (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  emoji text,
  theme_color text,
  reels jsonb not null,        -- {"symbols": ["🍒","🍋",...], "weights": [...]}
  paytable jsonb not null,     -- {"🍒_3": 2, "🍋_3": 3, ...}
  min_bet_gold int default 10,
  max_bet_gold int default 500,
  min_bet_sweeps numeric(6,2) default 0.05,
  max_bet_sweeps numeric(6,2) default 5.00,
  rtp numeric(4,3) default 0.900,
  active boolean default true,
  display_order int default 0
);

create table if not exists slot_spins (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  machine_id uuid references slot_machines on delete cascade not null,
  bet numeric(10,2) not null,
  currency text not null check (currency in ('gold','sweeps','diamonds')),
  symbols text[] not null,
  win_amount numeric(12,2) not null default 0,
  pattern text,
  created_at timestamptz default now()
);

create index slot_spins_player_idx on slot_spins(player_id, created_at desc);
alter table slot_spins enable row level security;
create policy "read own spins" on slot_spins for select using (auth.uid() = player_id);

-- Seed 3 slot machines
insert into slot_machines (slug, name, emoji, theme_color, reels, paytable, min_bet_gold, max_bet_gold, min_bet_sweeps, max_bet_sweeps, rtp, display_order)
values
  ('lucky-cherry', 'Lucky Cherry', '🍒', '#FF3D7F',
    '{"symbols": ["🍒","🍋","🔔","⭐","💎","7️⃣"], "weights": [40, 30, 15, 8, 5, 2]}'::jsonb,
    '{"🍒": 2, "🍋": 3, "🔔": 5, "⭐": 10, "💎": 25, "7️⃣": 50}'::jsonb,
    10, 500, 0.05, 2.00, 0.900, 1),
  ('diamond-rush', 'Diamond Rush', '💎', '#00E5FF',
    '{"symbols": ["💎","⭐","🔔","🎰","🍀","💰"], "weights": [35, 25, 18, 12, 7, 3]}'::jsonb,
    '{"💎": 3, "⭐": 5, "🔔": 8, "🎰": 15, "🍀": 30, "💰": 100}'::jsonb,
    25, 1000, 0.10, 5.00, 0.910, 2),
  ('bingo-stars', 'Bingo Stars', '⭐', '#FFD93D',
    '{"symbols": ["1️⃣","2️⃣","3️⃣","🔔","⭐","🎱"], "weights": [40, 30, 15, 8, 5, 2]}'::jsonb,
    '{"1️⃣": 2, "2️⃣": 3, "3️⃣": 5, "🔔": 8, "⭐": 20, "🎱": 75}'::jsonb,
    10, 300, 0.05, 1.50, 0.900, 3)
on conflict (slug) do nothing;

-- ============ PLAY SLOT FUNCTION ============
create or replace function play_slot(
  p_machine_id uuid,
  p_bet numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_machine slot_machines%rowtype;
  v_symbols text[];
  v_weights int[];
  v_total_weight int;
  v_rng int;
  v_acc int;
  v_pick text;
  v_result text[] := array[]::text[];
  v_paytable jsonb;
  v_pattern text;
  v_multiplier numeric := 0;
  v_win numeric := 0;
  v_balance numeric;
  v_spin_id uuid;
  i int;
  j int;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile.banned then raise exception 'account_banned'; end if;
  if exists (select 1 from self_exclusions where player_id = v_user_id and active = true) then
    raise exception 'self_excluded';
  end if;

  select * into v_machine from slot_machines where id = p_machine_id and active = true;
  if not found then raise exception 'machine_not_found'; end if;

  -- Validate bet
  if p_currency = 'gold' then
    if p_bet < v_machine.min_bet_gold or p_bet > v_machine.max_bet_gold then
      raise exception 'bet_out_of_range';
    end if;
  elsif p_currency = 'sweeps' then
    if v_profile.kyc_status not in ('self_declared','verified') then raise exception 'kyc_required'; end if;
    if p_bet < v_machine.min_bet_sweeps or p_bet > v_machine.max_bet_sweeps then
      raise exception 'bet_out_of_range';
    end if;
  elsif p_currency = 'diamonds' then
    if p_bet < 1 then raise exception 'bet_out_of_range'; end if;
  else raise exception 'invalid_currency'; end if;

  -- Deduct bet
  if p_currency = 'gold' then
    update profiles set gold_coins = gold_coins - p_bet::bigint
      where id = v_user_id and gold_coins >= p_bet::bigint
      returning gold_coins into v_balance;
  elsif p_currency = 'sweeps' then
    update profiles set sweeps_coins = sweeps_coins - p_bet
      where id = v_user_id and sweeps_coins >= p_bet
      returning sweeps_coins into v_balance;
  else
    update profiles set diamonds = diamonds - p_bet
      where id = v_user_id and diamonds >= p_bet
      returning diamonds into v_balance;
  end if;
  if v_balance is null then raise exception 'insufficient_funds'; end if;

  -- Spin 3 reels
  v_symbols := array(select jsonb_array_elements_text(v_machine.reels->'symbols'));
  v_weights := array(select (jsonb_array_elements_text(v_machine.reels->'weights'))::int);
  v_total_weight := (select sum(w) from unnest(v_weights) w);

  for i in 1..3 loop
    v_rng := floor(random() * v_total_weight)::int + 1;
    v_acc := 0;
    v_pick := v_symbols[1];
    for j in 1..array_length(v_symbols, 1) loop
      v_acc := v_acc + v_weights[j];
      if v_rng <= v_acc then
        v_pick := v_symbols[j];
        exit;
      end if;
    end loop;
    v_result := array_append(v_result, v_pick);
  end loop;

  -- Check for 3 of a kind
  if v_result[1] = v_result[2] and v_result[2] = v_result[3] then
    v_paytable := v_machine.paytable;
    v_multiplier := coalesce((v_paytable->>v_result[1])::numeric, 0);
    v_win := p_bet * v_multiplier;
    v_pattern := v_result[1] || '_3';
  end if;

  -- Credit win
  if v_win > 0 then
    if p_currency = 'gold' then
      update profiles set gold_coins = gold_coins + v_win::bigint
        where id = v_user_id returning gold_coins into v_balance;
    elsif p_currency = 'sweeps' then
      update profiles set sweeps_coins = sweeps_coins + v_win,
        total_won_sweeps = total_won_sweeps + v_win
        where id = v_user_id returning sweeps_coins into v_balance;
    else
      update profiles set diamonds = diamonds + v_win
        where id = v_user_id returning diamonds into v_balance;
    end if;
  end if;

  -- Record spin
  insert into slot_spins (player_id, machine_id, bet, currency, symbols, win_amount, pattern)
    values (v_user_id, p_machine_id, p_bet, p_currency, v_result, v_win, v_pattern)
    returning id into v_spin_id;

  -- Log transactions in coin_tx
  if p_currency != 'diamonds' then
    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
      values (v_user_id, p_currency, -p_bet, v_balance - v_win, 'slot_bet', v_spin_id);
    if v_win > 0 then
      insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
        values (v_user_id, p_currency, v_win, v_balance, 'slot_win', v_spin_id);
    end if;
  else
    insert into diamond_tx (player_id, amount, balance_after, reason, ref_id)
      values (v_user_id, -p_bet, v_balance - v_win, 'wager', v_spin_id);
    if v_win > 0 then
      insert into diamond_tx (player_id, amount, balance_after, reason, ref_id)
        values (v_user_id, v_win, v_balance, 'win_line', v_spin_id);
    end if;
  end if;

  return jsonb_build_object(
    'symbols', v_result,
    'win', v_win,
    'multiplier', v_multiplier,
    'pattern', v_pattern,
    'new_balance', v_balance,
    'spin_id', v_spin_id
  );
end;
$$;
grant execute on function play_slot(uuid, numeric, text) to authenticated;

-- ============ DIAMOND PACKAGES (for store) ============
alter table coin_packages
  add column if not exists currency_type text default 'gold'
    check (currency_type in ('gold','sweeps','diamonds'));

insert into coin_packages (sku, name, currency_type, gold_coins, sweeps_coins, price_usd, sort_order, active)
values
  ('diamonds_50', 'Diamond Starter', 'diamonds', 0, 0, 5.00, 100, true),
  ('diamonds_100', 'Diamond Plus', 'diamonds', 0, 0, 10.00, 101, true),
  ('diamonds_500', 'Diamond Royal', 'diamonds', 0, 0, 50.00, 102, true),
  ('diamonds_1200', 'Diamond Empire', 'diamonds', 0, 0, 100.00, 103, true)
on conflict (sku) do nothing;

-- Add diamond_amount column to packages
alter table coin_packages
  add column if not exists diamonds_amount numeric(10,2) default 0;

update coin_packages set diamonds_amount = 50 where sku = 'diamonds_50';
update coin_packages set diamonds_amount = 110 where sku = 'diamonds_100';  -- +10% bonus
update coin_packages set diamonds_amount = 600 where sku = 'diamonds_500';  -- +20% bonus
update coin_packages set diamonds_amount = 1500 where sku = 'diamonds_1200'; -- +25% bonus

-- ============ VERIFY ============
select '=== DIAMONDS SETUP ===' as section;
select name, sku, currency_type, diamonds_amount, price_usd
  from coin_packages
  where currency_type = 'diamonds'
  order by price_usd;

select '=== SLOT MACHINES ===' as section;
select slug, name, emoji, rtp, min_bet_gold, max_bet_gold from slot_machines order by display_order;
