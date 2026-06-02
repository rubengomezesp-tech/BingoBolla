-- Speed up live bingo cadence so client-driven rooms feel arcade-fast.
-- The server-side tick_game RPC still rate-limits every draw by ball_interval_ms.

update rooms
set
  ball_interval_ms = 1100,
  schedule_interval_seconds = 20
where variant = 'lite';

update rooms
set
  ball_interval_ms = 1400,
  schedule_interval_seconds = 35
where variant = 'pulse';

update rooms
set
  ball_interval_ms = 2000,
  schedule_interval_seconds = 40
where variant in ('bingo75', 'cinco');

update rooms
set
  ball_interval_ms = 2400,
  schedule_interval_seconds = 45
where variant = 'bingo90';

comment on column rooms.ball_interval_ms is
  'Milliseconds between server-issued bingo balls. Client tick may run faster; tick_game enforces this interval.';
