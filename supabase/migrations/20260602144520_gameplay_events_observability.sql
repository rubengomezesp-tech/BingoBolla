-- Gameplay observability.
-- Server-only event stream for UX/gameplay diagnostics. Browser clients send
-- events through the Next.js BFF; no direct Data API access is granted.

create table if not exists public.gameplay_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  client_event_id text,
  event_name text not null,
  surface text not null,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  viewport jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint gameplay_events_event_name_format
    check (event_name ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'),
  constraint gameplay_events_surface_format
    check (surface ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  constraint gameplay_events_client_event_id_format
    check (client_event_id is null or client_event_id ~ '^[a-zA-Z0-9_-]{8,80}$'),
  constraint gameplay_events_path_length
    check (path is null or char_length(path) <= 180),
  constraint gameplay_events_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint gameplay_events_viewport_object
    check (jsonb_typeof(viewport) = 'object')
);

create index if not exists gameplay_events_player_created_idx
  on public.gameplay_events(player_id, created_at desc);

create index if not exists gameplay_events_name_created_idx
  on public.gameplay_events(event_name, created_at desc);

create index if not exists gameplay_events_surface_created_idx
  on public.gameplay_events(surface, created_at desc);

create unique index if not exists gameplay_events_player_client_event_uidx
  on public.gameplay_events(player_id, client_event_id)
  where client_event_id is not null;

alter table public.gameplay_events enable row level security;

revoke all on table public.gameplay_events from anon, authenticated;
grant select, insert, update, delete on table public.gameplay_events to service_role;

comment on table public.gameplay_events is
  'Server-only gameplay and UX event stream for product diagnostics. No direct browser access.';
comment on column public.gameplay_events.metadata is
  'Sanitized bounded JSON from the BFF. No secrets, raw tokens, payment details or PII.';
comment on column public.gameplay_events.client_event_id is
  'Client-generated id used to dedupe keepalive tracking requests across navigations.';
