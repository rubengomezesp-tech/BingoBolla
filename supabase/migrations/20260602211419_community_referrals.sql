-- Community referrals foundation.
-- Server-only social growth ledger for invite links and referral stats.

alter table public.profiles
  add column if not exists referral_code text;

create or replace function public.community_normalize_username(
  p_value text,
  p_fallback uuid
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_username text;
  v_suffix text := substring(replace(coalesce(p_fallback::text, '00000000'), '-', '') from 1 for 8);
begin
  v_username := lower(regexp_replace(coalesce(p_value, ''), '[^a-z0-9_]+', '_', 'g'));
  v_username := btrim(v_username, '_');

  if char_length(v_username) < 3 then
    v_username := 'player_' || v_suffix;
  end if;

  return substring(v_username from 1 for 20);
end;
$$;

create or replace function public.community_referral_code_for_profile(
  p_username text,
  p_player_id uuid
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_raw text := lower(coalesce(p_username, ''));
  v_code text;
  v_suffix text := substring(replace(coalesce(p_player_id::text, '00000000'), '-', '') from 1 for 8);
begin
  v_code := lower(regexp_replace(v_raw, '[^a-z0-9_]+', '_', 'g'));
  v_code := btrim(v_code, '_');

  if char_length(v_code) < 3 then
    v_code := 'bb_' || v_suffix;
  elsif v_raw !~ '^[a-z0-9_]{3,32}$' then
    v_code := substring(v_code from 1 for 32) || '_' || v_suffix;
  end if;

  return substring(v_code from 1 for 48);
end;
$$;

create or replace function public.community_normalize_referral_lookup(p_value text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_code text;
begin
  v_code := lower(regexp_replace(coalesce(p_value, ''), '[^a-z0-9_]+', '_', 'g'));
  v_code := btrim(v_code, '_');

  if char_length(v_code) < 3 or char_length(v_code) > 80 then
    return null;
  end if;

  return substring(v_code from 1 for 48);
end;
$$;

update public.profiles
set referral_code = public.community_referral_code_for_profile(username, id)
where referral_code is null;

alter table public.profiles
  alter column referral_code set not null;

alter table public.profiles
  drop constraint if exists profiles_referral_code_format,
  add constraint profiles_referral_code_format
    check (referral_code ~ '^[a-z0-9_]{3,48}$');

create unique index if not exists profiles_referral_code_uidx
  on public.profiles(referral_code);

create table if not exists public.community_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  source text not null default 'signup',
  status text not null default 'registered',
  reward_status text not null default 'pending',
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  reward_claimed_at timestamptz,
  constraint community_referrals_unique_referred unique (referred_id),
  constraint community_referrals_not_self check (referrer_id <> referred_id),
  constraint community_referrals_code_format check (referral_code ~ '^[a-z0-9_]{3,48}$'),
  constraint community_referrals_source_format check (source ~ '^[a-z0-9_-]{2,40}$'),
  constraint community_referrals_status_check check (status in ('registered', 'onboarded', 'qualified', 'blocked')),
  constraint community_referrals_reward_status_check check (reward_status in ('pending', 'claimed', 'blocked'))
);

create index if not exists community_referrals_referrer_created_idx
  on public.community_referrals(referrer_id, created_at desc);

create index if not exists community_referrals_code_created_idx
  on public.community_referrals(referral_code, created_at desc);

alter table public.community_referrals enable row level security;

drop policy if exists community_referrals_referrer_select on public.community_referrals;
create policy community_referrals_referrer_select
  on public.community_referrals for select
  using (auth.uid() = referrer_id);

revoke all on table public.community_referrals from anon, authenticated;
grant select, insert, update, delete on table public.community_referrals to service_role;

comment on table public.community_referrals is
  'Server-owned community referral ledger populated from signup metadata.';
comment on column public.community_referrals.referral_code is
  'Snapshot of the referrer code used at signup.';

create or replace function public.community_attach_referral(
  p_referred_id uuid,
  p_referral_code text,
  p_source text default 'signup'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_referrer_id uuid;
  v_source text := lower(regexp_replace(coalesce(p_source, 'signup'), '[^a-z0-9_-]+', '_', 'g'));
begin
  if p_referred_id is null then
    return;
  end if;

  v_code := public.community_normalize_referral_lookup(p_referral_code);
  if v_code is null then
    return;
  end if;

  if char_length(v_source) < 2 then
    v_source := 'signup';
  end if;

  select id
  into v_referrer_id
  from public.profiles
  where referral_code = v_code or lower(username) = v_code
  order by created_at asc
  limit 1;

  if v_referrer_id is null or v_referrer_id = p_referred_id then
    return;
  end if;

  insert into public.community_referrals (
    referrer_id,
    referred_id,
    referral_code,
    source
  )
  values (
    v_referrer_id,
    p_referred_id,
    v_code,
    substring(v_source from 1 for 40)
  )
  on conflict (referred_id) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
  rows_inserted int := 0;
begin
  base_username := public.community_normalize_username(
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1), 'player'),
    new.id
  );
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := substring(base_username from 1 for greatest(3, 20 - char_length(counter::text))) || counter::text;
  end loop;

  insert into public.profiles (
    id,
    username,
    display_name,
    gold_coins,
    sweeps_coins,
    referral_code
  )
  values (
    new.id,
    final_username,
    nullif(new.raw_user_meta_data->>'display_name', ''),
    2000,
    2.00,
    public.community_referral_code_for_profile(final_username, new.id)
  )
  on conflict (id) do nothing;

  get diagnostics rows_inserted = row_count;

  if rows_inserted > 0 then
    insert into public.coin_tx (player_id, currency, amount, balance_after, reason)
    values
      (new.id, 'gold', 2000, 2000, 'signup_bonus'),
      (new.id, 'sweeps', 2.00, 2.00, 'signup_bonus');
  end if;

  perform public.community_attach_referral(
    new.id,
    new.raw_user_meta_data->>'referral_code',
    'signup'
  );

  return new;
end;
$$;

create or replace function public.service_get_community_referral_stats(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_total int := 0;
  v_onboarded int := 0;
  v_pending_rewards int := 0;
  v_recent jsonb := '[]'::jsonb;
begin
  if p_actor_id is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  perform public.service_set_actor(p_actor_id);

  select *
  into v_profile
  from public.profiles
  where id = p_actor_id;

  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  if v_profile.referral_code is null then
    update public.profiles
    set referral_code = public.community_referral_code_for_profile(username, id)
    where id = p_actor_id
    returning * into v_profile;
  end if;

  select
    count(*)::int,
    count(*) filter (
      where coalesce(p.kyc_status, 'unverified') <> 'unverified' or coalesce(p.age_verified, false)
    )::int,
    count(*) filter (
      where cr.reward_status = 'pending'
        and (coalesce(p.kyc_status, 'unverified') <> 'unverified' or coalesce(p.age_verified, false))
    )::int
  into v_total, v_onboarded, v_pending_rewards
  from public.community_referrals cr
  join public.profiles p on p.id = cr.referred_id
  where cr.referrer_id = p_actor_id;

  select coalesce(jsonb_agg(item order by created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select
      cr.created_at,
      jsonb_build_object(
        'username', coalesce(nullif(p.display_name, ''), p.username, 'Jugador'),
        'joined_at', cr.created_at,
        'status',
          case
            when coalesce(p.kyc_status, 'unverified') <> 'unverified' or coalesce(p.age_verified, false)
              then 'onboarded'
            else cr.status
          end,
        'reward_status', cr.reward_status
      ) as item
    from public.community_referrals cr
    join public.profiles p on p.id = cr.referred_id
    where cr.referrer_id = p_actor_id
    order by cr.created_at desc
    limit 8
  ) recent_rows;

  return jsonb_build_object(
    'ok', true,
    'referral_code', v_profile.referral_code,
    'stats', jsonb_build_object(
      'total_registered', v_total,
      'onboarded', v_onboarded,
      'pending_rewards', v_pending_rewards,
      'next_goal', case when v_total < 1 then 1 when v_total < 5 then 5 when v_total < 25 then 25 else 100 end
    ),
    'recent_referrals', v_recent
  );
end;
$$;

revoke all on function public.community_normalize_username(text, uuid) from public, anon, authenticated;
revoke all on function public.community_referral_code_for_profile(text, uuid) from public, anon, authenticated;
revoke all on function public.community_normalize_referral_lookup(text) from public, anon, authenticated;
revoke all on function public.community_attach_referral(uuid, text, text) from public, anon, authenticated;
revoke all on function public.service_get_community_referral_stats(uuid) from public, anon, authenticated;

grant execute on function public.service_get_community_referral_stats(uuid) to service_role;
