-- BingoBolla v26 - Cosmetics + roulette rewards

alter table profiles
  add column if not exists diamonds numeric default 0,
  add column if not exists roulette_last_spin_at timestamptz;

create table if not exists player_cosmetics (
  player_id uuid primary key references profiles on delete cascade,
  loadout jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table player_cosmetics enable row level security;

drop policy if exists "read own cosmetics" on player_cosmetics;
create policy "read own cosmetics" on player_cosmetics
  for select using (auth.uid() = player_id);

drop policy if exists "insert own cosmetics" on player_cosmetics;
create policy "insert own cosmetics" on player_cosmetics
  for insert with check (auth.uid() = player_id);

drop policy if exists "update own cosmetics" on player_cosmetics;
create policy "update own cosmetics" on player_cosmetics
  for update using (auth.uid() = player_id);

create table if not exists roulette_spin_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  prize_key text not null,
  gold_awarded bigint default 0,
  sweeps_awarded numeric(10,2) default 0,
  diamonds_awarded numeric default 0,
  created_at timestamptz default now()
);

alter table roulette_spin_history enable row level security;

drop policy if exists "read own roulette spins" on roulette_spin_history;
create policy "read own roulette spins" on roulette_spin_history
  for select using (auth.uid() = player_id);

create or replace function get_player_cosmetics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_loadout jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select loadout into v_loadout
  from player_cosmetics
  where player_id = v_user_id;

  return jsonb_build_object('ok', true, 'loadout', coalesce(v_loadout, '{}'::jsonb));
end;
$$;

grant execute on function get_player_cosmetics() to authenticated;

create or replace function save_player_cosmetics(p_loadout jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  insert into player_cosmetics (player_id, loadout, updated_at)
  values (v_user_id, coalesce(p_loadout, '{}'::jsonb), now())
  on conflict (player_id) do update
    set loadout = excluded.loadout,
        updated_at = now();

  return jsonb_build_object('ok', true, 'loadout', coalesce(p_loadout, '{}'::jsonb));
end;
$$;

grant execute on function save_player_cosmetics(jsonb) to authenticated;

create or replace function claim_roulette_spin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last timestamptz;
  v_roll numeric := random();
  v_prize_key text;
  v_gold bigint := 0;
  v_sweeps numeric(10,2) := 0;
  v_diamonds numeric := 0;
  v_new_gold bigint;
  v_new_sweeps numeric;
  v_new_diamonds numeric;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select roulette_last_spin_at into v_last
  from profiles
  where id = v_user_id
  for update;

  if v_last is not null and v_last > now() - interval '8 hours' then
    return jsonb_build_object(
      'error', 'already_claimed',
      'seconds_left', extract(epoch from ((v_last + interval '8 hours') - now()))::int
    );
  end if;

  if v_roll < 0.32 then
    v_prize_key := 'gold_250';
    v_gold := 250;
  elsif v_roll < 0.54 then
    v_prize_key := 'gold_500';
    v_gold := 500;
  elsif v_roll < 0.72 then
    v_prize_key := 'sweeps_025';
    v_sweeps := 0.25;
  elsif v_roll < 0.88 then
    v_prize_key := 'diamonds_5';
    v_diamonds := 5;
  else
    v_prize_key := 'gold_1000';
    v_gold := 1000;
  end if;

  update profiles set
    gold_coins = coalesce(gold_coins, 0) + v_gold,
    sweeps_coins = coalesce(sweeps_coins, 0) + v_sweeps,
    diamonds = coalesce(diamonds, 0) + v_diamonds,
    roulette_last_spin_at = now()
  where id = v_user_id
  returning gold_coins, sweeps_coins, diamonds into v_new_gold, v_new_sweeps, v_new_diamonds;

  if v_gold > 0 then
    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
    values (v_user_id, 'gold', v_gold, v_new_gold, 'roulette_spin', v_user_id);
  end if;

  if v_sweeps > 0 then
    insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
    values (v_user_id, 'sweeps', v_sweeps, v_new_sweeps, 'roulette_spin', v_user_id);
  end if;

  insert into roulette_spin_history (player_id, prize_key, gold_awarded, sweeps_awarded, diamonds_awarded)
  values (v_user_id, v_prize_key, v_gold, v_sweeps, v_diamonds);

  return jsonb_build_object(
    'ok', true,
    'prize_key', v_prize_key,
    'gold_awarded', v_gold,
    'sweeps_awarded', v_sweeps,
    'diamonds_awarded', v_diamonds,
    'new_gold', v_new_gold,
    'new_sweeps', v_new_sweeps,
    'new_diamonds', v_new_diamonds,
    'next_at', now() + interval '8 hours'
  );
end;
$$;

grant execute on function claim_roulette_spin() to authenticated;
