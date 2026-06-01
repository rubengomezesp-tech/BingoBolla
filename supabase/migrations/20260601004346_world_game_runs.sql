-- ============================================================
-- 20260601004346_world_game_runs.sql
-- Partidas server-issued para minijuegos del mapa.
-- ============================================================

create table if not exists world_game_runs (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references profiles on delete cascade,
  node_id      uuid not null references world_nodes(id) on delete cascade,
  world_id     text not null default 'miami_nights' references worlds(id) on delete cascade,
  game         text not null check (game in ('ballmatch','neural_cascade')),
  status       text not null default 'started'
                 check (status in ('started','completed','expired','cancelled')),
  token_hash   text not null check (char_length(token_hash) = 64),
  started_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '20 minutes'),
  completed_at timestamptz,
  score        bigint,
  stars        int check (stars between 0 and 3),
  user_agent   text,
  created_at   timestamptz not null default now(),
  constraint world_game_runs_completed_has_result
    check (
      status <> 'completed'
      or (completed_at is not null and score is not null and stars is not null)
    )
);

create index if not exists idx_world_game_runs_player_status
  on world_game_runs(player_id, status, expires_at desc);

create index if not exists idx_world_game_runs_node_status
  on world_game_runs(node_id, status);

create index if not exists idx_world_game_runs_expiry
  on world_game_runs(expires_at)
  where status = 'started';

alter table world_game_runs enable row level security;

drop policy if exists "own game runs read" on world_game_runs;
create policy "own game runs read" on world_game_runs
  for select using (auth.uid() = player_id);

revoke all on table world_game_runs from anon, authenticated;
grant select on table world_game_runs to authenticated;
grant all on table world_game_runs to service_role;

comment on table world_game_runs is
  'Server-issued one-time run records used to validate world minigame completions.';
