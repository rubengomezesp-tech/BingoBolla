-- ============================================================================
-- BingoBolla v18 — FIX FINAL: check_card_patterns + call_next_ball limpio
-- ============================================================================
-- BUG: call_next_ball inserta la bola → trigger trg_auto_claim dispara
-- auto_claim_wins() → llama check_card_patterns(jsonb, int[], text) que NO
-- existe con esa firma → INSERT revertido → 500 → no salen bolas.
-- ============================================================================

-- ============ STEP 1: check_card_patterns (firma correcta) ============
-- Recibe: card_data (jsonb), bolas cantadas (int[]), variante (text)
-- Devuelve: { line, two_lines, full_house } (boolean cada uno)
--
-- Bingo 75: card_data = matriz 5x5, columna central tiene "FREE"
--   - line       = al menos UNA fila completa
--   - full_house = TODAS las 24 casillas (FREE cuenta como marcada)
-- Bingo 90: card_data = 3 filas x 9 columnas, celdas null = vacías,
--           cada fila tiene 5 números (15 por cartón)
--   - line       = 1 fila completa (5 números)
--   - two_lines  = 2 filas completas
--   - full_house = las 3 filas (15 números)
drop function if exists check_card_patterns(jsonb, int[], text);
drop function if exists check_card_patterns(jsonb, integer[], text);

create or replace function check_card_patterns(
  p_card_data jsonb,
  p_called int[],
  p_variant text
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_row jsonb;
  v_cell jsonb;
  v_val text;
  v_num int;
  v_lines_complete int := 0;
  v_total_marked int := 0;
  v_total_numbers int := 0;
  v_row_marked int;
  v_row_numbers int;
  v_is90 boolean := (p_variant = 'bingo90');
  v_line boolean := false;
  v_two boolean := false;
  v_full boolean := false;
begin
  -- Recorrer filas
  for v_row in select * from jsonb_array_elements(p_card_data) loop
    v_row_marked := 0;
    v_row_numbers := 0;

    for v_cell in select * from jsonb_array_elements(v_row) loop
      v_val := v_cell #>> '{}';  -- valor como texto (puede ser número, "FREE", null)

      if v_val is null or v_val = 'null' then
        -- celda vacía (solo en bingo 90) — ignorar
        continue;
      elsif v_val = 'FREE' then
        -- centro libre (bingo 75) — cuenta como marcada
        v_row_numbers := v_row_numbers + 1;
        v_row_marked := v_row_marked + 1;
      else
        -- es un número
        v_num := v_val::int;
        v_row_numbers := v_row_numbers + 1;
        v_total_numbers := v_total_numbers + 1;
        if v_num = any(p_called) then
          v_row_marked := v_row_marked + 1;
          v_total_marked := v_total_marked + 1;
        end if;
      end if;
    end loop;

    -- ¿Fila completa? (todos sus números marcados, fila no vacía)
    if v_row_numbers > 0 and v_row_marked = v_row_numbers then
      v_lines_complete := v_lines_complete + 1;
    end if;
  end loop;

  -- Resultados
  v_line := v_lines_complete >= 1;
  v_two  := v_lines_complete >= 2;

  if v_is90 then
    -- full house bingo 90 = 15 números marcados (todas las filas)
    v_full := (v_total_numbers > 0 and v_total_marked = v_total_numbers);
  else
    -- full house bingo 75 = 24 números marcados (FREE no cuenta en total_numbers)
    v_full := (v_total_numbers > 0 and v_total_marked = v_total_numbers);
  end if;

  return jsonb_build_object(
    'line', v_line,
    'two_lines', v_two,
    'full_house', v_full,
    'lines_complete', v_lines_complete
  );
end;
$$;

grant execute on function check_card_patterns(jsonb, int[], text) to authenticated, anon, service_role;

-- ============ STEP 2: auto_claim_wins BLINDADO ============
-- Si algo falla evaluando premios, NO revierte el INSERT de la bola.
-- (envolvemos el cuerpo en un bloque que captura excepciones)
create or replace function auto_claim_wins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_called int[];
  v_card cards%rowtype;
  v_check jsonb;
  v_player_pool_gold bigint;
  v_player_pool_sweeps numeric;
  v_prize_gold bigint;
  v_prize_sweeps numeric;
  v_new_balance numeric;
  v_pct numeric;
begin
  -- TODO el cuerpo protegido: si falla, la bola igual queda insertada
  begin
    select * into v_game from games where id = new.game_id for update;
    if v_game.status != 'playing' then return new; end if;

    select * into v_room from rooms where id = v_game.room_id;
    if not v_room.auto_claim then return new; end if;

    select array_agg(ball_number) into v_called from balls_called where game_id = new.game_id;

    v_player_pool_gold := ((coalesce(v_room.rollover_gold, 0) + v_game.pot_gold) * v_room.rtp)::bigint;
    v_player_pool_sweeps := (coalesce(v_room.rollover_sweeps, 0) + v_game.pot_sweeps) * v_room.rtp;

    for v_card in select * from cards where game_id = new.game_id loop
      v_check := check_card_patterns(v_card.card_data, v_called, v_room.variant);

      -- LINE
      if (v_check->>'line')::boolean and v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then
        v_pct := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.15);
        v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
        v_prize_sweeps := v_player_pool_sweeps * v_pct;
        update games set line_won_by = v_card.player_id, line_won_at = now()
          where id = v_game.id and line_won_by is null returning * into v_game;
        if v_game.line_won_by = v_card.player_id then
          insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
            values (v_game.id, v_card.id, v_card.player_id, 'line', true, v_prize_gold, v_prize_sweeps);
          if v_prize_gold > 0 then
            update profiles set gold_coins = gold_coins + v_prize_gold where id = v_card.player_id
              returning gold_coins into v_new_balance;
            insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
              values (v_card.player_id, 'gold', v_prize_gold, v_new_balance, 'win_line', v_game.id);
          end if;
          if v_prize_sweeps > 0 then
            update profiles set sweeps_coins = sweeps_coins + v_prize_sweeps,
              total_won_sweeps = total_won_sweeps + v_prize_sweeps
              where id = v_card.player_id returning sweeps_coins into v_new_balance;
            insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
              values (v_card.player_id, 'sweeps', v_prize_sweeps, v_new_balance, 'win_line', v_game.id);
          end if;
          update player_stats set total_wins = total_wins + 1, lines_won = lines_won + 1,
            total_gold_won = total_gold_won + v_prize_gold,
            total_sweeps_won = total_sweeps_won + v_prize_sweeps,
            current_streak = current_streak + 1,
            best_streak = greatest(best_streak, current_streak + 1),
            last_played = now(), updated_at = now()
            where player_id = v_card.player_id;
        end if;
      end if;

      -- TWO LINES (bingo 90)
      if (v_check->>'two_lines')::boolean and v_game.two_lines_won_by is null and 'two_lines' = any(v_room.patterns_enabled) then
        v_pct := coalesce((v_room.pattern_rewards->>'two_lines')::numeric, 0.25);
        v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
        v_prize_sweeps := v_player_pool_sweeps * v_pct;
        update games set two_lines_won_by = v_card.player_id, two_lines_won_at = now()
          where id = v_game.id and two_lines_won_by is null returning * into v_game;
        if v_game.two_lines_won_by = v_card.player_id then
          insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
            values (v_game.id, v_card.id, v_card.player_id, 'two_lines', true, v_prize_gold, v_prize_sweeps);
          if v_prize_gold > 0 then
            update profiles set gold_coins = gold_coins + v_prize_gold where id = v_card.player_id
              returning gold_coins into v_new_balance;
            insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
              values (v_card.player_id, 'gold', v_prize_gold, v_new_balance, 'win_two_lines', v_game.id);
          end if;
          if v_prize_sweeps > 0 then
            update profiles set sweeps_coins = sweeps_coins + v_prize_sweeps,
              total_won_sweeps = total_won_sweeps + v_prize_sweeps
              where id = v_card.player_id returning sweeps_coins into v_new_balance;
            insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
              values (v_card.player_id, 'sweeps', v_prize_sweeps, v_new_balance, 'win_two_lines', v_game.id);
          end if;
          update player_stats set total_wins = total_wins + 1, two_lines_won = two_lines_won + 1,
            total_gold_won = total_gold_won + v_prize_gold,
            total_sweeps_won = total_sweeps_won + v_prize_sweeps,
            last_played = now(), updated_at = now()
            where player_id = v_card.player_id;
        end if;
      end if;

      -- FULL HOUSE
      if (v_check->>'full_house')::boolean and v_game.full_house_won_by is null and 'full_house' = any(v_room.patterns_enabled) then
        v_pct := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.60);
        v_prize_gold := (v_player_pool_gold * v_pct)::bigint;
        v_prize_sweeps := v_player_pool_sweeps * v_pct;
        update games set full_house_won_by = v_card.player_id, full_house_won_at = now(),
          status = 'finished', ended_at = now()
          where id = v_game.id and full_house_won_by is null returning * into v_game;
        if v_game.full_house_won_by = v_card.player_id then
          insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
            values (v_game.id, v_card.id, v_card.player_id, 'full_house', true, v_prize_gold, v_prize_sweeps);
          if v_prize_gold > 0 then
            update profiles set gold_coins = gold_coins + v_prize_gold where id = v_card.player_id
              returning gold_coins into v_new_balance;
            insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
              values (v_card.player_id, 'gold', v_prize_gold, v_new_balance, 'win_full_house', v_game.id);
          end if;
          if v_prize_sweeps > 0 then
            update profiles set sweeps_coins = sweeps_coins + v_prize_sweeps,
              total_won_sweeps = total_won_sweeps + v_prize_sweeps
              where id = v_card.player_id returning sweeps_coins into v_new_balance;
            insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
              values (v_card.player_id, 'sweeps', v_prize_sweeps, v_new_balance, 'win_full_house', v_game.id);
          end if;
          update player_stats set total_wins = total_wins + 1, full_houses_won = full_houses_won + 1,
            total_gold_won = total_gold_won + v_prize_gold,
            total_sweeps_won = total_sweeps_won + v_prize_sweeps,
            current_streak = current_streak + 1,
            best_streak = greatest(best_streak, current_streak + 1),
            last_played = now(), updated_at = now()
            where player_id = v_card.player_id;
        end if;
      end if;
    end loop;

    -- Settlement al terminar
    if v_game.status = 'finished' then
      declare
        v_line_pct numeric := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.15);
        v_2l_pct numeric := coalesce((v_room.pattern_rewards->>'two_lines')::numeric, 0.25);
        v_fh_pct numeric := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.60);
        v_unpaid_pct numeric := 0;
        v_house_gold bigint;
        v_house_sweeps numeric;
      begin
        if v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then v_unpaid_pct := v_unpaid_pct + v_line_pct; end if;
        if v_game.two_lines_won_by is null and 'two_lines' = any(v_room.patterns_enabled) then v_unpaid_pct := v_unpaid_pct + v_2l_pct; end if;
        if v_game.full_house_won_by is null then v_unpaid_pct := v_unpaid_pct + v_fh_pct; end if;
        v_house_gold := ((coalesce(v_room.rollover_gold,0) + v_game.pot_gold) - v_player_pool_gold)::bigint;
        v_house_sweeps := (coalesce(v_room.rollover_sweeps,0) + v_game.pot_sweeps) - v_player_pool_sweeps;
        update rooms set
          rollover_gold = (v_player_pool_gold * v_unpaid_pct)::bigint,
          rollover_sweeps = v_player_pool_sweeps * v_unpaid_pct,
          house_take_gold = house_take_gold + v_house_gold,
          house_take_sweeps = house_take_sweeps + v_house_sweeps
          where id = v_room.id;
        update games set next_round_starts_at = now() + (v_room.schedule_interval_seconds || ' seconds')::interval
          where id = v_game.id;
        -- Crear el siguiente waiting game
        insert into games (room_id, status, starts_at, seed_hash)
        values (v_room.id, 'waiting',
          now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval,
          encode(digest(gen_random_uuid()::text || now()::text,'sha256'),'hex'));
      end;
    end if;

  exception when others then
    -- Si algo falla evaluando premios, la bola YA está insertada. No romper.
    raise warning 'auto_claim_wins error (no crítico): %', sqlerrm;
    return new;
  end;

  return new;
end;
$$;

-- ============ STEP 3: call_next_ball SIN el perform auto_claim_wins ============
-- (el trigger trg_auto_claim ya lo hace solo al insertar la bola)
create or replace function call_next_ball(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_max_ball int;
  v_next_ball int;
  v_sequence int;
  v_called int[];
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return jsonb_build_object('error','game_not_found'); end if;

  select * into v_room from rooms where id = v_game.room_id;
  v_max_ball := case when v_room.variant = 'bingo90' then 90 else 75 end;

  -- waiting → playing
  if v_game.status = 'waiting' then
    if v_game.starts_at > now() then
      return jsonb_build_object('waiting', true,
        'starts_in_s', extract(epoch from (v_game.starts_at - now())));
    end if;
    if (select count(*) from cards where game_id = p_game_id) = 0 then
      update games set starts_at = now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval
        where id = p_game_id;
      return jsonb_build_object('no_players', true);
    end if;
    update games set status = 'playing', starts_at = now() where id = p_game_id;
    v_game.status := 'playing';
  end if;

  if v_game.status != 'playing' then
    return jsonb_build_object('status', v_game.status);
  end if;

  select coalesce(array_agg(ball_number), '{}'::int[]) into v_called
    from balls_called where game_id = p_game_id;

  -- ¿Terminó? (todas las bolas O ya hay bingo)
  if array_length(v_called, 1) >= v_max_ball or v_game.full_house_won_by is not null then
    update games set status = 'finished', ended_at = now() where id = p_game_id;
    -- Crear siguiente waiting si no existe ya
    if not exists (select 1 from games where room_id = v_room.id and status = 'waiting') then
      insert into games (room_id, status, starts_at, seed_hash)
      values (v_room.id, 'waiting',
        now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval,
        encode(digest(gen_random_uuid()::text || now()::text,'sha256'),'hex'));
    end if;
    return jsonb_build_object('finished', true);
  end if;

  -- Sortear siguiente bola
  select n into v_next_ball
    from generate_series(1, v_max_ball) as n
    where not (n = any(v_called))
    order by random()
    limit 1;

  v_sequence := coalesce(array_length(v_called, 1), 0) + 1;

  -- Al insertar, el trigger trg_auto_claim evalúa premios automáticamente.
  -- NO llamamos auto_claim_wins manualmente (es función de trigger).
  insert into balls_called (game_id, ball_number, sequence)
  values (p_game_id, v_next_ball, v_sequence);

  return jsonb_build_object('ball', v_next_ball, 'sequence', v_sequence, 'ok', true);
end;
$$;

grant execute on function call_next_ball(uuid) to authenticated, anon, service_role;

-- ============ STEP 4: Limpieza + waiting frescos ============
update games set status = 'finished' where status in ('waiting','playing');

do $$
declare r record;
begin
  for r in select id, schedule_interval_seconds from rooms where active = true loop
    insert into games (room_id, status, starts_at, seed_hash)
    values (r.id, 'waiting',
      now() + (greatest(coalesce(r.schedule_interval_seconds,60),45) || ' seconds')::interval,
      encode(digest(gen_random_uuid()::text || now()::text || r.id::text,'sha256'),'hex'));
  end loop;
end $$;

-- ============ STEP 5: TEST de check_card_patterns ============
select '=== TEST check_card_patterns (bingo75: fila 0 completa) ===' as t;
select check_card_patterns(
  '[[1,16,31,46,61],[2,17,32,47,62],[3,18,"FREE",48,63],[4,19,33,49,64],[5,20,34,50,65]]'::jsonb,
  array[1,16,31,46,61]::int[],
  'lite'
);

select '=== ESTADO FINAL SALAS ===' as t;
select r.name, r.variant, r.ball_interval_ms, g.status,
  extract(epoch from (g.starts_at - now()))::int as seg
from rooms r
left join lateral (select status, starts_at from games
  where room_id=r.id and status in ('waiting','playing')
  order by created_at desc limit 1) g on true
where r.active = true order by r.name;
