-- Backend-for-frontend RPC wrappers.
-- These are service-role only and let Next.js API routes perform sensitive
-- mutations while still preserving auth.uid() semantics inside legacy RPCs.

create or replace function public.service_set_actor(p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

revoke all on function public.service_set_actor(uuid) from public, anon, authenticated;
grant execute on function public.service_set_actor(uuid) to service_role;

create or replace function public.service_buy_ticket(
  p_actor_id uuid,
  p_room_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.buy_ticket(p_room_id, p_currency);
end;
$$;

create or replace function public.service_buy_strip(
  p_actor_id uuid,
  p_room_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.buy_strip(p_room_id, p_currency);
end;
$$;

create or replace function public.service_spin_slot(
  p_actor_id uuid,
  p_slug text,
  p_currency text,
  p_bet numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.spin_slot(p_slug, p_currency, p_bet);
end;
$$;

create or replace function public.service_spin_hold_win(
  p_actor_id uuid,
  p_slug text,
  p_currency text,
  p_bet numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.spin_hold_win(p_slug, p_currency, p_bet);
end;
$$;

create or replace function public.service_play_slot(
  p_actor_id uuid,
  p_machine_id uuid,
  p_bet numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.play_slot(p_machine_id, p_bet, p_currency);
end;
$$;

create or replace function public.service_admin_stats(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.admin_stats();
end;
$$;

create or replace function public.service_admin_list_codes(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.admin_list_codes();
end;
$$;

create or replace function public.service_admin_grant_coins(
  p_actor_id uuid,
  p_email text,
  p_gold bigint,
  p_sweeps numeric,
  p_diamonds numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.admin_grant_coins(p_email, p_gold, p_sweeps, p_diamonds);
end;
$$;

create or replace function public.service_admin_create_code(
  p_actor_id uuid,
  p_code text,
  p_kind text,
  p_gold bigint,
  p_sweeps numeric,
  p_diamonds numeric,
  p_discount_pct int,
  p_max_uses int,
  p_expires_days int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.admin_create_code(
    p_code,
    p_kind,
    p_gold,
    p_sweeps,
    p_diamonds,
    p_discount_pct,
    p_max_uses,
    p_expires_days
  );
end;
$$;

revoke all on function public.service_buy_ticket(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.service_buy_strip(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.service_spin_slot(uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.service_spin_hold_win(uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.service_play_slot(uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.service_admin_stats(uuid) from public, anon, authenticated;
revoke all on function public.service_admin_list_codes(uuid) from public, anon, authenticated;
revoke all on function public.service_admin_grant_coins(uuid, text, bigint, numeric, numeric) from public, anon, authenticated;
revoke all on function public.service_admin_create_code(uuid, text, text, bigint, numeric, numeric, int, int, int) from public, anon, authenticated;

grant execute on function public.service_buy_ticket(uuid, uuid, text) to service_role;
grant execute on function public.service_buy_strip(uuid, uuid, text) to service_role;
grant execute on function public.service_spin_slot(uuid, text, text, numeric) to service_role;
grant execute on function public.service_spin_hold_win(uuid, text, text, numeric) to service_role;
grant execute on function public.service_play_slot(uuid, uuid, numeric, text) to service_role;
grant execute on function public.service_admin_stats(uuid) to service_role;
grant execute on function public.service_admin_list_codes(uuid) to service_role;
grant execute on function public.service_admin_grant_coins(uuid, text, bigint, numeric, numeric) to service_role;
grant execute on function public.service_admin_create_code(uuid, text, text, bigint, numeric, numeric, int, int, int) to service_role;
