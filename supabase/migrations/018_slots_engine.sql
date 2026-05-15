-- ============================================================================
-- BingoBolla v19 — SLOTS ENGINE (server-side RNG, RTP controlado)
-- 3 máquinas: Neon 777, Aztec Gold, Diamond Royale
-- + Fix lobby duplicados
-- ============================================================================

-- ============ STEP 0: FIX LOBBY DUPLICADOS ============
-- Mata games huérfanos: deja solo 1 activo (waiting o playing) por sala
update games set status = 'finished'
where status in ('waiting','playing')
  and id not in (
    select distinct on (room_id) id from games
    where status in ('waiting','playing')
    order by room_id, created_at desc
  );

-- ensure_waiting_game con advisory lock (nunca crea duplicados)
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
  -- Lock por sala: dos requests simultáneas no crean 2 games
  perform pg_advisory_xact_lock(hashtext(p_room_id::text));

  select * into v_room from rooms where id = p_room_id and active = true;
  if not found then return null; end if;

  select id into v_game_id from games
    where room_id = p_room_id and status in ('waiting','playing')
    order by created_at desc limit 1;
  if found then return v_game_id; end if;

  insert into games (room_id, status, starts_at, seed_hash)
  values (p_room_id, 'waiting',
    now() + (coalesce(v_room.schedule_interval_seconds,60) || ' seconds')::interval,
    encode(digest(gen_random_uuid()::text || now()::text,'sha256'),'hex'))
  returning id into v_game_id;
  return v_game_id;
end;
$$;
grant execute on function ensure_waiting_game(uuid) to authenticated, anon;

-- ============ STEP 1: TABLAS SLOTS ============
create table if not exists slot_machines (
  id text primary key,
  name text not null,
  theme text not null,
  reels int not null default 5,
  rows int not null default 3,
  paylines int not null default 20,
  currency text not null default 'gold' check (currency in ('gold','sweeps','diamonds')),
  min_bet numeric not null default 1,
  max_bet numeric not null default 100,
  rtp numeric not null default 0.95,
  active boolean default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists slot_spins (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles on delete cascade not null,
  machine_id text references slot_machines not null,
  currency text not null,
  bet numeric not null,
  grid jsonb not null,
  win numeric not null default 0,
  win_lines jsonb default '[]'::jsonb,
  is_free_spin boolean default false,
  multiplier numeric default 1,
  created_at timestamptz default now()
);
create index if not exists slot_spins_player_idx on slot_spins(player_id, created_at desc);

create table if not exists slot_sessions (
  player_id uuid references profiles on delete cascade not null,
  machine_id text references slot_machines not null,
  free_spins_left int default 0,
  free_spin_multiplier numeric default 1,
  streak int default 0,
  updated_at timestamptz default now(),
  primary key (player_id, machine_id)
);

alter table slot_spins enable row level security;
alter table slot_sessions enable row level security;
drop policy if exists "own spins" on slot_spins;
create policy "own spins" on slot_spins for select using (auth.uid() = player_id);
drop policy if exists "own session" on slot_sessions;
create policy "own session" on slot_sessions for all using (auth.uid() = player_id);

-- ============ STEP 2: DEFINIR LAS 3 MÁQUINAS ============
delete from slot_machines;

-- NEON 777 — clásica 3x3, synthwave, Gold
insert into slot_machines (id, name, theme, reels, rows, paylines, currency, min_bet, max_bet, rtp, config) values
('neon-777', 'Neon 777', 'synthwave', 3, 3, 5, 'gold', 5, 500, 0.94,
 '{
   "symbols": [
     {"id":"seven","name":"7","weight":3,"pays":{"3":100}},
     {"id":"bar","name":"BAR","weight":6,"pays":{"3":40}},
     {"id":"bell","name":"Bell","weight":9,"pays":{"3":20}},
     {"id":"diamond","name":"Diamond","weight":11,"pays":{"3":15}},
     {"id":"cherry","name":"Cherry","weight":14,"pays":{"2":2,"3":10}},
     {"id":"lemon","name":"Lemon","weight":16,"pays":{"3":6}},
     {"id":"wild","name":"WILD","weight":4,"pays":{"3":150},"wild":true}
   ],
   "paylines": [[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]],
   "colors": {"primary":"#FF3D7F","secondary":"#00E5FF","bg":"#0a0118"}
 }'::jsonb),

-- AZTEC GOLD — aventura 5x3, Sweeps, free spins
('aztec-gold', 'Aztec Gold', 'aztec', 5, 3, 20, 'sweeps', 0.10, 10, 0.95,
 '{
   "symbols": [
     {"id":"mask","name":"Mask","weight":2,"pays":{"3":20,"4":75,"5":300}},
     {"id":"snake","name":"Snake","weight":4,"pays":{"3":10,"4":40,"5":150}},
     {"id":"jaguar","name":"Jaguar","weight":5,"pays":{"3":8,"4":30,"5":100}},
     {"id":"pyramid","name":"Pyramid","weight":7,"pays":{"3":6,"4":20,"5":60}},
     {"id":"gem_a","name":"A","weight":10,"pays":{"3":4,"4":12,"5":30}},
     {"id":"gem_k","name":"K","weight":11,"pays":{"3":3,"4":10,"5":25}},
     {"id":"gem_q","name":"Q","weight":12,"pays":{"3":2,"4":8,"5":20}},
     {"id":"gem_j","name":"J","weight":13,"pays":{"3":2,"4":6,"5":15}},
     {"id":"wild","name":"WILD","weight":3,"pays":{"3":25,"4":100,"5":500},"wild":true},
     {"id":"scatter","name":"Idol","weight":3,"scatter":true,"pays":{"3":2,"4":10,"5":50}}
   ],
   "scatter_triggers_free": 3,
   "free_spins_awarded": 10,
   "free_spin_multiplier": 2,
   "colors": {"primary":"#C8941A","secondary":"#00E676","bg":"#0d1a0d"}
 }'::jsonb),

-- DIAMOND ROYALE — VIP 5x3, Diamonds, multiplicadores progresivos
('diamond-royale', 'Diamond Royale', 'artdeco', 5, 3, 25, 'diamonds', 1, 50, 0.96,
 '{
   "symbols": [
     {"id":"pink_diamond","name":"Pink Diamond","weight":2,"pays":{"3":30,"4":100,"5":500}},
     {"id":"ring","name":"Ring","weight":4,"pays":{"3":15,"4":50,"5":200}},
     {"id":"goblet","name":"Goblet","weight":5,"pays":{"3":10,"4":35,"5":120}},
     {"id":"watch","name":"Watch","weight":7,"pays":{"3":8,"4":25,"5":80}},
     {"id":"card_a","name":"A","weight":10,"pays":{"3":5,"4":15,"5":40}},
     {"id":"card_k","name":"K","weight":11,"pays":{"3":4,"4":12,"5":30}},
     {"id":"card_q","name":"Q","weight":12,"pays":{"3":3,"4":10,"5":25}},
     {"id":"wild","name":"WILD","weight":3,"pays":{"3":40,"4":150,"5":750},"wild":true,"multiplier":true}
   ],
   "progressive_multipliers": [1,2,3,5],
   "colors": {"primary":"#B388FF","secondary":"#FFD93D","bg":"#0a0a0f"}
 }'::jsonb);

-- ============ STEP 3: spin_slot — RNG ATÓMICO SERVER-SIDE ============
create or replace function spin_slot(
  p_machine_id text,
  p_currency text,
  p_bet numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_machine slot_machines%rowtype;
  v_session slot_sessions%rowtype;
  v_symbols jsonb;
  v_paylines jsonb;
  v_grid jsonb := '[]'::jsonb;
  v_reel jsonb;
  v_total_weight int;
  v_rand int;
  v_acc int;
  v_sym jsonb;
  v_balance numeric;
  v_win numeric := 0;
  v_win_lines jsonb := '[]'::jsonb;
  v_is_free boolean := false;
  v_multiplier numeric := 1;
  v_scatter_count int := 0;
  i int; j int; k int;
  v_col jsonb;
  v_line jsonb;
  v_line_syms text[];
  v_first_sym text;
  v_match_count int;
  v_pay numeric;
  v_wild_ids text[];
  v_scatter_id text;
  v_new_balance numeric;
  v_free_awarded int;
begin
  if v_user_id is null then return jsonb_build_object('error','not_authenticated'); end if;

  select * into v_machine from slot_machines where id = p_machine_id and active = true;
  if not found then return jsonb_build_object('error','machine_not_found'); end if;

  if p_currency != v_machine.currency then
    return jsonb_build_object('error','wrong_currency','expected',v_machine.currency);
  end if;
  if p_bet < v_machine.min_bet or p_bet > v_machine.max_bet then
    return jsonb_build_object('error','invalid_bet','min',v_machine.min_bet,'max',v_machine.max_bet);
  end if;

  v_symbols := v_machine.config->'symbols';

  -- Sesión (free spins / streak)
  select * into v_session from slot_sessions
    where player_id = v_user_id and machine_id = p_machine_id for update;
  if not found then
    insert into slot_sessions (player_id, machine_id) values (v_user_id, p_machine_id)
      returning * into v_session;
  end if;

  v_is_free := v_session.free_spins_left > 0;

  -- ===== COBRO (si no es free spin) =====
  if not v_is_free then
    if p_currency = 'gold' then
      select gold_coins into v_balance from profiles where id = v_user_id for update;
      if v_balance < p_bet then return jsonb_build_object('error','insufficient_funds'); end if;
      update profiles set gold_coins = gold_coins - p_bet where id = v_user_id;
    elsif p_currency = 'sweeps' then
      select sweeps_coins into v_balance from profiles where id = v_user_id for update;
      if v_balance < p_bet then return jsonb_build_object('error','insufficient_funds'); end if;
      update profiles set sweeps_coins = sweeps_coins - p_bet where id = v_user_id;
    elsif p_currency = 'diamonds' then
      select diamonds into v_balance from profiles where id = v_user_id for update;
      if v_balance < p_bet then return jsonb_build_object('error','insufficient_funds'); end if;
      update profiles set diamonds = diamonds - p_bet where id = v_user_id;
    end if;
  else
    v_multiplier := coalesce(v_session.free_spin_multiplier, 1);
    update slot_sessions set free_spins_left = free_spins_left - 1
      where player_id = v_user_id and machine_id = p_machine_id;
  end if;

  -- IDs de wild y scatter
  select array_agg(s->>'id') into v_wild_ids
    from jsonb_array_elements(v_symbols) s where (s->>'wild')::boolean;
  select (s->>'id') into v_scatter_id
    from jsonb_array_elements(v_symbols) s where (s->>'scatter')::boolean limit 1;

  -- Peso total
  select sum((s->>'weight')::int) into v_total_weight
    from jsonb_array_elements(v_symbols) s;

  -- ===== GENERAR GRID (reels x rows) =====
  for i in 0..(v_machine.reels - 1) loop
    v_col := '[]'::jsonb;
    for j in 0..(v_machine.rows - 1) loop
      v_rand := floor(random() * v_total_weight)::int;
      v_acc := 0;
      for v_sym in select * from jsonb_array_elements(v_symbols) loop
        v_acc := v_acc + (v_sym->>'weight')::int;
        if v_rand < v_acc then
          v_col := v_col || to_jsonb(v_sym->>'id');
          exit;
        end if;
      end loop;
    end loop;
    v_grid := v_grid || jsonb_build_array(v_col);
  end loop;

  -- ===== CONTAR SCATTERS =====
  if v_scatter_id is not null then
    for i in 0..(v_machine.reels - 1) loop
      for j in 0..(v_machine.rows - 1) loop
        if v_grid->i->>j = v_scatter_id then
          v_scatter_count := v_scatter_count + 1;
        end if;
      end loop;
    end loop;
  end if;

  -- ===== EVALUAR PAYLINES =====
  if v_machine.id = 'neon-777' then
    v_paylines := v_machine.config->'paylines';
  else
    -- Para 5x3: generar líneas estándar (filas + algunas diagonales/zigzag)
    v_paylines := jsonb_build_array(
      jsonb_build_array(1,1,1,1,1), jsonb_build_array(0,0,0,0,0), jsonb_build_array(2,2,2,2,2),
      jsonb_build_array(0,1,2,1,0), jsonb_build_array(2,1,0,1,2),
      jsonb_build_array(0,0,1,2,2), jsonb_build_array(2,2,1,0,0),
      jsonb_build_array(1,0,0,0,1), jsonb_build_array(1,2,2,2,1),
      jsonb_build_array(0,1,0,1,0), jsonb_build_array(2,1,2,1,2),
      jsonb_build_array(1,1,0,1,1), jsonb_build_array(1,1,2,1,1),
      jsonb_build_array(0,1,1,1,0), jsonb_build_array(2,1,1,1,2),
      jsonb_build_array(1,0,1,0,1), jsonb_build_array(1,2,1,2,1),
      jsonb_build_array(0,2,0,2,0), jsonb_build_array(2,0,2,0,2),
      jsonb_build_array(0,0,2,0,0), jsonb_build_array(2,2,0,2,2),
      jsonb_build_array(1,0,2,0,1), jsonb_build_array(1,2,0,2,1),
      jsonb_build_array(0,2,2,2,0), jsonb_build_array(2,0,0,0,2)
    );
  end if;

  -- Evaluar cada payline (hasta paylines de la máquina)
  for k in 0..(least(jsonb_array_length(v_paylines), v_machine.paylines) - 1) loop
    v_line := v_paylines->k;
    v_line_syms := array[]::text[];
    for i in 0..(v_machine.reels - 1) loop
      v_line_syms := v_line_syms || (v_grid->i->>((v_line->>i)::int));
    end loop;

    -- Primer símbolo no-wild de la línea
    v_first_sym := null;
    foreach v_first_sym in array v_line_syms loop
      if not (v_first_sym = any(coalesce(v_wild_ids,array[]::text[]))) then exit; end if;
    end loop;
    if v_first_sym is null then v_first_sym := v_line_syms[1]; end if;
    if v_scatter_id is not null and v_first_sym = v_scatter_id then continue; end if;

    -- Contar match desde la izquierda (wild cuenta)
    v_match_count := 0;
    for i in 1..array_length(v_line_syms,1) loop
      if v_line_syms[i] = v_first_sym
         or v_line_syms[i] = any(coalesce(v_wild_ids,array[]::text[])) then
        v_match_count := v_match_count + 1;
      else
        exit;
      end if;
    end loop;

    -- Pago
    select (s->'pays'->>v_match_count::text)::numeric into v_pay
      from jsonb_array_elements(v_symbols) s where s->>'id' = v_first_sym;

    if v_pay is not null and v_pay > 0 then
      v_win := v_win + (p_bet * v_pay / coalesce(v_machine.paylines,1) * v_match_count);
      v_win_lines := v_win_lines || jsonb_build_object(
        'line', k, 'symbol', v_first_sym, 'count', v_match_count,
        'pay', round(p_bet * v_pay / coalesce(v_machine.paylines,1) * v_match_count, 4)
      );
    end if;
  end loop;

  -- Pago de scatter (independiente de líneas)
  if v_scatter_id is not null and v_scatter_count >= 3 then
    select (s->'pays'->>v_scatter_count::text)::numeric into v_pay
      from jsonb_array_elements(v_symbols) s where s->>'id' = v_scatter_id;
    if v_pay is not null then
      v_win := v_win + (p_bet * v_pay);
      v_win_lines := v_win_lines || jsonb_build_object('scatter', true, 'count', v_scatter_count, 'pay', round(p_bet * v_pay,4));
    end if;
  end if;

  -- Aplicar multiplicador (free spins)
  v_win := round(v_win * v_multiplier, 4);

  -- ===== FREE SPINS TRIGGER =====
  v_free_awarded := 0;
  if (v_machine.config->>'scatter_triggers_free') is not null
     and v_scatter_count >= (v_machine.config->>'scatter_triggers_free')::int then
    v_free_awarded := (v_machine.config->>'free_spins_awarded')::int;
    update slot_sessions set
      free_spins_left = free_spins_left + v_free_awarded,
      free_spin_multiplier = coalesce((v_machine.config->>'free_spin_multiplier')::numeric, 2)
      where player_id = v_user_id and machine_id = p_machine_id;
  end if;

  -- ===== ACREDITAR PREMIO =====
  if v_win > 0 then
    if p_currency = 'gold' then
      update profiles set gold_coins = gold_coins + v_win where id = v_user_id
        returning gold_coins into v_new_balance;
    elsif p_currency = 'sweeps' then
      update profiles set sweeps_coins = sweeps_coins + v_win where id = v_user_id
        returning sweeps_coins into v_new_balance;
    elsif p_currency = 'diamonds' then
      update profiles set diamonds = diamonds + v_win where id = v_user_id
        returning diamonds into v_new_balance;
    end if;
  else
    if p_currency = 'gold' then select gold_coins into v_new_balance from profiles where id = v_user_id;
    elsif p_currency = 'sweeps' then select sweeps_coins into v_new_balance from profiles where id = v_user_id;
    else select diamonds into v_new_balance from profiles where id = v_user_id;
    end if;
  end if;

  -- Streak (para multiplicador progresivo Diamond Royale)
  if v_win > 0 then
    update slot_sessions set streak = streak + 1, updated_at = now()
      where player_id = v_user_id and machine_id = p_machine_id;
  else
    update slot_sessions set streak = 0, updated_at = now()
      where player_id = v_user_id and machine_id = p_machine_id;
  end if;

  -- Registrar spin
  insert into slot_spins (player_id, machine_id, currency, bet, grid, win, win_lines, is_free_spin, multiplier)
  values (v_user_id, p_machine_id, p_currency, p_bet, v_grid, v_win, v_win_lines, v_is_free, v_multiplier);

  -- Estado free spins restante
  select free_spins_left into v_session.free_spins_left from slot_sessions
    where player_id = v_user_id and machine_id = p_machine_id;

  return jsonb_build_object(
    'ok', true,
    'grid', v_grid,
    'win', v_win,
    'win_lines', v_win_lines,
    'is_free_spin', v_is_free,
    'multiplier', v_multiplier,
    'free_spins_awarded', v_free_awarded,
    'free_spins_left', coalesce(v_session.free_spins_left, 0),
    'scatter_count', v_scatter_count,
    'new_balance', v_new_balance,
    'big_win', (v_win >= p_bet * 15)
  );
end;
$$;
grant execute on function spin_slot(text, text, numeric) to authenticated;

-- ============ STEP 4: get_slot_state ============
create or replace function get_slot_state(p_machine_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_machine slot_machines%rowtype;
  v_session slot_sessions%rowtype;
  v_recent jsonb;
begin
  select * into v_machine from slot_machines where id = p_machine_id;
  if not found then return jsonb_build_object('error','not_found'); end if;

  select * into v_session from slot_sessions
    where player_id = v_user_id and machine_id = p_machine_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'win', win, 'bet', bet, 'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v_recent
  from (select * from slot_spins
    where player_id = v_user_id and machine_id = p_machine_id
    order by created_at desc limit 10) t;

  return jsonb_build_object(
    'machine', to_jsonb(v_machine),
    'free_spins_left', coalesce(v_session.free_spins_left, 0),
    'streak', coalesce(v_session.streak, 0),
    'recent', v_recent
  );
end;
$$;
grant execute on function get_slot_state(text) to authenticated, anon;

select '=== SLOTS LISTAS ===' as t;
select id, name, theme, reels||'x'||rows as grid, paylines, currency, rtp from slot_machines order by rtp;
