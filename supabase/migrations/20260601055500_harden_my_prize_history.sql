-- Prize history is an authenticated account surface.
-- The function filters by auth.uid(), but its executable roles should match that contract.
revoke execute on function my_prize_history() from public;
revoke execute on function my_prize_history() from anon;
grant execute on function my_prize_history() to authenticated;
