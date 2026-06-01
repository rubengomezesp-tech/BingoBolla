-- The deployed Next.js BFF now calls service_* wrappers with the service role.
-- Remove direct browser access to the older mutation/admin RPCs.

revoke all on function public.is_admin() from public, anon, authenticated;

revoke all on function public.admin_stats() from public, anon, authenticated;
revoke all on function public.admin_list_codes() from public, anon, authenticated;
revoke all on function public.admin_grant_coins(text, bigint, numeric, numeric) from public, anon, authenticated;
revoke all on function public.admin_create_code(text, text, bigint, numeric, numeric, int, int, int) from public, anon, authenticated;

revoke all on function public.buy_ticket(uuid, text) from public, anon, authenticated;
revoke all on function public.buy_strip(uuid, text) from public, anon, authenticated;
revoke all on function public.spin_slot(text, text, numeric) from public, anon, authenticated;
revoke all on function public.spin_hold_win(text, text, numeric) from public, anon, authenticated;
revoke all on function public.play_slot(uuid, numeric, text) from public, anon, authenticated;

grant execute on function public.is_admin() to service_role;

grant execute on function public.admin_stats() to service_role;
grant execute on function public.admin_list_codes() to service_role;
grant execute on function public.admin_grant_coins(text, bigint, numeric, numeric) to service_role;
grant execute on function public.admin_create_code(text, text, bigint, numeric, numeric, int, int, int) to service_role;

grant execute on function public.buy_ticket(uuid, text) to service_role;
grant execute on function public.buy_strip(uuid, text) to service_role;
grant execute on function public.spin_slot(text, text, numeric) to service_role;
grant execute on function public.spin_hold_win(text, text, numeric) to service_role;
grant execute on function public.play_slot(uuid, numeric, text) to service_role;
