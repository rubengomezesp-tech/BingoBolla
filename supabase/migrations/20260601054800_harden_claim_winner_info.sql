-- Winner announcements are rendered inside authenticated room sessions.
-- Keep public jackpot totals open, but do not expose winner names/prizes to anon clients.
revoke execute on function claim_winner_info(uuid) from anon;
grant execute on function claim_winner_info(uuid) to authenticated;
