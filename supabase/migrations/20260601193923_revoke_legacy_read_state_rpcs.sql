-- Read/state RPCs now go through Next.js BFF service_* wrappers.
-- Remove direct browser execution while preserving service-role access.

revoke all on function public.ensure_waiting_game(uuid) from public, anon, authenticated;
revoke all on function public.get_room_state(uuid) from public, anon, authenticated;
revoke all on function public.get_slot_state(text) from public, anon, authenticated;
revoke all on function public.get_player_xp(uuid) from public, anon, authenticated;
revoke all on function public.my_progress() from public, anon, authenticated;
revoke all on function public.my_missions() from public, anon, authenticated;
revoke all on function public.get_world_map(text) from public, anon, authenticated;
revoke all on function public.get_world_assets() from public, anon, authenticated;
revoke all on function public.room_jackpots() from public, anon, authenticated;
revoke all on function public.is_state_excluded(text) from public, anon, authenticated;

grant execute on function public.ensure_waiting_game(uuid) to service_role;
grant execute on function public.get_room_state(uuid) to service_role;
grant execute on function public.get_slot_state(text) to service_role;
grant execute on function public.get_player_xp(uuid) to service_role;
grant execute on function public.my_progress() to service_role;
grant execute on function public.my_missions() to service_role;
grant execute on function public.get_world_map(text) to service_role;
grant execute on function public.get_world_assets() to service_role;
grant execute on function public.room_jackpots() to service_role;
grant execute on function public.is_state_excluded(text) to service_role;
