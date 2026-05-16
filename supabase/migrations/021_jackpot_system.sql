-- ============================================================================
-- BingoBolla — Sistema de BOTE (Jackpot) A2 + B1
-- ============================================================================
-- A2: 15% de cada partida al bote (siempre). RTP baja 0.85 -> 0.75
-- B1: ganador de bingo en <=N bolas se lleva el bote completo, rollover -> 0
-- Proporcional: bingo90 <=40 bolas, bingo75/lite/cinco/pulse <=30 bolas
-- Linea NO corta (se anuncia), Bingo SI corta (ya funciona asi)
-- ============================================================================

-- ===== STEP 1: Columna configurable jackpot_max_balls + ajustar RTP =====
alter table rooms add column if not exists jackpot_max_balls int default 40;

-- Umbral proporcional por variante
update rooms set jackpot_max_balls = 40 where variant = 'bingo90';
update rooms set jackpot_max_balls = 30 where variant in ('bingo75','lite','cinco','pulse');

-- RTP 0.85 -> 0.75 (el 15% liberado va al bote, casa mantiene ~10%)
update rooms set rtp = 0.75 where active = true;

-- ===== STEP 2: auto_claim_wins con JACKPOT en bloque full_house =====
-- Reescribimos la funcion completa anadiendo: tras pagar el bingo normal,
-- si fue en <= jackpot_max_balls bolas, paga ademas el rollover (bote) y lo resetea.
create or replace function auto_claim_wins()
returns trigger language plpgsql security definer set search_path = public as $$
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
  v_balls int;
  v_jp_gold bigint;
  v_jp_sweeps numeric;
begin
  begin
    select * into v_game from games where id = new.game_id for update;
    if v_game.status != 'playing' then return new; end if;
    select * into v_room from rooms where id = v_game.room_id;
    if not v_room.auto_claim then return new; end if;
    select array_agg(ball_number) into v_called from balls_called where game_id = new.game_id;
    v_balls := coalesce(array_length(v_called, 1), 0);
    v_player_pool_gold := ((coalesce(v_room.rollover_gold, 0) + v_game.pot_gold) * v_room.rtp)::bigint;
    v_player_pool_sweeps := (coalesce(v_room.rollover_sweeps, 0) + v_game.pot_sweeps) * v_room.rtp;

    for v_card in select * from cards where game_id = new.game_id loop
      v_check := check_card_patterns(v_card.card_data, v_called, v_room.variant);

      -- ===== LINE (NO corta la partida) =====
      if (v_check->>'line')::boolean and v_game.line_won_by is null and 'line' = any(v_room.patterns_enabled) then
        v_pct := coalesce((v_room.pattern_rewards->>'line')::numeric, 0.30);
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

      -- ===== TWO LINES (bingo 90, NO corta) =====
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

      -- ===== FULL HOUSE (BINGO - corta la partida + evalua JACKPOT) =====
      if (v_check->>'full_house')::boolean and v_game.full_house_won_by is null and 'full_house' = any(v_room.patterns_enabled) then
        v_pct := coalesce((v_room.pattern_rewards->>'full_house')::numeric, 0.70);
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

          -- ========== JACKPOT (B1): bingo en <= jackpot_max_balls ==========
          if v_balls <= coalesce(v_room.jackpot_max_balls, 40)
             and (coalesce(v_room.rollover_gold, 0) > 0 or coalesce(v_room.rollover_sweeps, 0) > 0) then
            v_jp_gold := coalesce(v_room.rollover_gold, 0);
            v_jp_sweeps := coalesce(v_room.rollover_sweeps, 0);
            if v_jp_gold > 0 then
              update profiles set gold_coins = gold_coins + v_jp_gold where id = v_card.player_id
                returning gold_coins into v_new_balance;
              insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
                values (v_card.player_id, 'gold', v_jp_gold, v_new_balance, 'jackpot', v_game.id);
            end if;
            if v_jp_sweeps > 0 then
              update profiles set sweeps_coins = sweeps_coins + v_jp_sweeps,
                total_won_sweeps = total_won_sweeps + v_jp_sweeps
                where id = v_card.player_id returning sweeps_coins into v_new_balance;
              insert into coin_tx (player_id, currency, amount, balance_after, reason, ref_id)
                values (v_card.player_id, 'sweeps', v_jp_sweeps, v_new_balance, 'jackpot', v_game.id);
            end if;
            -- Claim especial 'jackpot' para overlay dorado + histórico
            insert into claims (game_id, card_id, player_id, pattern, valid, prize_gold, prize_sweeps)
              values (v_game.id, v_card.id, v_card.player_id, 'jackpot', true, v_jp_gold, v_jp_sweeps);
            -- B1: resetear el bote a 0
            update rooms set rollover_gold = 0, rollover_sweeps = 0 where id = v_room.id;
          end if;
          -- ================================================================
        end if;
      end if;
    end loop;
  exception when others then
    -- Cuerpo protegido: si algo falla, la bola igual queda insertada
    return new;
  end;
  return new;
end;
$$;

-- ===== STEP 3: A2 - el bote crece 15% de CADA partida al terminar =====
-- Funcion que suma el 15% del pot al rollover cuando una partida termina.
create or replace function feed_jackpot(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_game games%rowtype;
  v_room rooms%rowtype;
  v_add_gold bigint;
  v_add_sweeps numeric;
begin
  select * into v_game from games where id = p_game_id;
  if not found then return; end if;
  select * into v_room from rooms where id = v_game.room_id;

  -- 15% del pot recaudado de esta partida -> al bote
  v_add_gold := (coalesce(v_game.pot_gold, 0) * 0.15)::bigint;
  v_add_sweeps := coalesce(v_game.pot_sweeps, 0) * 0.15;

  if v_add_gold > 0 or v_add_sweeps > 0 then
    update rooms set
      rollover_gold = coalesce(rollover_gold, 0) + v_add_gold,
      rollover_sweeps = coalesce(rollover_sweeps, 0) + v_add_sweeps
    where id = v_room.id;
  end if;
end;
$$;
grant execute on function feed_jackpot(uuid) to authenticated, anon, service_role;

-- ===== STEP 4: Llamar feed_jackpot al cerrar partida (en call_next_ball) =====
-- Parchear: cada vez que call_next_ball marca finished, alimentar el bote.
-- Lo hacemos con un trigger sobre games (cuando pasa a finished).
create or replace function trg_feed_jackpot_on_finish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and (old.status is distinct from 'finished') then
    begin perform feed_jackpot(new.id); exception when others then null; end;
  end if;
  return new;
end;
$$;

drop trigger if exists feed_jackpot_finish on games;
create trigger feed_jackpot_finish
  after update of status on games
  for each row execute function trg_feed_jackpot_on_finish();

-- ===== STEP 5: Vista para mostrar el bote en vivo (con nombre ganador) =====
create or replace function room_jackpots()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'room_id', id,
    'name', name,
    'jackpot_gold', coalesce(rollover_gold, 0),
    'jackpot_sweeps', coalesce(rollover_sweeps, 0),
    'max_balls', coalesce(jackpot_max_balls, 40)
  )), '[]'::jsonb) from rooms where active = true);
end;
$$;
grant execute on function room_jackpots() to authenticated, anon;

-- ===== STEP 6: Funcion para anunciar ganador con NOMBRE =====
-- El cliente la llama al recibir evento de claims para mostrar el overlay.
create or replace function claim_winner_info(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'pattern', c.pattern,
    'username', p.username,
    'prize_gold', c.prize_gold,
    'prize_sweeps', c.prize_sweeps,
    'is_jackpot', (c.pattern = 'jackpot')
  ) order by c.claimed_at desc), '[]'::jsonb)
  from claims c
  join profiles p on p.id = c.player_id
  where c.game_id = p_game_id and c.valid = true);
end;
$$;
grant execute on function claim_winner_info(uuid) to authenticated, anon;

-- ===== VERIFICACION =====
select '=== CONFIG APLICADA ===' as t;
select name, variant, rtp, jackpot_max_balls,
  pattern_rewards, rollover_gold, rollover_sweeps
from rooms where active = true order by name;
