-- ============================================================================
-- BingoBolla v5 — Responsible Gaming + Security
-- Apply via Supabase SQL Editor
-- ============================================================================

-- ============ CLEANUP: existing ghost games created by v7 caller bug ============
delete from games
where status = 'waiting'
  and created_at < now() - interval '5 minutes'
  and id not in (select distinct game_id from cards);

-- ============ RG LIMITS ============
create table if not exists rg_limits (
  player_id uuid primary key references profiles on delete cascade,

  -- Deposit limits (in USD, applies to Stripe purchases)
  daily_deposit_limit numeric(10,2),
  weekly_deposit_limit numeric(10,2),
  monthly_deposit_limit numeric(10,2),

  -- Wager limits (in Sweeps Coins)
  daily_wager_limit numeric(10,2),
  weekly_wager_limit numeric(10,2),

  -- Loss limits (net loss in Sweeps)
  daily_loss_limit numeric(10,2),
  weekly_loss_limit numeric(10,2),

  -- Session time (minutes per session)
  session_minutes_limit int,

  -- Reality check interval (minutes)
  reality_check_interval_minutes int default 30,

  updated_at timestamptz default now()
);

alter table rg_limits enable row level security;
create policy "read own limits" on rg_limits for select using (auth.uid() = player_id);
create policy "upsert own limits" on rg_limits for all using (auth.uid() = player_id);

-- ============ SELF-EXCLUSION ============
create table if not exists self_exclusions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  period_type text not null check (period_type in ('24h','7d','30d','6m','1y','permanent')),
  starts_at timestamptz default now(),
  ends_at timestamptz,  -- null for permanent
  reason text,
  active boolean default true,
  created_at timestamptz default now()
);

create index self_exclusions_player_active_idx on self_exclusions(player_id, active);

alter table self_exclusions enable row level security;
create policy "read own exclusions" on self_exclusions for select using (auth.uid() = player_id);

-- Function: request self-exclusion (cannot be cancelled by user once active)
create or replace function request_self_exclusion(p_period text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ends timestamptz;
  v_existing self_exclusions%rowtype;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  -- One active exclusion at a time
  select * into v_existing from self_exclusions where player_id = v_user_id and active = true;
  if found then raise exception 'already_excluded'; end if;

  v_ends := case p_period
    when '24h' then now() + interval '1 day'
    when '7d' then now() + interval '7 days'
    when '30d' then now() + interval '30 days'
    when '6m' then now() + interval '6 months'
    when '1y' then now() + interval '1 year'
    when 'permanent' then null
    else null
  end;

  insert into self_exclusions (player_id, period_type, ends_at, reason)
  values (v_user_id, p_period, v_ends, p_reason);

  -- Ban the account
  update profiles set banned = true where id = v_user_id;

  return jsonb_build_object('excluded', true, 'ends_at', v_ends, 'period', p_period);
end;
$$;
grant execute on function request_self_exclusion(text, text) to authenticated;

-- Auto-unban when exclusion expires (runs from caller worker or manual job)
create or replace function expire_exclusions()
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  with expired as (
    update self_exclusions set active = false
    where active = true and ends_at is not null and ends_at < now()
    returning player_id
  )
  update profiles set banned = false
    where id in (select player_id from expired)
    and not exists (
      select 1 from self_exclusions
      where player_id = profiles.id and active = true
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============ SESSIONS LOG ============
create table if not exists sessions_log (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  device_label text,
  ip text,
  user_agent text,
  state text,
  started_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  ended_at timestamptz,
  total_wagered_gold bigint default 0,
  total_wagered_sweeps numeric(10,2) default 0,
  total_won_gold bigint default 0,
  total_won_sweeps numeric(10,2) default 0
);

create index sessions_player_idx on sessions_log(player_id, started_at desc);

alter table sessions_log enable row level security;
create policy "read own sessions" on sessions_log for select using (auth.uid() = player_id);

-- ============ DAILY SPEND VIEW (for limit checks) ============
create or replace view player_spend_24h as
  select
    player_id,
    coalesce(sum(case when reason in ('ticket') and currency = 'sweeps' then -amount else 0 end), 0) as wagered_sweeps_24h,
    coalesce(sum(case when reason like 'win%' and currency = 'sweeps' then amount else 0 end), 0) as won_sweeps_24h
  from coin_tx
  where created_at > now() - interval '24 hours'
  group by player_id;

create or replace view player_spend_7d as
  select
    player_id,
    coalesce(sum(case when reason in ('ticket') and currency = 'sweeps' then -amount else 0 end), 0) as wagered_sweeps_7d,
    coalesce(sum(case when reason like 'win%' and currency = 'sweeps' then amount else 0 end), 0) as won_sweeps_7d
  from coin_tx
  where created_at > now() - interval '7 days'
  group by player_id;

-- ============ UPDATE buy_ticket TO ENFORCE RG LIMITS ============
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

  -- Check active self-exclusion
  if exists (select 1 from self_exclusions where player_id = v_user_id and active = true) then
    raise exception 'self_excluded';
  end if;

  -- Sweeps requires KYC + non-excluded state
  if p_currency = 'sweeps' then
    if v_profile.kyc_status not in ('self_declared','verified') then
      raise exception 'kyc_required';
    end if;
    if v_profile.state is null then raise exception 'state_required'; end if;
    if is_state_excluded(v_profile.state) then raise exception 'state_excluded'; end if;
  end if;

  -- Lock room + game
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

  -- RG WAGER LIMITS (only for Sweeps — Gold has no real-money implication)
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
      if v_limits.daily_loss_limit is not null then
        select * into v_spend_24h from player_spend_24h where player_id = v_user_id;
        if (coalesce(v_spend_24h.wagered_sweeps_24h, 0) - coalesce(v_spend_24h.won_sweeps_24h, 0) + v_price) > v_limits.daily_loss_limit then
          raise exception 'daily_loss_limit_reached';
        end if;
      end if;
    end if;
  end if;

  -- Max cards check
  select count(*) into v_card_count from cards
    where game_id = v_game.id and player_id = v_user_id;
  if v_card_count >= v_room.max_cards_per_player then
    raise exception 'max_cards_reached';
  end if;

  -- Deduct balance
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

-- ============ SET LIMITS HELPER ============
create or replace function upsert_rg_limits(p_limits jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  insert into rg_limits (
    player_id,
    daily_deposit_limit, weekly_deposit_limit, monthly_deposit_limit,
    daily_wager_limit, weekly_wager_limit,
    daily_loss_limit, weekly_loss_limit,
    session_minutes_limit, reality_check_interval_minutes,
    updated_at
  ) values (
    v_user_id,
    nullif((p_limits->>'daily_deposit_limit')::numeric, 0),
    nullif((p_limits->>'weekly_deposit_limit')::numeric, 0),
    nullif((p_limits->>'monthly_deposit_limit')::numeric, 0),
    nullif((p_limits->>'daily_wager_limit')::numeric, 0),
    nullif((p_limits->>'weekly_wager_limit')::numeric, 0),
    nullif((p_limits->>'daily_loss_limit')::numeric, 0),
    nullif((p_limits->>'weekly_loss_limit')::numeric, 0),
    nullif((p_limits->>'session_minutes_limit')::int, 0),
    coalesce((p_limits->>'reality_check_interval_minutes')::int, 30),
    now()
  )
  on conflict (player_id) do update set
    daily_deposit_limit = excluded.daily_deposit_limit,
    weekly_deposit_limit = excluded.weekly_deposit_limit,
    monthly_deposit_limit = excluded.monthly_deposit_limit,
    daily_wager_limit = excluded.daily_wager_limit,
    weekly_wager_limit = excluded.weekly_wager_limit,
    daily_loss_limit = excluded.daily_loss_limit,
    weekly_loss_limit = excluded.weekly_loss_limit,
    session_minutes_limit = excluded.session_minutes_limit,
    reality_check_interval_minutes = excluded.reality_check_interval_minutes,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function upsert_rg_limits(jsonb) to authenticated;
