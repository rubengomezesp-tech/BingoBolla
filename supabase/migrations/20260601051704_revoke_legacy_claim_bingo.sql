-- Revoke the legacy manual claim RPC from browser-callable roles.
--
-- The live engine pays line/two_lines/full_house through auto_claim_wins()
-- when balls are inserted. The older claim_bingo(uuid,text) function only
-- understands the original 5x5 flow and can credit prizes without checking
-- whether the pattern was already paid. Keep it unavailable to public API roles.

revoke all on function public.claim_bingo(uuid, text) from anon;
revoke all on function public.claim_bingo(uuid, text) from authenticated;
revoke all on function public.claim_bingo(uuid, text) from public;

grant execute on function public.claim_bingo(uuid, text) to service_role;
