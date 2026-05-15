-- ============================================================================
-- BingoBolla v11 — ensure_waiting_game (auto-create on room enter)
-- ============================================================================

-- Crea un waiting_game si no existe ninguno activo en la sala
-- Idempotente: si ya hay waiting o playing, no hace nada
create or replace function ensure_waiting_game(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_game_id uuid;
begin
  select * into v_room from rooms where id = p_room_id and active = true;
  if not found then return null; end if;

  -- ¿Ya hay un game activo?
  select id into v_game_id from games
    where room_id = p_room_id
      and status in ('waiting', 'playing')
    order by created_at desc limit 1;

  if found then return v_game_id; end if;

  -- Crear nuevo waiting game
  insert into games (room_id, status, starts_at, seed_hash)
  values (
    p_room_id,
    'waiting',
    now() + (coalesce(v_room.schedule_interval_seconds, 60) || ' seconds')::interval,
    encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex')
  )
  returning id into v_game_id;

  return v_game_id;
end;
$$;

grant execute on function ensure_waiting_game(uuid) to authenticated, anon;

-- Limpieza preventiva: marcar como 'finished' juegos que llevan más de 10 min en waiting/playing sin actividad
update games
set status = 'finished'
where status in ('waiting','playing')
  and created_at < now() - interval '15 minutes'
  and id not in (select distinct game_id from balls_called where called_at > now() - interval '5 minutes');

-- Verifica
select count(*) as games_stuck_cleaned from games where status = 'finished' and ended_at is null;
