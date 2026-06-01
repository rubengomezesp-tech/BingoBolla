-- ============================================================================
-- Harden public API surface: functions deny-by-default + no direct economy DML
-- ============================================================================

begin;

-- Functions in public are callable through /rest/v1/rpc by default. Start from
-- a closed surface, then explicitly re-open the browser contract below.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;

create or replace function pg_temp.harden_public_function(
  p_signature text,
  p_grantees text default null,
  p_set_search_path boolean default true
)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(p_signature) is null then
    return;
  end if;

  if p_set_search_path then
    execute format('alter function %s set search_path = public', p_signature);
  end if;

  if p_grantees is not null and length(trim(p_grantees)) > 0 then
    execute format('grant execute on function %s to %s', p_signature, p_grantees);
  end if;
end;
$$;

-- Public/read-only RPCs used by unauthenticated landing/world surfaces.
select pg_temp.harden_public_function('public.get_world_map(text)', 'anon, authenticated');
select pg_temp.harden_public_function('public.get_world_assets()', 'anon, authenticated');
select pg_temp.harden_public_function('public.room_jackpots()', 'anon, authenticated');
select pg_temp.harden_public_function('public.is_state_excluded(text)', 'anon, authenticated');

-- Authenticated user flows.
select pg_temp.harden_public_function('public.buy_ticket(uuid,text)', 'authenticated');
select pg_temp.harden_public_function('public.buy_strip(uuid,text)', 'authenticated');
select pg_temp.harden_public_function('public.claim_daily_bonus()', 'authenticated');
select pg_temp.harden_public_function('public.daily_bonus_status()', 'authenticated');
select pg_temp.harden_public_function('public.claim_daily_xp()', 'authenticated');
select pg_temp.harden_public_function('public.claim_roulette_spin()', 'authenticated');
select pg_temp.harden_public_function('public.claim_streak()', 'authenticated');
select pg_temp.harden_public_function('public.claim_winner_info(uuid)', 'authenticated');
select pg_temp.harden_public_function('public.ensure_waiting_game(uuid)', 'authenticated');
select pg_temp.harden_public_function('public.get_card_status(uuid)', 'authenticated');
select pg_temp.harden_public_function('public.get_player_xp(uuid)', 'authenticated');
select pg_temp.harden_public_function('public.get_room_state(uuid)', 'authenticated');
select pg_temp.harden_public_function('public.get_slot_state(text)', 'authenticated');
select pg_temp.harden_public_function('public.my_progress()', 'authenticated');
select pg_temp.harden_public_function('public.my_missions()', 'authenticated');
select pg_temp.harden_public_function('public.redeem_code(text)', 'authenticated');
select pg_temp.harden_public_function('public.request_diamond_redemption(numeric,text,jsonb)', 'authenticated');
select pg_temp.harden_public_function('public.request_self_exclusion(text,text)', 'authenticated');
select pg_temp.harden_public_function('public.submit_onboarding(date,text,text)', 'authenticated');
select pg_temp.harden_public_function('public.upsert_rg_limits(jsonb)', 'authenticated');
select pg_temp.harden_public_function('public.get_player_cosmetics()', 'authenticated');
select pg_temp.harden_public_function('public.save_player_cosmetics(jsonb)', 'authenticated');
select pg_temp.harden_public_function('public.play_slot(uuid,numeric,text)', 'authenticated');
select pg_temp.harden_public_function('public.spin_slot(text,text,numeric)', 'authenticated');
select pg_temp.harden_public_function('public.spin_hold_win(text,text,numeric)', 'authenticated');

-- Admin UI still calls these from the authenticated client, but each function
-- also checks is_admin() internally. Removing anon/public closes the immediate
-- exposure while preserving the current admin screen.
select pg_temp.harden_public_function('public.is_admin()', 'authenticated');
select pg_temp.harden_public_function('public.admin_stats()', 'authenticated');
select pg_temp.harden_public_function('public.admin_list_codes()', 'authenticated');
select pg_temp.harden_public_function('public.admin_grant_coins(text,bigint,numeric,numeric)', 'authenticated');
select pg_temp.harden_public_function('public.admin_create_code(text,text,bigint,numeric,numeric,integer,integer,integer)', 'authenticated');

-- Server-only/internals. Re-grant to service_role so Next webhooks/cron can call
-- them with the server key, but browser roles cannot hit them through RPC.
select pg_temp.harden_public_function('public.credit_purchase(uuid,uuid,integer,text,text)', 'service_role');
select pg_temp.harden_public_function('public.credit_diamonds(uuid,numeric,uuid)', 'service_role');
select pg_temp.harden_public_function('public.can_award(uuid,numeric,text)', 'service_role');
select pg_temp.harden_public_function('public.refresh_reward_budget()', 'service_role');
select pg_temp.harden_public_function('public.feed_jackpot(uuid)', 'service_role');
select pg_temp.harden_public_function('public.advance_mission(uuid,text,integer)', 'service_role');
select pg_temp.harden_public_function('public.engage(uuid,integer,text)', 'service_role');
select pg_temp.harden_public_function('public.add_xp(uuid,integer)', 'service_role');
select pg_temp.harden_public_function('public.grant_xp(uuid,integer)', 'service_role');
select pg_temp.harden_public_function('public.start_game(uuid)', 'service_role');
select pg_temp.harden_public_function('public.call_next_ball(uuid)', 'service_role');
select pg_temp.harden_public_function('public.tick_game(uuid)', 'service_role');
select pg_temp.harden_public_function('public.tick_waiting_game(uuid)', 'service_role');
select pg_temp.harden_public_function('public.auto_claim_wins()', 'service_role');
select pg_temp.harden_public_function('public.check_pattern_winners(uuid,text)', 'service_role');
select pg_temp.harden_public_function('public.check_card_patterns(jsonb,integer[],text)', 'service_role');

-- Remove direct browser-side mutations for economy, game state, progress and
-- ledgers. Security-definer RPCs/triggers remain responsible for writes.
create or replace function pg_temp.revoke_browser_dml(p_relation text)
returns void
language plpgsql
as $$
begin
  if to_regclass(p_relation) is null then
    return;
  end if;

  execute format(
    'revoke insert, update, delete, truncate on table %s from anon, authenticated',
    p_relation
  );
end;
$$;

select pg_temp.revoke_browser_dml('public.profiles');
select pg_temp.revoke_browser_dml('public.games');
select pg_temp.revoke_browser_dml('public.balls_called');
select pg_temp.revoke_browser_dml('public.cards');
select pg_temp.revoke_browser_dml('public.claims');
select pg_temp.revoke_browser_dml('public.coin_tx');
select pg_temp.revoke_browser_dml('public.diamond_tx');
select pg_temp.revoke_browser_dml('public.diamond_redemptions');
select pg_temp.revoke_browser_dml('public.purchases');
select pg_temp.revoke_browser_dml('public.house_ledger');
select pg_temp.revoke_browser_dml('public.player_world_progress');
select pg_temp.revoke_browser_dml('public.world_game_runs');
select pg_temp.revoke_browser_dml('public.slot_spins');
select pg_temp.revoke_browser_dml('public.slot_sessions');
select pg_temp.revoke_browser_dml('public.promo_codes');
select pg_temp.revoke_browser_dml('public.code_redemptions');
select pg_temp.revoke_browser_dml('public.rg_limits');
select pg_temp.revoke_browser_dml('public.self_exclusions');
select pg_temp.revoke_browser_dml('public.player_cosmetics');
select pg_temp.revoke_browser_dml('public.roulette_spin_history');
select pg_temp.revoke_browser_dml('public.world_assets');

-- Keep profile reads, but do not allow users to edit balances, KYC, flags, or
-- totals directly. The onboarding page may still update the user's own IP hint.
drop policy if exists "Update own profile" on public.profiles;
drop policy if exists "Update own profile telemetry" on public.profiles;
create policy "Update own profile telemetry"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on table public.profiles to authenticated;
do $$
begin
  if to_regclass('public.profiles') is not null then
    grant update (last_ip, last_ip_state, last_ip_country, last_ip_at)
      on table public.profiles
      to authenticated;
  end if;
end;
$$;

-- Explicit read grants for browser-visible tables after the DML revokes.
grant select on table public.rooms to anon, authenticated;
grant select on table public.games to anon, authenticated;
grant select on table public.balls_called to anon, authenticated;
grant select on table public.cards to authenticated;
grant select on table public.claims to authenticated;
grant select on table public.coin_tx to authenticated;
grant select on table public.diamond_tx to authenticated;
grant select on table public.diamond_redemptions to authenticated;
grant select on table public.purchases to authenticated;
grant select on table public.player_world_progress to authenticated;
grant select on table public.world_game_runs to authenticated;
grant select on table public.slot_spins to authenticated;
grant select on table public.slot_sessions to authenticated;
grant select on table public.promo_codes to anon, authenticated;
grant select on table public.code_redemptions to authenticated;
grant select on table public.rg_limits to authenticated;
grant select on table public.self_exclusions to authenticated;
grant select on table public.world_assets to anon, authenticated;

commit;
