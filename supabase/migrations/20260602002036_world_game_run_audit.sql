-- ============================================================
-- world_game_run_audit
-- Adds server-side audit fields to issued world minigame runs.
-- These columns are written only by the BFF/service role path and read
-- by the owning player through the existing world_game_runs RLS policy.
-- ============================================================

alter table public.world_game_runs
  add column if not exists attempt_hash text,
  add column if not exists attempt_summary jsonb,
  add column if not exists validation_risk smallint not null default 0
    check (validation_risk between 0 and 100),
  add column if not exists validation_flags text[] not null default '{}'::text[],
  add column if not exists client_elapsed_ms integer
    check (client_elapsed_ms is null or client_elapsed_ms between 0 and 3600000);

alter table public.world_game_runs
  drop constraint if exists world_game_runs_attempt_hash_format,
  add constraint world_game_runs_attempt_hash_format
    check (attempt_hash is null or attempt_hash ~ '^[a-f0-9]{64}$');

create index if not exists idx_world_game_runs_player_completed_audit
  on public.world_game_runs(player_id, completed_at desc)
  where status = 'completed';

create index if not exists idx_world_game_runs_validation_risk
  on public.world_game_runs(validation_risk desc, completed_at desc)
  where status = 'completed' and validation_risk >= 50;

comment on column public.world_game_runs.attempt_hash is
  'SHA-256 hash of the whitelisted v2 minigame attempt payload used for replay/audit correlation.';

comment on column public.world_game_runs.attempt_summary is
  'Whitelisted server-audited attempt metrics. Does not store run tokens or raw browser payloads.';

comment on column public.world_game_runs.validation_risk is
  '0-100 server-side suspicion score from deterministic minigame completion heuristics.';

comment on column public.world_game_runs.validation_flags is
  'Server-side heuristic flags generated while validating the completed minigame run.';

comment on column public.world_game_runs.client_elapsed_ms is
  'Client-reported elapsed time in milliseconds for the completed minigame attempt.';
