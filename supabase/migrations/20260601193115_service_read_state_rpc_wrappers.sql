-- Backend-for-frontend wrappers for read/state RPCs.
-- These keep auth.uid() semantics for player-specific reads while removing
-- direct browser execution grants in a follow-up migration after deploy.

create or replace function public.service_ensure_waiting_game(
  p_actor_id uuid,
  p_room_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.ensure_waiting_game(p_room_id);
end;
$$;

create or replace function public.service_get_room_state(
  p_actor_id uuid,
  p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.service_get_slot_state(
  p_actor_id uuid,
  p_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.get_slot_state(p_slug);
end;
$$;

create or replace function public.service_get_player_xp(
  p_actor_id uuid,
  p_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.service_set_actor(p_actor_id);

  if p_player_id is distinct from p_actor_id then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_result
  from public.get_player_xp(p_player_id) x;

  return v_result;
end;
$$;

create or replace function public.service_my_progress(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.my_progress();
end;
$$;

create or replace function public.service_my_missions(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.my_missions();
end;
$$;

create or replace function public.service_get_world_map(
  p_actor_id uuid,
  p_world_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.service_set_actor(p_actor_id);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.node_index), '[]'::jsonb)
  into v_result
  from public.get_world_map(p_world_id) x;

  return v_result;
end;
$$;

create or replace function public.service_get_world_assets(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.get_world_assets();
end;
$$;

create or replace function public.service_room_jackpots(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.room_jackpots();
end;
$$;

create or replace function public.service_is_state_excluded(
  p_actor_id uuid,
  p_state text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.service_set_actor(p_actor_id);
  return public.is_state_excluded(p_state);
end;
$$;

revoke all on function public.service_ensure_waiting_game(uuid, uuid) from public, anon, authenticated;
revoke all on function public.service_get_room_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.service_get_slot_state(uuid, text) from public, anon, authenticated;
revoke all on function public.service_get_player_xp(uuid, uuid) from public, anon, authenticated;
revoke all on function public.service_my_progress(uuid) from public, anon, authenticated;
revoke all on function public.service_my_missions(uuid) from public, anon, authenticated;
revoke all on function public.service_get_world_map(uuid, text) from public, anon, authenticated;
revoke all on function public.service_get_world_assets(uuid) from public, anon, authenticated;
revoke all on function public.service_room_jackpots(uuid) from public, anon, authenticated;
revoke all on function public.service_is_state_excluded(uuid, text) from public, anon, authenticated;

grant execute on function public.service_ensure_waiting_game(uuid, uuid) to service_role;
grant execute on function public.service_get_room_state(uuid, uuid) to service_role;
grant execute on function public.service_get_slot_state(uuid, text) to service_role;
grant execute on function public.service_get_player_xp(uuid, uuid) to service_role;
grant execute on function public.service_my_progress(uuid) to service_role;
grant execute on function public.service_my_missions(uuid) to service_role;
grant execute on function public.service_get_world_map(uuid, text) to service_role;
grant execute on function public.service_get_world_assets(uuid) to service_role;
grant execute on function public.service_room_jackpots(uuid) to service_role;
grant execute on function public.service_is_state_excluded(uuid, text) to service_role;
