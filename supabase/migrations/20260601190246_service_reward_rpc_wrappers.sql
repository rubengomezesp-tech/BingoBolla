-- Backend-for-frontend wrappers for reward, promo, XP, and winner overlay RPCs.
-- The direct browser grants are revoked in a follow-up migration after deploy.

create or replace function public.service_daily_bonus_status(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.daily_bonus_status();
end;
$$;

create or replace function public.service_claim_daily_bonus(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.claim_daily_bonus();
end;
$$;

create or replace function public.service_claim_daily_xp(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.service_set_actor(p_actor_id);

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_result
  from public.claim_daily_xp() x;

  return v_result;
end;
$$;

create or replace function public.service_claim_streak(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.claim_streak();
end;
$$;

create or replace function public.service_redeem_code(
  p_actor_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.redeem_code(p_code);
end;
$$;

create or replace function public.service_claim_winner_info(
  p_actor_id uuid,
  p_game_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.claim_winner_info(p_game_id);
end;
$$;

revoke all on function public.service_daily_bonus_status(uuid) from public, anon, authenticated;
revoke all on function public.service_claim_daily_bonus(uuid) from public, anon, authenticated;
revoke all on function public.service_claim_daily_xp(uuid) from public, anon, authenticated;
revoke all on function public.service_claim_streak(uuid) from public, anon, authenticated;
revoke all on function public.service_redeem_code(uuid, text) from public, anon, authenticated;
revoke all on function public.service_claim_winner_info(uuid, uuid) from public, anon, authenticated;

grant execute on function public.service_daily_bonus_status(uuid) to service_role;
grant execute on function public.service_claim_daily_bonus(uuid) to service_role;
grant execute on function public.service_claim_daily_xp(uuid) to service_role;
grant execute on function public.service_claim_streak(uuid) to service_role;
grant execute on function public.service_redeem_code(uuid, text) to service_role;
grant execute on function public.service_claim_winner_info(uuid, uuid) to service_role;
