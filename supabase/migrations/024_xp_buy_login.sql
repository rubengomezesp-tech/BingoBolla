-- ============================================================
-- 024_xp_buy_login.sql  ·  MÓDULO 3A
-- ============================================================
-- 1) buy_ticket() = COPIA EXACTA de 010 + 1 línea add_xp protegida
--    (+8 EXP al comprar cartón). Lógica de cobro/coins IDÉNTICA.
-- 2) claim_daily_xp() = login diario simple (+15 EXP, 1 vez/día)
-- El EXP NUNCA puede afectar la compra: bloque begin/exception.
-- ============================================================

-- ---------- 1) buy_ticket con +8 EXP ----------
create or replace function buy_ticket(
  p_room_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_game games%rowtype;
  v_profile profiles%rowtype;
  v_limits rg_limits%rowtype;
  v_spend_24h record;
  v_spend_7d record;
  v_price numeric;
  v_balance numeric;
  v_card_count int;
  v_new_card_id uuid;
  v_card_data jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile.banned then raise exception 'account_banned'; end if;
  if exists (select 1 from self_exclusions where player_id = v_user_id and active = true) then
    raise exception 'self_excluded';
  end if;

  if p_currency = 'sweeps' then
    if v_profile.kyc_status not in ('self_declared','verified') then raise exception 'kyc_required'; end if;
    if v_profile.state is null then raise exception 'state_required'; end if;
    if is_state_excluded(v_profile.state) then raise exception 'state_excluded'; end if;
  end if;

  select * into v_room from rooms where id = p_room_id and active = true for update;
  if not found then raise exception 'room_not_found'; end if;

  -- Find waiting game (the one we'll join). Always buys for next round, never for playing.
  select * into v_game from games
    where room_id = p_room_id and status = 'waiting'
    order by created_at desc limit 1 for update;

  if not found then
    -- Create a new waiting game. Starts in schedule_interval_seconds from now.
    insert into games (room_id, status, starts_at, seed_hash)
    values (p_room_id, 'waiting',
            now() + (v_room.schedule_interval_seconds || ' seconds')::interval,
            encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'))
    returning * into v_game;
  end if;

  -- ⏰ 5-SECOND CUTOFF: reject if game is about to start
  if v_game.starts_at <= now() + interval '5 seconds' then
    raise exception 'purchase_window_closed';
  end if;

  if p_currency = 'gold' then v_price := v_room.ticket_gold;
  elsif p_currency = 'sweeps' then v_price := v_room.ticket_sweeps;
  else raise exception 'invalid_currency'; end if;

  -- RG limits (sweeps only)
  if p_currency = 'sweeps' then
    select * into v_limits from rg_limits where player_id = v_user_id;
    if v_limits is not null then
      if v_limits.daily_wager_limit is not null then
        select * into v_spend_24h from player_spend_24h where player_id = v_user_id;
        if (coalesce(v_spend_24h.wagered_sweeps_24h, 0) + v_price) > v_limits.daily_wager_limit then
          raise exception 'daily_wager_limit_reached';
        end if;
      end if;
      if v_limits.weekly_wager_limit is not null then
        select * into v_spend_7d from player_spend_7d where player_id = v_user_id;
        if (coalesce(v_spend_7d.wagered_sweeps_7d, 0) + v_price) > v_limits.weekly_wager_limit then
          raise exception 'weekly_wager_limit_reached';
        end if;
      end if;
    end if;
  end if;

  select count(*) into v_card_count from cards
    where game_id = v_game.id and player_id = v_user_id;
  if v_card_count >= v_room.max_cards_per_player then
    raise exception 'max_cards_reached';
  end if;

  if p_currency = 'gold' then
    update profiles set gold_coins = gold_coins - v_price::bigint
      where id = v_user_id and gold_coins >= v_price::bigint
      returning gold_coins into v_balance;
  else
    update profiles set sweeps_coins = sweeps_coins - v_price
      where id = v_user_id and sweeps_coins >= v_price
      returning sweeps_coins into v_balance;
  end if;
  if v_balance is null then raise exception 'insufficient_funds'; end if;

  insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
  values (v_user_id, p_currency, -v_price, v_balance, 'ticket', v_game.id);

  if v_room.variant = 'bingo90' then
    v_card_data := generate_bingo90_card();
  else
    v_card_data := generate_bingo75_card();
  end if;

  insert into cards (game_id, player_id, card_data, currency, price)
  values (v_game.id, v_user_id, v_card_data, p_currency, v_price)
  returning id into v_new_card_id;

  -- [XP] +8 por comprar cartón · protegido: si falla, NO afecta la compra
  begin perform add_xp(v_user_id, 8); exception when others then null; end;

  if p_currency = 'gold' then
    update games set pot_gold = pot_gold + v_price::bigint where id = v_game.id;
  else
    update games set pot_sweeps = pot_sweeps + v_price where id = v_game.id;
  end if;

  return jsonb_build_object(
    'game_id', v_game.id,
    'game_starts_at', v_game.starts_at,
    'card_id', v_new_card_id,
    'card_data', v_card_data,
    'variant', v_room.variant,
    'new_balance', v_balance
  );
end;
$$;
grant execute on function buy_ticket(uuid, text) to authenticated;

-- ---------- 2) Login diario (+15 EXP, 1 vez/día) ----------
-- Columna para recordar el último día que se reclamó EXP de login.
alter table player_xp add column if not exists last_daily_xp date;

-- El frontend llama esta función al entrar. Idempotente por día:
-- solo da +15 la primera vez de cada día (zona horaria del servidor/UTC).
create or replace function claim_daily_xp()
returns table (
  claimed     boolean,
  xp_awarded  int,
  new_xp      bigint,
  new_level   int,
  leveled_up  boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last date;
  v_today date := (now() at time zone 'utc')::date;
  v_res record;
begin
  if v_user is null then
    return query select false, 0, 0::bigint, 1, false;
    return;
  end if;

  -- asegurar fila (idempotente)
  insert into player_xp (player_id, xp, level)
  values (v_user, 0, 1)
  on conflict (player_id) do nothing;

  select last_daily_xp into v_last from player_xp where player_id = v_user for update;

  if v_last is not distinct from v_today then
    -- ya reclamado hoy: no dar nada
    return query
      select false, 0, px.xp, px.level, false
      from player_xp px where px.player_id = v_user;
    return;
  end if;

  -- marcar hoy y sumar +15 (protegido)
  update player_xp set last_daily_xp = v_today where player_id = v_user;

  begin
    select * into v_res from add_xp(v_user, 15);
    return query select true, 15, v_res.new_xp, v_res.new_level, v_res.leveled_up;
  exception when others then
    -- si add_xp fallara, devolver estado actual sin romper
    return query
      select false, 0, px.xp, px.level, false
      from player_xp px where px.player_id = v_user;
  end;
end;
$$;

grant execute on function claim_daily_xp() to authenticated;

-- ============================================================
-- FIN MÓDULO 3A. buy_ticket +8 · login diario +15.
-- Siguiente: Módulo 3B = barra de EXP/nivel en el dashboard real.
-- ============================================================
