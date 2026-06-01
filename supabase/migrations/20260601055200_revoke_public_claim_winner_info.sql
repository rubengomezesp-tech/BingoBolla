-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default unless revoked.
-- Winner names and prize amounts should only be available to authenticated clients.
revoke execute on function claim_winner_info(uuid) from public;
grant execute on function claim_winner_info(uuid) to authenticated;
