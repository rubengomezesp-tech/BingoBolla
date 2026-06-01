-- Backend-for-frontend wrappers for account safety and redemption RPCs.
-- Direct browser grants are revoked after the BFF deploy is live.

create or replace function public.service_submit_onboarding(
  p_actor_id uuid,
  p_date_of_birth date,
  p_state text,
  p_country text default 'US'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.submit_onboarding(p_date_of_birth, p_state, p_country);
end;
$$;

create or replace function public.service_upsert_rg_limits(
  p_actor_id uuid,
  p_limits jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.upsert_rg_limits(p_limits);
end;
$$;

create or replace function public.service_request_self_exclusion(
  p_actor_id uuid,
  p_period text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.request_self_exclusion(p_period, p_reason);
end;
$$;

create or replace function public.service_request_diamond_redemption(
  p_actor_id uuid,
  p_diamond_amount numeric,
  p_payment_method text,
  p_payment_details jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.request_diamond_redemption(p_diamond_amount, p_payment_method, p_payment_details);
end;
$$;

revoke all on function public.service_submit_onboarding(uuid, date, text, text) from public, anon, authenticated;
revoke all on function public.service_upsert_rg_limits(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.service_request_self_exclusion(uuid, text, text) from public, anon, authenticated;
revoke all on function public.service_request_diamond_redemption(uuid, numeric, text, jsonb) from public, anon, authenticated;

grant execute on function public.service_submit_onboarding(uuid, date, text, text) to service_role;
grant execute on function public.service_upsert_rg_limits(uuid, jsonb) to service_role;
grant execute on function public.service_request_self_exclusion(uuid, text, text) to service_role;
grant execute on function public.service_request_diamond_redemption(uuid, numeric, text, jsonb) to service_role;
