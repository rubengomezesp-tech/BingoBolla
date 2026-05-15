-- ============================================================================
-- BingoBolla v3 — Payments (Stripe MVP, Nuvei-ready)
-- ============================================================================

-- ============ COIN PACKAGES ============
create table if not exists coin_packages (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  price_cents int not null check (price_cents > 0),
  gold_coins bigint not null check (gold_coins > 0),
  sweeps_coins_bonus numeric(10,2) not null default 0,
  popular boolean default false,
  best_value boolean default false,
  display_order int default 100,
  active boolean default true,
  created_at timestamptz default now()
);

alter table coin_packages enable row level security;
create policy "anyone reads packages" on coin_packages for select using (active = true);

-- Seed packages (Chumba/LuckyLand-style)
insert into coin_packages (sku, name, price_cents, gold_coins, sweeps_coins_bonus, popular, best_value, display_order) values
  ('starter_5',    'Bolsa Inicial',     499,    5000,    5.00, false, false, 10),
  ('popular_10',   'Combo Popular',     999,   12000,   12.00, true,  false, 20),
  ('bigger_20',    'Mega Combo',       1999,   25000,   30.00, false, false, 30),
  ('huge_50',      'Saco Gigante',     4999,   70000,   75.00, false, false, 40),
  ('best_100',     'Mejor Valor',      9999,  150000,  160.00, false, true,  50),
  ('whale_200',    'Cofre del Tesoro',19999,  320000,  340.00, false, false, 60)
on conflict (sku) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  gold_coins = excluded.gold_coins,
  sweeps_coins_bonus = excluded.sweeps_coins_bonus,
  popular = excluded.popular,
  best_value = excluded.best_value;

-- ============ PURCHASES ============
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles not null,
  package_id uuid references coin_packages not null,
  provider text not null default 'stripe' check (provider in ('stripe','nuvei','worldpay','trustly')),
  provider_session_id text,
  provider_payment_id text,
  amount_cents int not null,
  currency text default 'USD',
  gold_received bigint default 0,
  sweeps_received numeric(10,2) default 0,
  status text default 'pending' check (status in ('pending','completed','failed','refunded')),
  raw_event jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index purchases_player_idx on purchases(player_id, created_at desc);
create index purchases_session_idx on purchases(provider_session_id);

alter table purchases enable row level security;
create policy "read own purchases" on purchases for select using (auth.uid() = player_id);

-- ============ COMPLETE PURCHASE (called by webhook handler with service role) ============
create or replace function complete_purchase(
  p_provider_session_id text,
  p_provider_payment_id text default null,
  p_raw_event jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase purchases%rowtype;
  v_pkg coin_packages%rowtype;
  v_player_state text;
  v_new_gold bigint;
  v_new_sweeps numeric;
  v_sweeps_to_credit numeric;
begin
  select * into v_purchase from purchases
    where provider_session_id = p_provider_session_id
    for update;

  if not found then raise exception 'purchase_not_found'; end if;
  if v_purchase.status = 'completed' then
    -- idempotent: already processed
    return jsonb_build_object('already_completed', true);
  end if;

  select * into v_pkg from coin_packages where id = v_purchase.package_id;
  if not found then raise exception 'package_not_found'; end if;

  -- Check player state for sweeps eligibility (Sweeps only in non-excluded states)
  select state into v_player_state from profiles where id = v_purchase.player_id;
  if v_player_state is not null and is_state_excluded(v_player_state) then
    v_sweeps_to_credit := 0;  -- excluded state: gold only, no sweeps bonus
  else
    v_sweeps_to_credit := v_pkg.sweeps_coins_bonus;
  end if;

  -- Credit gold
  update profiles set gold_coins = gold_coins + v_pkg.gold_coins
    where id = v_purchase.player_id
    returning gold_coins into v_new_gold;
  insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
    values (v_purchase.player_id, 'gold', v_pkg.gold_coins, v_new_gold, 'purchase', v_purchase.id);

  -- Credit sweeps bonus (if eligible)
  if v_sweeps_to_credit > 0 then
    update profiles set sweeps_coins = sweeps_coins + v_sweeps_to_credit
      where id = v_purchase.player_id
      returning sweeps_coins into v_new_sweeps;
    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
      values (v_purchase.player_id, 'sweeps', v_sweeps_to_credit, v_new_sweeps, 'purchase_bonus', v_purchase.id);
  end if;

  -- Mark purchase complete
  update purchases set
    status = 'completed',
    provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
    gold_received = v_pkg.gold_coins,
    sweeps_received = v_sweeps_to_credit,
    raw_event = coalesce(p_raw_event, raw_event),
    completed_at = now()
  where id = v_purchase.id;

  return jsonb_build_object(
    'completed', true,
    'gold_credited', v_pkg.gold_coins,
    'sweeps_credited', v_sweeps_to_credit
  );
end;
$$;

-- Create a pending purchase row (called from /api/checkout server-side)
create or replace function create_pending_purchase(
  p_package_id uuid,
  p_provider text,
  p_provider_session_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pkg coin_packages%rowtype;
  v_purchase_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  select * into v_pkg from coin_packages where id = p_package_id and active = true;
  if not found then raise exception 'package_not_found'; end if;

  insert into purchases (player_id, package_id, provider, provider_session_id, amount_cents)
  values (v_user_id, p_package_id, p_provider, p_provider_session_id, v_pkg.price_cents)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

grant execute on function create_pending_purchase(uuid, text, text) to authenticated;
