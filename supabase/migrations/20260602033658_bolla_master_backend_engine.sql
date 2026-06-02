-- Bolla Master backend engine.
-- Server-authoritative energy, rewards, upgrades and audit ledger.

create table if not exists public.bolla_master_player_state (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  energy integer not null default 5 check (energy between 0 and 5),
  max_energy integer not null default 5 check (max_energy between 1 and 5),
  energy_regen_seconds integer not null default 900 check (energy_regen_seconds between 60 and 3600),
  tickets integer not null default 8 check (tickets between 0 and 99),
  shields integer not null default 2 check (shields between 0 and 5),
  building_levels jsonb not null default '{"hotel_neon":2,"muelle_dorado":1,"sala_vip":0}'::jsonb,
  daily_spins integer not null default 0 check (daily_spins >= 0),
  daily_spin_limit integer not null default 30 check (daily_spin_limit between 1 and 60),
  daily_spin_date date not null default current_date,
  last_energy_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bolla_master_building_levels_object check (jsonb_typeof(building_levels) = 'object')
);

create table if not exists public.bolla_master_spins (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  client_nonce text,
  reels text[] not null check (array_length(reels, 1) = 3),
  multiplier integer not null default 1 check (multiplier in (1, 2, 3)),
  reward jsonb not null,
  gold_delta bigint not null default 0,
  diamonds_delta numeric(10,2) not null default 0,
  tickets_delta integer not null default 0,
  shields_delta integer not null default 0,
  energy_before integer not null,
  energy_after integer not null,
  profile_balance_after jsonb not null,
  state_after jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bolla_master_upgrades (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  building_key text not null check (building_key in ('hotel_neon','muelle_dorado','sala_vip')),
  from_level integer not null check (from_level between 0 and 5),
  to_level integer not null check (to_level between 1 and 5),
  gold_cost bigint not null check (gold_cost > 0),
  gold_balance_after bigint not null,
  state_after jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bolla_master_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('spin','refill','upgrade')),
  ref_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bolla_master_spins_player_created_idx
  on public.bolla_master_spins(player_id, created_at desc);
create unique index if not exists bolla_master_spins_player_nonce_uidx
  on public.bolla_master_spins(player_id, client_nonce)
  where client_nonce is not null;
create index if not exists bolla_master_upgrades_player_created_idx
  on public.bolla_master_upgrades(player_id, created_at desc);
create index if not exists bolla_master_events_player_created_idx
  on public.bolla_master_events(player_id, created_at desc);

alter table public.bolla_master_player_state enable row level security;
alter table public.bolla_master_spins enable row level security;
alter table public.bolla_master_upgrades enable row level security;
alter table public.bolla_master_events enable row level security;

drop policy if exists bolla_master_state_select on public.bolla_master_player_state;
create policy bolla_master_state_select
  on public.bolla_master_player_state for select
  to authenticated
  using ((select auth.uid()) = player_id);

drop policy if exists bolla_master_spins_select on public.bolla_master_spins;
create policy bolla_master_spins_select
  on public.bolla_master_spins for select
  to authenticated
  using ((select auth.uid()) = player_id);

drop policy if exists bolla_master_upgrades_select on public.bolla_master_upgrades;
create policy bolla_master_upgrades_select
  on public.bolla_master_upgrades for select
  to authenticated
  using ((select auth.uid()) = player_id);

drop policy if exists bolla_master_events_select on public.bolla_master_events;
create policy bolla_master_events_select
  on public.bolla_master_events for select
  to authenticated
  using ((select auth.uid()) = player_id);

revoke all on table public.bolla_master_player_state from anon, authenticated;
revoke all on table public.bolla_master_spins from anon, authenticated;
revoke all on table public.bolla_master_upgrades from anon, authenticated;
revoke all on table public.bolla_master_events from anon, authenticated;
grant select on table public.bolla_master_player_state to authenticated;
grant select on table public.bolla_master_spins to authenticated;
grant select on table public.bolla_master_upgrades to authenticated;
grant select on table public.bolla_master_events to authenticated;
grant select, insert, update, delete on table public.bolla_master_player_state to service_role;
grant select, insert, update, delete on table public.bolla_master_spins to service_role;
grant select, insert, update, delete on table public.bolla_master_upgrades to service_role;
grant select, insert, update, delete on table public.bolla_master_events to service_role;

create or replace function public.bolla_master_building_cost(
  p_building_key text,
  p_current_level integer
)
returns bigint
language sql
stable
set search_path = public
as $$
  select case p_building_key
    when 'hotel_neon' then 1800::bigint
    when 'muelle_dorado' then 2700::bigint
    when 'sala_vip' then 3600::bigint
    else null::bigint
  end * greatest(1, p_current_level + 1);
$$;

create or replace function public.bolla_master_apply_energy_regen(p_actor_id uuid)
returns public.bolla_master_player_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.bolla_master_player_state%rowtype;
  v_units integer;
  v_new_energy integer;
  v_new_last_energy_at timestamptz;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  insert into public.bolla_master_player_state (player_id)
  values (p_actor_id)
  on conflict (player_id) do nothing;

  select *
  into v_state
  from public.bolla_master_player_state
  where player_id = p_actor_id
  for update;

  if not found then
    raise exception 'state_not_found';
  end if;

  if v_state.daily_spin_date <> current_date then
    update public.bolla_master_player_state
    set daily_spins = 0,
        daily_spin_date = current_date,
        updated_at = now()
    where player_id = p_actor_id
    returning * into v_state;
  end if;

  if v_state.energy < v_state.max_energy then
    v_units := floor(
      greatest(0, extract(epoch from (now() - v_state.last_energy_at)))
      / greatest(60, v_state.energy_regen_seconds)
    )::integer;

    if v_units > 0 then
      v_new_energy := least(v_state.max_energy, v_state.energy + v_units);

      if v_new_energy >= v_state.max_energy then
        v_new_last_energy_at := now();
      else
        v_new_last_energy_at := v_state.last_energy_at
          + make_interval(secs => v_units * v_state.energy_regen_seconds);
      end if;

      update public.bolla_master_player_state
      set energy = v_new_energy,
          last_energy_at = v_new_last_energy_at,
          updated_at = now()
      where player_id = p_actor_id
      returning * into v_state;
    end if;
  end if;

  return v_state;
end;
$$;

create or replace function public.bolla_master_state_payload(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_state public.bolla_master_player_state%rowtype;
  v_recent_spins jsonb;
  v_recent_upgrades jsonb;
  v_progress integer;
  v_total_levels integer;
  v_next_energy_at timestamptz;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_actor_id;

  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if coalesce(v_profile.banned, false) then
    return jsonb_build_object('error', 'account_banned');
  end if;

  if exists (
    select 1
    from public.self_exclusions
    where player_id = p_actor_id
      and active = true
  ) then
    return jsonb_build_object('error', 'self_excluded');
  end if;

  v_state := public.bolla_master_apply_energy_regen(p_actor_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'reels', reels,
    'multiplier', multiplier,
    'reward', reward,
    'gold_delta', gold_delta,
    'diamonds_delta', diamonds_delta,
    'tickets_delta', tickets_delta,
    'shields_delta', shields_delta,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v_recent_spins
  from (
    select *
    from public.bolla_master_spins
    where player_id = p_actor_id
    order by created_at desc
    limit 8
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'building_key', building_key,
    'from_level', from_level,
    'to_level', to_level,
    'gold_cost', gold_cost,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v_recent_upgrades
  from (
    select *
    from public.bolla_master_upgrades
    where player_id = p_actor_id
    order by created_at desc
    limit 5
  ) u;

  v_total_levels :=
    coalesce((v_state.building_levels->>'hotel_neon')::integer, 0)
    + coalesce((v_state.building_levels->>'muelle_dorado')::integer, 0)
    + coalesce((v_state.building_levels->>'sala_vip')::integer, 0);
  v_progress := least(100, round((v_total_levels::numeric / 15) * 100)::integer);

  if v_state.energy >= v_state.max_energy then
    v_next_energy_at := null;
  else
    v_next_energy_at := v_state.last_energy_at
      + make_interval(secs => v_state.energy_regen_seconds);
  end if;

  return jsonb_build_object(
    'ok', true,
    'balances', jsonb_build_object(
      'gold', coalesce(v_profile.gold_coins, 0),
      'sweeps', coalesce(v_profile.sweeps_coins, 0),
      'diamonds', coalesce(v_profile.diamonds, 0)
    ),
    'state', jsonb_build_object(
      'energy', v_state.energy,
      'max_energy', v_state.max_energy,
      'energy_regen_seconds', v_state.energy_regen_seconds,
      'tickets', v_state.tickets,
      'shields', v_state.shields,
      'building_levels', v_state.building_levels,
      'daily_spins', v_state.daily_spins,
      'daily_spin_limit', v_state.daily_spin_limit,
      'progress_pct', v_progress,
      'next_energy_at', v_next_energy_at
    ),
    'recent_spins', v_recent_spins,
    'recent_upgrades', v_recent_upgrades
  );
end;
$$;

create or replace function public.service_get_bolla_master_state(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.bolla_master_state_payload(p_actor_id);
end;
$$;

create or replace function public.service_spin_bolla_master(
  p_actor_id uuid,
  p_client_nonce text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile public.profiles%rowtype;
  v_state public.bolla_master_player_state%rowtype;
  v_existing_spin public.bolla_master_spins%rowtype;
  v_symbol_defs jsonb := '[
    {"key":"gold","label":"Gold","weight":36,"gold":180,"diamonds":0,"tickets":0,"shields":0},
    {"key":"shield","label":"Escudo","weight":18,"gold":0,"diamonds":0,"tickets":0,"shields":1},
    {"key":"raid","label":"Rival","weight":14,"gold":320,"diamonds":0,"tickets":0,"shields":0},
    {"key":"chest","label":"Cofre","weight":12,"gold":120,"diamonds":0,"tickets":0,"shields":0},
    {"key":"tickets","label":"Tickets","weight":14,"gold":0,"diamonds":0,"tickets":1,"shields":0},
    {"key":"gem","label":"Gemas","weight":6,"gold":0,"diamonds":1,"tickets":0,"shields":0}
  ]'::jsonb;
  v_symbol jsonb;
  v_result jsonb := '[]'::jsonb;
  v_reels text[] := array[]::text[];
  v_total_weight integer;
  v_roll integer;
  v_acc integer;
  v_idx integer;
  v_max_count integer;
  v_multiplier integer;
  v_gold_delta bigint := 0;
  v_diamonds_delta numeric(10,2) := 0;
  v_tickets_delta integer := 0;
  v_shields_delta integer := 0;
  v_energy_before integer;
  v_energy_after integer;
  v_gold_balance bigint;
  v_diamonds_balance numeric;
  v_spin_id uuid;
  v_state_after jsonb;
  v_balance_after jsonb;
  v_client_nonce text := nullif(trim(coalesce(p_client_nonce, '')), '');
begin
  perform public.service_set_actor(p_actor_id);
  v_user_id := auth.uid();

  if v_user_id is null or v_user_id <> p_actor_id then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if v_client_nonce is not null then
    select *
    into v_existing_spin
    from public.bolla_master_spins
    where player_id = v_user_id
      and client_nonce = v_client_nonce
    limit 1;

    if found then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'spin', jsonb_build_object(
          'id', v_existing_spin.id,
          'reels', v_existing_spin.reels,
          'reward', v_existing_spin.reward,
          'multiplier', v_existing_spin.multiplier
        ),
        'data', public.bolla_master_state_payload(v_user_id)
      );
    end if;
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if coalesce(v_profile.banned, false) then
    return jsonb_build_object('error', 'account_banned');
  end if;

  if exists (
    select 1
    from public.self_exclusions
    where player_id = v_user_id
      and active = true
  ) then
    return jsonb_build_object('error', 'self_excluded');
  end if;

  v_state := public.bolla_master_apply_energy_regen(v_user_id);

  if v_state.daily_spins >= v_state.daily_spin_limit then
    return jsonb_build_object('error', 'daily_limit_reached', 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  if v_state.energy <= 0 then
    return jsonb_build_object('error', 'no_energy', 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  select sum((s->>'weight')::integer)
  into v_total_weight
  from jsonb_array_elements(v_symbol_defs) s;

  for v_idx in 1..3 loop
    v_roll := floor(random() * v_total_weight)::integer;
    v_acc := 0;

    for v_symbol in select * from jsonb_array_elements(v_symbol_defs) loop
      v_acc := v_acc + (v_symbol->>'weight')::integer;
      if v_roll < v_acc then
        v_result := v_result || jsonb_build_array(v_symbol);
        v_reels := v_reels || (v_symbol->>'key');
        v_gold_delta := v_gold_delta + coalesce((v_symbol->>'gold')::bigint, 0);
        v_diamonds_delta := v_diamonds_delta + coalesce((v_symbol->>'diamonds')::numeric, 0);
        v_tickets_delta := v_tickets_delta + coalesce((v_symbol->>'tickets')::integer, 0);
        v_shields_delta := v_shields_delta + coalesce((v_symbol->>'shields')::integer, 0);
        exit;
      end if;
    end loop;
  end loop;

  select max(symbol_count)
  into v_max_count
  from (
    select count(*)::integer as symbol_count
    from unnest(v_reels) as r(symbol_key)
    group by symbol_key
  ) c;

  v_multiplier := case
    when coalesce(v_max_count, 1) >= 3 then 3
    when coalesce(v_max_count, 1) = 2 then 2
    else 1
  end;

  v_gold_delta := v_gold_delta * v_multiplier;
  v_diamonds_delta := v_diamonds_delta * v_multiplier;
  v_tickets_delta := v_tickets_delta * v_multiplier;
  v_shields_delta := v_shields_delta * v_multiplier;

  v_energy_before := v_state.energy;
  v_energy_after := greatest(0, v_energy_before - 1);

  update public.profiles
  set gold_coins = coalesce(gold_coins, 0) + v_gold_delta,
      diamonds = coalesce(diamonds, 0) + v_diamonds_delta
  where id = v_user_id
  returning gold_coins, diamonds into v_gold_balance, v_diamonds_balance;

  update public.bolla_master_player_state
  set energy = v_energy_after,
      tickets = least(99, tickets + v_tickets_delta),
      shields = least(5, shields + v_shields_delta),
      daily_spins = daily_spins + 1,
      last_energy_at = case when v_energy_before >= max_energy then now() else last_energy_at end,
      updated_at = now()
  where player_id = v_user_id
  returning * into v_state;

  v_balance_after := jsonb_build_object(
    'gold', coalesce(v_gold_balance, 0),
    'diamonds', coalesce(v_diamonds_balance, 0)
  );

  v_state_after := jsonb_build_object(
    'energy', v_state.energy,
    'tickets', v_state.tickets,
    'shields', v_state.shields,
    'daily_spins', v_state.daily_spins,
    'building_levels', v_state.building_levels
  );

  insert into public.bolla_master_spins (
    player_id,
    client_nonce,
    reels,
    multiplier,
    reward,
    gold_delta,
    diamonds_delta,
    tickets_delta,
    shields_delta,
    energy_before,
    energy_after,
    profile_balance_after,
    state_after
  )
  values (
    v_user_id,
    v_client_nonce,
    v_reels,
    v_multiplier,
    jsonb_build_object(
      'symbols', v_result,
      'gold', v_gold_delta,
      'diamonds', v_diamonds_delta,
      'tickets', v_tickets_delta,
      'shields', v_shields_delta
    ),
    v_gold_delta,
    v_diamonds_delta,
    v_tickets_delta,
    v_shields_delta,
    v_energy_before,
    v_energy_after,
    v_balance_after,
    v_state_after
  )
  returning id into v_spin_id;

  insert into public.bolla_master_events (player_id, event_type, ref_id, payload)
  values (
    v_user_id,
    'spin',
    v_spin_id,
    jsonb_build_object('reels', v_reels, 'reward', v_result, 'multiplier', v_multiplier)
  );

  return jsonb_build_object(
    'ok', true,
    'spin', jsonb_build_object(
      'id', v_spin_id,
      'reels', v_reels,
      'reward', jsonb_build_object(
        'gold', v_gold_delta,
        'diamonds', v_diamonds_delta,
        'tickets', v_tickets_delta,
        'shields', v_shields_delta
      ),
      'multiplier', v_multiplier
    ),
    'data', public.bolla_master_state_payload(v_user_id)
  );
end;
$$;

create or replace function public.service_refill_bolla_master_energy(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_state public.bolla_master_player_state%rowtype;
begin
  perform public.service_set_actor(p_actor_id);
  v_user_id := auth.uid();

  if v_user_id is null or v_user_id <> p_actor_id then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  v_state := public.bolla_master_apply_energy_regen(v_user_id);

  if v_state.energy >= v_state.max_energy then
    return jsonb_build_object('error', 'energy_full', 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  if v_state.tickets < 4 then
    return jsonb_build_object('error', 'not_enough_tickets', 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  update public.bolla_master_player_state
  set tickets = tickets - 4,
      energy = least(max_energy, energy + 1),
      last_energy_at = case when energy + 1 >= max_energy then now() else last_energy_at end,
      updated_at = now()
  where player_id = v_user_id
  returning * into v_state;

  insert into public.bolla_master_events (player_id, event_type, payload)
  values (v_user_id, 'refill', jsonb_build_object('tickets_delta', -4, 'energy_delta', 1));

  return jsonb_build_object('ok', true, 'data', public.bolla_master_state_payload(v_user_id));
end;
$$;

create or replace function public.service_upgrade_bolla_master_building(
  p_actor_id uuid,
  p_building_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile public.profiles%rowtype;
  v_state public.bolla_master_player_state%rowtype;
  v_from_level integer;
  v_to_level integer;
  v_cost bigint;
  v_gold_balance bigint;
  v_upgrade_id uuid;
  v_state_after jsonb;
begin
  perform public.service_set_actor(p_actor_id);
  v_user_id := auth.uid();

  if v_user_id is null or v_user_id <> p_actor_id then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if p_building_key not in ('hotel_neon','muelle_dorado','sala_vip') then
    return jsonb_build_object('error', 'invalid_building');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if coalesce(v_profile.banned, false) then
    return jsonb_build_object('error', 'account_banned');
  end if;

  if exists (
    select 1
    from public.self_exclusions
    where player_id = v_user_id
      and active = true
  ) then
    return jsonb_build_object('error', 'self_excluded');
  end if;

  v_state := public.bolla_master_apply_energy_regen(v_user_id);
  v_from_level := coalesce((v_state.building_levels->>p_building_key)::integer, 0);

  if v_from_level >= 5 then
    return jsonb_build_object('error', 'max_level', 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  v_cost := public.bolla_master_building_cost(p_building_key, v_from_level);

  if coalesce(v_profile.gold_coins, 0) < v_cost then
    return jsonb_build_object('error', 'insufficient_gold', 'cost', v_cost, 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  v_to_level := v_from_level + 1;

  update public.profiles
  set gold_coins = gold_coins - v_cost
  where id = v_user_id
    and gold_coins >= v_cost
  returning gold_coins into v_gold_balance;

  if v_gold_balance is null then
    return jsonb_build_object('error', 'insufficient_gold', 'cost', v_cost, 'data', public.bolla_master_state_payload(v_user_id));
  end if;

  update public.bolla_master_player_state
  set building_levels = jsonb_set(building_levels, array[p_building_key], to_jsonb(v_to_level), true),
      updated_at = now()
  where player_id = v_user_id
  returning * into v_state;

  v_state_after := jsonb_build_object(
    'energy', v_state.energy,
    'tickets', v_state.tickets,
    'shields', v_state.shields,
    'building_levels', v_state.building_levels
  );

  insert into public.bolla_master_upgrades (
    player_id,
    building_key,
    from_level,
    to_level,
    gold_cost,
    gold_balance_after,
    state_after
  )
  values (
    v_user_id,
    p_building_key,
    v_from_level,
    v_to_level,
    v_cost,
    v_gold_balance,
    v_state_after
  )
  returning id into v_upgrade_id;

  insert into public.bolla_master_events (player_id, event_type, ref_id, payload)
  values (
    v_user_id,
    'upgrade',
    v_upgrade_id,
    jsonb_build_object('building_key', p_building_key, 'from_level', v_from_level, 'to_level', v_to_level, 'gold_cost', v_cost)
  );

  return jsonb_build_object(
    'ok', true,
    'upgrade', jsonb_build_object(
      'id', v_upgrade_id,
      'building_key', p_building_key,
      'from_level', v_from_level,
      'to_level', v_to_level,
      'gold_cost', v_cost
    ),
    'data', public.bolla_master_state_payload(v_user_id)
  );
end;
$$;

revoke all on function public.bolla_master_building_cost(text, integer) from public, anon, authenticated;
revoke all on function public.bolla_master_apply_energy_regen(uuid) from public, anon, authenticated;
revoke all on function public.bolla_master_state_payload(uuid) from public, anon, authenticated;
revoke all on function public.service_get_bolla_master_state(uuid) from public, anon, authenticated;
revoke all on function public.service_spin_bolla_master(uuid, text) from public, anon, authenticated;
revoke all on function public.service_refill_bolla_master_energy(uuid) from public, anon, authenticated;
revoke all on function public.service_upgrade_bolla_master_building(uuid, text) from public, anon, authenticated;

grant execute on function public.bolla_master_building_cost(text, integer) to service_role;
grant execute on function public.bolla_master_apply_energy_regen(uuid) to service_role;
grant execute on function public.bolla_master_state_payload(uuid) to service_role;
grant execute on function public.service_get_bolla_master_state(uuid) to service_role;
grant execute on function public.service_spin_bolla_master(uuid, text) to service_role;
grant execute on function public.service_refill_bolla_master_energy(uuid) to service_role;
grant execute on function public.service_upgrade_bolla_master_building(uuid, text) to service_role;
