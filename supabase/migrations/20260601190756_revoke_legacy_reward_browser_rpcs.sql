-- Rewards/codes/winner info now go through Next.js BFF service_* wrappers.
-- Remove direct browser execution grants from legacy RPCs.

revoke all on function public.daily_bonus_status() from public, anon, authenticated;
revoke all on function public.claim_daily_bonus() from public, anon, authenticated;
revoke all on function public.claim_daily_xp() from public, anon, authenticated;
revoke all on function public.claim_streak() from public, anon, authenticated;
revoke all on function public.redeem_code(text) from public, anon, authenticated;
revoke all on function public.claim_winner_info(uuid) from public, anon, authenticated;

grant execute on function public.daily_bonus_status() to service_role;
grant execute on function public.claim_daily_bonus() to service_role;
grant execute on function public.claim_daily_xp() to service_role;
grant execute on function public.claim_streak() to service_role;
grant execute on function public.redeem_code(text) to service_role;
grant execute on function public.claim_winner_info(uuid) to service_role;
