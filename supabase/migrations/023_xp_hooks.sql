-- ============================================================
-- 023_xp_hooks.sql  ·  MÓDULO 2: Enganchar EXP a acciones reales
-- ============================================================
-- Redefine auto_claim_wins() = COPIA EXACTA de 021 + 3 líneas add_xp
-- protegidas individualmente. La lógica de premios/dinero/jackpot
-- es IDÉNTICA carácter por carácter. El EXP NUNCA puede afectar al
-- pago: cada add_xp va en su propio bloque begin/exception.
-- EXP: línea +20 · doble +35 · bingo +60
-- ============================================================

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
          -- [XP] +20 por línea · protegido: si falla, NO afecta premio
          begin perform add_xp(v_card.player_id, 20); exception when others then null; end;
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
          -- [XP] +35 por doble línea · protegido
          begin perform add_xp(v_card.player_id, 35); exception when others then null; end;
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
          -- [XP] +60 por BINGO (full house) · protegido
          begin perform add_xp(v_card.player_id, 60); exception when others then null; end;

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

-- ============================================================
-- FIN MÓDULO 2 (parte wins). buy_ticket EXP = paso siguiente.
-- ============================================================
