-- P7 signup/onboarding hardening.
-- Keep the app-wide age rule consistent at 21+, persist signup consent evidence,
-- and mark community referrals as activated when onboarding completes.

alter table public.profiles
  add column if not exists signup_age_gate_confirmed boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

alter table public.profiles
  drop constraint if exists profiles_terms_version_length,
  add constraint profiles_terms_version_length
    check (terms_version is null or char_length(terms_version) <= 40);

create or replace function public.submit_onboarding(
  p_date_of_birth date,
  p_state text,
  p_country text default 'US'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_age int;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_country != 'US' then raise exception 'unsupported_country'; end if;
  if p_state !~ '^[A-Z]{2}$' then raise exception 'invalid_state'; end if;

  v_age := public.calculate_age(p_date_of_birth);
  if v_age < 21 then raise exception 'underage' using errcode = 'P0001'; end if;

  if exists (select 1 from public.excluded_states where state = p_state and blocks_signup = true) then
    raise exception 'state_blocked';
  end if;

  update public.profiles set
    date_of_birth = p_date_of_birth,
    state = p_state,
    country = p_country,
    age_verified = true,
    kyc_status = 'self_declared',
    kyc_provider = 'self',
    kyc_verified_at = now()
  where id = v_user_id;

  update public.community_referrals
  set status = 'onboarded',
      activated_at = coalesce(activated_at, now())
  where referred_id = v_user_id
    and status = 'registered'
    and reward_status <> 'blocked';

  return jsonb_build_object(
    'verified', true,
    'state', p_state,
    'age', v_age,
    'minimum_age', 21,
    'can_use_sweeps', not public.is_state_excluded(p_state)
  );
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
  terms_at timestamptz;
begin
  begin
    terms_at := nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz;
  exception when others then
    terms_at := null;
  end;

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
    referral_code,
    signup_age_gate_confirmed,
    terms_accepted_at,
    terms_version
  )
  values (
    new.id,
    final_username,
    nullif(new.raw_user_meta_data->>'display_name', ''),
    2000,
    2.00,
    public.community_referral_code_for_profile(final_username, new.id),
    coalesce(lower(coalesce(new.raw_user_meta_data->>'age_gate_confirmed', 'false')) in ('true', '1', 'yes'), false),
    terms_at,
    substring(nullif(new.raw_user_meta_data->>'terms_version', '') from 1 for 40)
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

update public.community_referrals cr
set status = 'onboarded',
    activated_at = coalesce(cr.activated_at, p.kyc_verified_at, now())
from public.profiles p
where cr.referred_id = p.id
  and cr.status = 'registered'
  and cr.reward_status <> 'blocked'
  and (
    coalesce(p.kyc_status, 'unverified') in ('self_declared', 'verified')
    or coalesce(p.age_verified, false)
  );

revoke all on function public.submit_onboarding(date, text, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.submit_onboarding(date, text, text) to service_role;
