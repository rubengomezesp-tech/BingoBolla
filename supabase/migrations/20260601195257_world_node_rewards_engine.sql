-- World node reward engine.
-- Rewards are granted only for newly earned stars, making replays useful
-- for mastery without enabling infinite farming.

create table if not exists public.world_node_reward_claims (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles on delete cascade,
  node_id uuid not null references public.world_nodes on delete cascade,
  run_id uuid references public.world_game_runs on delete set null,
  stars_before int not null check (stars_before between 0 and 3),
  stars_after int not null check (stars_after between 1 and 3),
  star_delta int not null check (star_delta between 1 and 3),
  score bigint not null default 0,
  xp_awarded int not null default 0,
  gold_awarded bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, node_id, stars_after)
);

create index if not exists idx_world_node_reward_claims_player_created
  on public.world_node_reward_claims(player_id, created_at desc);

create index if not exists idx_world_node_reward_claims_node_created
  on public.world_node_reward_claims(node_id, created_at desc);

alter table public.world_node_reward_claims enable row level security;

drop policy if exists "own world reward claims read" on public.world_node_reward_claims;
create policy "own world reward claims read" on public.world_node_reward_claims
  for select using (auth.uid() = player_id);

revoke all on table public.world_node_reward_claims from anon, authenticated;
grant select on table public.world_node_reward_claims to authenticated;
grant all on table public.world_node_reward_claims to service_role;

create or replace function public.xp_total_for_level(p_level integer)
returns bigint
language sql
immutable
as $$
  select case
    when p_level <= 1 then 0::bigint
    else floor(100 * power(p_level - 1, 1.6))::bigint
  end;
$$;

create or replace function public.level_from_xp(p_xp bigint)
returns integer
language plpgsql
immutable
as $$
declare
  lv int := 1;
begin
  while p_xp >= public.xp_total_for_level(lv + 1) and lv < 999 loop
    lv := lv + 1;
  end loop;

  return lv;
end;
$$;

create or replace function public.add_xp(
  p_player_id uuid,
  p_amount integer
)
returns table (
  new_xp bigint,
  new_level integer,
  leveled_up boolean,
  levels_gained integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_level int;
  v_old_xp bigint;
  v_new_xp bigint;
  v_new_level int;
begin
  if p_player_id is null then
    raise exception 'player_required';
  end if;

  insert into public.player_xp (player_id, xp, level)
  values (p_player_id, 0, 1)
  on conflict (player_id) do nothing;

  select xp, level
  into v_old_xp, v_old_level
  from public.player_xp
  where player_id = p_player_id
  for update;

  if p_amount is null or p_amount <= 0 then
    update public.profiles
    set xp = v_old_xp,
        level = v_old_level
    where id = p_player_id;

    return query select v_old_xp, v_old_level, false, 0;
    return;
  end if;

  v_new_xp := v_old_xp + p_amount;
  v_new_level := public.level_from_xp(v_new_xp);

  update public.player_xp
  set xp = v_new_xp,
      level = v_new_level,
      updated_at = now()
  where player_id = p_player_id;

  update public.profiles
  set xp = v_new_xp,
      level = v_new_level
  where id = p_player_id;

  return query select
    v_new_xp,
    v_new_level,
    (v_new_level > v_old_level),
    (v_new_level - v_old_level);
end;
$$;

revoke all on function public.add_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_xp(uuid, integer) to service_role;

create or replace function public.service_complete_world_node_reward(
  p_actor_id uuid,
  p_node_id uuid,
  p_run_id uuid,
  p_score bigint,
  p_stars int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node public.world_nodes%rowtype;
  v_map_node record;
  v_previous public.player_world_progress%rowtype;
  v_has_previous boolean := false;
  v_existing_stars int := 0;
  v_stars_after int;
  v_star_delta int;
  v_completed_first_time boolean := false;
  v_best_score bigint;
  v_xp_awarded int := 0;
  v_gold_awarded bigint := 0;
  v_new_gold_balance numeric;
  v_claim_id uuid;
  v_closed_run_id uuid;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;
  if p_node_id is null then
    raise exception 'node_required';
  end if;
  if p_score is null or p_score < 1 then
    raise exception 'invalid_score';
  end if;

  perform public.service_set_actor(p_actor_id);
  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || p_node_id::text, 0));

  select *
  into v_node
  from public.world_nodes
  where id = p_node_id
    and active = true;

  if not found then
    raise exception 'node_not_found';
  end if;

  if p_stars is null or p_stars < 1 or p_stars > coalesce(v_node.max_stars, 3) then
    raise exception 'invalid_stars';
  end if;

  select *
  into v_map_node
  from public.get_world_map(v_node.world_id)
  where node_id = p_node_id
  limit 1;

  if not found then
    raise exception 'node_not_found';
  end if;

  if not coalesce(v_map_node.unlocked, false) and not coalesce(v_map_node.completed, false) then
    raise exception 'node_locked';
  end if;

  if p_run_id is not null then
    update public.world_game_runs
    set status = 'completed',
        completed_at = now(),
        score = p_score,
        stars = p_stars
    where id = p_run_id
      and player_id = p_actor_id
      and node_id = p_node_id
      and status = 'started'
    returning id into v_closed_run_id;

    if v_closed_run_id is null then
      raise exception 'run_close_failed';
    end if;
  end if;

  select *
  into v_previous
  from public.player_world_progress
  where player_id = p_actor_id
    and node_id = p_node_id
  for update;

  v_has_previous := found;

  if v_has_previous then
    v_existing_stars := greatest(0, coalesce(v_previous.stars, 0));
    v_completed_first_time := v_previous.completed_at is null;
    v_best_score := greatest(coalesce(v_previous.best_score, 0), p_score);
  else
    v_completed_first_time := true;
    v_best_score := p_score;
  end if;

  v_stars_after := greatest(v_existing_stars, p_stars);
  v_star_delta := greatest(0, v_stars_after - v_existing_stars);

  insert into public.player_world_progress (
    player_id,
    node_id,
    completed,
    stars,
    best_score,
    completed_at,
    updated_at
  )
  values (
    p_actor_id,
    p_node_id,
    true,
    v_stars_after,
    v_best_score,
    now(),
    now()
  )
  on conflict (player_id, node_id) do update
    set completed = true,
        stars = greatest(public.player_world_progress.stars, excluded.stars),
        best_score = greatest(public.player_world_progress.best_score, excluded.best_score),
        completed_at = coalesce(public.player_world_progress.completed_at, excluded.completed_at),
        updated_at = now();

  if v_star_delta > 0 then
    v_xp_awarded := ceil((greatest(coalesce(v_node.reward_xp, 0), 0)::numeric * v_star_delta)
      / greatest(coalesce(v_node.max_stars, 3), 1))::int;
    v_gold_awarded := ceil((greatest(coalesce(v_node.reward_gold, 0), 0)::numeric * v_star_delta)
      / greatest(coalesce(v_node.max_stars, 3), 1))::bigint;

    insert into public.world_node_reward_claims (
      player_id,
      node_id,
      run_id,
      stars_before,
      stars_after,
      star_delta,
      score,
      xp_awarded,
      gold_awarded
    )
    values (
      p_actor_id,
      p_node_id,
      p_run_id,
      v_existing_stars,
      v_stars_after,
      v_star_delta,
      p_score,
      v_xp_awarded,
      v_gold_awarded
    )
    on conflict (player_id, node_id, stars_after) do nothing
    returning id into v_claim_id;

    if v_claim_id is null then
      v_star_delta := 0;
      v_xp_awarded := 0;
      v_gold_awarded := 0;
    end if;
  end if;

  if v_xp_awarded > 0 then
    perform public.add_xp(p_actor_id, v_xp_awarded);
  else
    perform public.add_xp(p_actor_id, 0);
  end if;

  if v_gold_awarded > 0 then
    update public.profiles
    set gold_coins = coalesce(gold_coins, 0) + v_gold_awarded
    where id = p_actor_id
    returning gold_coins into v_new_gold_balance;

    insert into public.coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
    values (p_actor_id, 'gold', v_gold_awarded, v_new_gold_balance, 'world_node_reward', p_node_id);
  else
    select gold_coins into v_new_gold_balance
    from public.profiles
    where id = p_actor_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'node_id', p_node_id,
    'stars', v_stars_after,
    'best_score', v_best_score,
    'completed_first_time', v_completed_first_time,
    'star_delta', v_star_delta,
    'xp_awarded', v_xp_awarded,
    'gold_awarded', v_gold_awarded,
    'new_gold_balance', coalesce(v_new_gold_balance, 0),
    'run_id', p_run_id
  );
end;
$$;

revoke all on function public.service_complete_world_node_reward(uuid, uuid, uuid, bigint, int)
  from public, anon, authenticated;
grant execute on function public.service_complete_world_node_reward(uuid, uuid, uuid, bigint, int)
  to service_role;
