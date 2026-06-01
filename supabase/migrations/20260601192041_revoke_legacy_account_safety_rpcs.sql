-- Account safety actions now go through Next.js BFF service_* wrappers.
-- Remove direct browser execution grants from legacy mutation RPCs.

revoke all on function public.submit_onboarding(date, text, text) from public, anon, authenticated;
revoke all on function public.upsert_rg_limits(jsonb) from public, anon, authenticated;
revoke all on function public.request_self_exclusion(text, text) from public, anon, authenticated;
revoke all on function public.request_diamond_redemption(numeric, text, jsonb) from public, anon, authenticated;

grant execute on function public.submit_onboarding(date, text, text) to service_role;
grant execute on function public.upsert_rg_limits(jsonb) to service_role;
grant execute on function public.request_self_exclusion(text, text) to service_role;
grant execute on function public.request_diamond_redemption(numeric, text, jsonb) to service_role;
