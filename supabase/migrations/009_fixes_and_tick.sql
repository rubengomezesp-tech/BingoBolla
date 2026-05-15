-- ============================================================================
-- BingoBolla v9 — Fixes + Client-driven ball dropping
-- ============================================================================

-- ============ FIX: ensure coin_packages exists ============
create table if not exists coin_packages (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  currency_type text default 'gold' check (currency_type in ('gold','sweeps','diamonds')),
  gold_coins bigint default 0,
  sweeps_coins numeric(10,2) default 0,
  diamonds_amount numeric(10,2) default 0,
  price_usd numeric(10,2) not null,
  bonus_pct int default 0,
  stripe_price_id text,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Diamond packages (idempotent — only if 008 didn't run completely)
insert into coin_packages (sku, name, currency_type, diamonds_amount, price_usd, bonus_pct, sort_order, active)
values
  ('diamonds_50', 'Diamond Starter', 'diamonds', 50, 5.00, 0, 100, true),
  ('diamonds_100', 'Diamond Plus', 'diamonds', 110, 10.00, 10, 101, true),
  ('diamonds_500', 'Diamond Royal', 'diamonds', 600, 50.00, 20, 102, true),
  ('diamonds_1200', 'Diamond Empire', 'diamonds', 1500, 100.00, 25, 103, true)
on conflict (sku) do nothing;

-- Default Gold + Sweeps packages (in case they were never created)
insert into coin_packages (sku, name, currency_type, gold_coins, sweeps_coins, price_usd, sort_order, active)
values
  ('gold_5k', 'Starter', 'gold', 5000, 0, 4.99, 1, true),
  ('gold_15k', 'Plus', 'gold', 15000, 0, 9.99, 2, true),
  ('gold_50k', 'Pro', 'gold', 50000, 0, 24.99, 3, true),
  ('gold_150k', 'Elite', 'gold', 150000, 0, 49.99, 4, true),
  ('sweeps_5', 'Cash Pack 5', 'sweeps', 0, 5, 4.99, 10, true),
  ('sweeps_25', 'Cash Pack 25', 'sweeps', 0, 25, 19.99, 11, true),
  ('sweeps_100', 'Cash Pack 100', 'sweeps', 0, 100, 74.99, 12, true)
on conflict (sku) do nothing;

-- ============ CLIENT-DRIVEN BALL DROPPER ============
-- Rate-limited tick function: clients call this every 3s, only drops a ball if interval elapsed
create or replace function tick_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_last_ball_at timestamptz;
  v_interval_ms int;
  v_result jsonb;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error', 'game_not_found'); end if;
  if v_game.status != 'playing' then return jsonb_build_object('status', v_game.status); end if;

  select * into v_room from rooms where id = v_game.room_id;
  v_interval_ms := coalesce(v_room.ball_interval_ms, 3000);

  -- Check time since last ball
  select max(called_at) into v_last_ball_at from balls_called where game_id = p_game_id;

  if v_last_ball_at is not null and (extract(epoch from (now() - v_last_ball_at)) * 1000) < v_interval_ms then
    -- Too soon — return current state
    return jsonb_build_object('throttled', true, 'next_ball_in_ms',
      v_interval_ms - (extract(epoch from (now() - v_last_ball_at)) * 1000)::int);
  end if;

  -- Drop next ball
  v_result := call_next_ball(p_game_id);
  return v_result;
end;
$$;
grant execute on function tick_game(uuid) to authenticated, anon;

-- Also need: auto-start games when starts_at elapses (for waiting → playing transition)
create or replace function tick_waiting_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_card_count int;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error', 'game_not_found'); end if;
  if v_game.status != 'waiting' then return jsonb_build_object('status', v_game.status); end if;
  if v_game.starts_at > now() then return jsonb_build_object('waiting', true); end if;

  select count(*) into v_card_count from cards where game_id = p_game_id;
  if v_card_count >= 1 then
    return call_next_ball(p_game_id);  -- triggers start_game internally if first call
  end if;

  -- No players — push start time forward
  update games set starts_at = now() + interval '30 seconds' where id = p_game_id;
  return jsonb_build_object('no_players', true);
end;
$$;
grant execute on function tick_waiting_game(uuid) to authenticated, anon;

-- Verify
select '=== PACKAGES ===' as section;
select sku, name, currency_type,
  case when currency_type = 'gold' then gold_coins::text
       when currency_type = 'sweeps' then sweeps_coins::text
       else diamonds_amount::text end as amount,
  price_usd
from coin_packages where active = true order by sort_order;
