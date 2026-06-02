-- ============================================================
-- world_run_policy_indexes
-- Tightens world run/reward claim indexes and RLS policy plans after
-- adding run audit telemetry.
-- ============================================================

create index if not exists idx_world_game_runs_world_status
  on public.world_game_runs(world_id, status, expires_at desc);

create index if not exists idx_world_node_reward_claims_run_id
  on public.world_node_reward_claims(run_id)
  where run_id is not null;

drop policy if exists "own game runs read" on public.world_game_runs;
create policy "own game runs read" on public.world_game_runs
  for select using ((select auth.uid()) = player_id);

drop policy if exists "own world reward claims read" on public.world_node_reward_claims;
create policy "own world reward claims read" on public.world_node_reward_claims
  for select using ((select auth.uid()) = player_id);
