-- Rebalance Bolla Master economy after the first backend rollout.
-- Keeps the loop playful without flooding notifications or inflating Gold/Diamonds.

alter table public.bolla_master_player_state
  alter column energy_regen_seconds set default 900,
  alter column tickets set default 8,
  alter column daily_spin_limit set default 30;

alter table public.bolla_master_player_state
  drop constraint if exists bolla_master_player_state_daily_spin_limit_check;

update public.bolla_master_player_state
set daily_spin_limit = least(daily_spin_limit, 30),
    energy_regen_seconds = greatest(energy_regen_seconds, 900),
    updated_at = now()
where daily_spin_limit > 30
   or energy_regen_seconds < 900;

alter table public.bolla_master_player_state
  add constraint bolla_master_player_state_daily_spin_limit_check
  check (daily_spin_limit between 1 and 60);

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

revoke all on function public.bolla_master_building_cost(text, integer) from public, anon, authenticated;
revoke all on function public.service_spin_bolla_master(uuid, text) from public, anon, authenticated;
revoke all on function public.service_refill_bolla_master_energy(uuid) from public, anon, authenticated;

grant execute on function public.bolla_master_building_cost(text, integer) to service_role;
grant execute on function public.service_spin_bolla_master(uuid, text) to service_role;
grant execute on function public.service_refill_bolla_master_energy(uuid) to service_role;
