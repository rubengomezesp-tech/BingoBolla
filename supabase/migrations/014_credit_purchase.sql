-- ============================================================================
-- v14 — credit_purchase: maneja Gold + Sweeps + Diamonds en una sola función
-- Llamado desde el Stripe webhook tras pago confirmado
-- ============================================================================

create or replace function credit_purchase(
  p_user_id uuid,
  p_package_id uuid,
  p_amount_cents int,
  p_provider_session_id text,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg coin_packages%rowtype;
  v_existing uuid;
  v_purchase_id uuid;
  v_new_gold bigint := 0;
  v_new_sweeps numeric := 0;
  v_new_diamonds numeric := 0;
begin
  -- Idempotencia: si ya procesamos este pago, salir
  select id into v_existing from purchases
    where provider_session_id = p_provider_session_id;
  if found then
    return jsonb_build_object('already_processed', true, 'purchase_id', v_existing);
  end if;

  -- Fetch package
  select * into v_pkg from coin_packages where id = p_package_id;
  if not found then raise exception 'package_not_found'; end if;

  -- Register purchase
  insert into purchases (
    player_id, package_id, amount_cents, currency,
    provider, provider_session_id, payment_id, status
  ) values (
    p_user_id, p_package_id, p_amount_cents, 'usd',
    'stripe', p_provider_session_id, p_payment_id, 'completed'
  ) returning id into v_purchase_id;

  -- Credit coins según tipo
  if v_pkg.currency_type = 'gold' then
    update profiles set
      gold_coins = gold_coins + v_pkg.gold_coins,
      total_purchased_usd = coalesce(total_purchased_usd, 0) + (p_amount_cents / 100.0)
    where id = p_user_id
    returning gold_coins into v_new_gold;

    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
      values (p_user_id, 'gold', v_pkg.gold_coins, v_new_gold, 'purchase', v_purchase_id);

  elsif v_pkg.currency_type = 'sweeps' then
    update profiles set
      sweeps_coins = sweeps_coins + v_pkg.sweeps_coins,
      total_purchased_usd = coalesce(total_purchased_usd, 0) + (p_amount_cents / 100.0)
    where id = p_user_id
    returning sweeps_coins into v_new_sweeps;

    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
      values (p_user_id, 'sweeps', v_pkg.sweeps_coins, v_new_sweeps, 'purchase', v_purchase_id);

  elsif v_pkg.currency_type = 'diamonds' then
    update profiles set
      diamonds = coalesce(diamonds, 0) + v_pkg.diamonds_amount,
      diamonds_lifetime_purchased = coalesce(diamonds_lifetime_purchased, 0) + v_pkg.diamonds_amount,
      total_purchased_usd = coalesce(total_purchased_usd, 0) + (p_amount_cents / 100.0)
    where id = p_user_id
    returning diamonds into v_new_diamonds;

    insert into diamond_tx (player_id, amount, balance_after, reason, ref_id)
      values (p_user_id, v_pkg.diamonds_amount, v_new_diamonds, 'purchase', v_purchase_id);
  end if;

  -- House ledger entry
  insert into house_ledger (entry_type, amount_usd, reference_id, notes)
    values ('coin_sale', p_amount_cents / 100.0, v_purchase_id, v_pkg.sku);

  return jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'currency_type', v_pkg.currency_type,
    'new_gold', v_new_gold,
    'new_sweeps', v_new_sweeps,
    'new_diamonds', v_new_diamonds
  );
end;
$$;

-- Service role llama esto desde el webhook
revoke all on function credit_purchase(uuid, uuid, int, text, text) from public, authenticated, anon;

-- Asegura que la tabla purchases existe
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  package_id uuid references coin_packages,
  amount_cents int not null,
  currency text default 'usd',
  provider text default 'stripe',
  provider_session_id text unique,
  payment_id text,
  status text default 'completed' check (status in ('pending','completed','failed','refunded')),
  created_at timestamptz default now()
);

create index if not exists purchases_player_idx on purchases(player_id, created_at desc);
alter table purchases enable row level security;
drop policy if exists "read own purchases" on purchases;
create policy "read own purchases" on purchases for select using (auth.uid() = player_id);

-- House ledger
create table if not exists house_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null,
  amount_usd numeric(10,2) not null,
  reference_id uuid,
  notes text,
  created_at timestamptz default now()
);

-- Total purchased en profiles
alter table profiles add column if not exists total_purchased_usd numeric(10,2) default 0;
