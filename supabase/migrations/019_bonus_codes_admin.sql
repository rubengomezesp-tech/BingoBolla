-- BingoBolla v20 — Bonus diario + Códigos promo + Admin
alter table profiles add column if not exists last_daily_bonus_at timestamptz;

create or replace function claim_daily_bonus()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid := auth.uid(); v_last timestamptz;
  v_gold_amt bigint := 500; v_sweeps_amt numeric := 0.50;
  v_new_gold bigint; v_new_sweeps numeric;
begin
  if v_user_id is null then return jsonb_build_object('error','not_authenticated'); end if;
  select last_daily_bonus_at into v_last from profiles where id=v_user_id for update;
  if v_last is not null and v_last > now()-interval '24 hours' then
    return jsonb_build_object('error','already_claimed',
      'next_at',v_last+interval '24 hours',
      'seconds_left',extract(epoch from ((v_last+interval '24 hours')-now()))::int);
  end if;
  update profiles set gold_coins=gold_coins+v_gold_amt,
    sweeps_coins=sweeps_coins+v_sweeps_amt, last_daily_bonus_at=now()
  where id=v_user_id returning gold_coins,sweeps_coins into v_new_gold,v_new_sweeps;
  insert into coin_tx (player_id,currency,amount,balance_after,reason,ref_id)
    values (v_user_id,'gold',v_gold_amt,v_new_gold,'daily_bonus',v_user_id);
  insert into coin_tx (player_id,currency,amount,balance_after,reason,ref_id)
    values (v_user_id,'sweeps',v_sweeps_amt,v_new_sweeps,'daily_bonus',v_user_id);
  return jsonb_build_object('ok',true,'gold_awarded',v_gold_amt,
    'sweeps_awarded',v_sweeps_amt,'new_gold',v_new_gold,'new_sweeps',v_new_sweeps,
    'next_at',now()+interval '24 hours');
end; $$;
grant execute on function claim_daily_bonus() to authenticated;

create or replace function daily_bonus_status()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid := auth.uid(); v_last timestamptz;
begin
  select last_daily_bonus_at into v_last from profiles where id=v_user_id;
  if v_last is null or v_last <= now()-interval '24 hours' then
    return jsonb_build_object('available',true);
  end if;
  return jsonb_build_object('available',false,
    'seconds_left',extract(epoch from ((v_last+interval '24 hours')-now()))::int);
end; $$;
grant execute on function daily_bonus_status() to authenticated;

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind text not null check (kind in ('coins','discount')),
  gold_amount bigint default 0, sweeps_amount numeric default 0,
  diamonds_amount numeric default 0, discount_pct int default 0,
  max_uses int default 1, uses int default 0,
  per_user_once boolean default true, expires_at timestamptz,
  active boolean default true, created_by uuid, created_at timestamptz default now()
);
create table if not exists code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references promo_codes on delete cascade not null,
  player_id uuid references profiles on delete cascade not null,
  redeemed_at timestamptz default now(), unique (code_id,player_id)
);
alter table promo_codes enable row level security;
alter table code_redemptions enable row level security;
drop policy if exists "anyone reads active codes" on promo_codes;
create policy "anyone reads active codes" on promo_codes for select using (active=true);
drop policy if exists "own redemptions" on code_redemptions;
create policy "own redemptions" on code_redemptions for select using (auth.uid()=player_id);

create or replace function redeem_code(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid := auth.uid(); v_code promo_codes%rowtype;
  v_new_gold bigint; v_new_sweeps numeric; v_new_diamonds numeric;
begin
  if v_user_id is null then return jsonb_build_object('error','not_authenticated'); end if;
  select * into v_code from promo_codes where upper(code)=upper(trim(p_code)) and active=true for update;
  if not found then return jsonb_build_object('error','invalid_code'); end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('error','expired'); end if;
  if v_code.uses >= v_code.max_uses then
    return jsonb_build_object('error','max_uses_reached'); end if;
  if v_code.per_user_once and exists(select 1 from code_redemptions
    where code_id=v_code.id and player_id=v_user_id) then
    return jsonb_build_object('error','already_redeemed'); end if;
  if v_code.kind='discount' then
    insert into code_redemptions (code_id,player_id) values (v_code.id,v_user_id);
    update promo_codes set uses=uses+1 where id=v_code.id;
    return jsonb_build_object('ok',true,'kind','discount','discount_pct',v_code.discount_pct);
  end if;
  update profiles set gold_coins=gold_coins+coalesce(v_code.gold_amount,0),
    sweeps_coins=sweeps_coins+coalesce(v_code.sweeps_amount,0),
    diamonds=coalesce(diamonds,0)+coalesce(v_code.diamonds_amount,0)
  where id=v_user_id returning gold_coins,sweeps_coins,diamonds
    into v_new_gold,v_new_sweeps,v_new_diamonds;
  insert into code_redemptions (code_id,player_id) values (v_code.id,v_user_id);
  update promo_codes set uses=uses+1 where id=v_code.id;
  if coalesce(v_code.gold_amount,0)>0 then
    insert into coin_tx (player_id,currency,amount,balance_after,reason,ref_id)
      values (v_user_id,'gold',v_code.gold_amount,v_new_gold,'promo_code',v_code.id);
  end if;
  if coalesce(v_code.sweeps_amount,0)>0 then
    insert into coin_tx (player_id,currency,amount,balance_after,reason,ref_id)
      values (v_user_id,'sweeps',v_code.sweeps_amount,v_new_sweeps,'promo_code',v_code.id);
  end if;
  return jsonb_build_object('ok',true,'kind','coins',
    'gold_awarded',v_code.gold_amount,'sweeps_awarded',v_code.sweeps_amount,
    'diamonds_awarded',v_code.diamonds_amount,'new_gold',v_new_gold,
    'new_sweeps',v_new_sweeps,'new_diamonds',v_new_diamonds);
end; $$;
grant execute on function redeem_code(text) to authenticated;

create or replace function is_admin()
returns boolean language plpgsql security definer set search_path=public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id=auth.uid();
  return v_email = 'rubengomezesp@gmail.com';
end; $$;
grant execute on function is_admin() to authenticated;

create or replace function admin_grant_coins(p_email text,p_gold bigint,p_sweeps numeric,p_diamonds numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_target uuid; v_ng bigint; v_ns numeric; v_nd numeric;
begin
  if not is_admin() then return jsonb_build_object('error','forbidden'); end if;
  select u.id into v_target from auth.users u where u.email=lower(trim(p_email));
  if v_target is null then return jsonb_build_object('error','user_not_found'); end if;
  update profiles set gold_coins=gold_coins+coalesce(p_gold,0),
    sweeps_coins=sweeps_coins+coalesce(p_sweeps,0),
    diamonds=coalesce(diamonds,0)+coalesce(p_diamonds,0)
  where id=v_target returning gold_coins,sweeps_coins,diamonds into v_ng,v_ns,v_nd;
  if coalesce(p_gold,0)<>0 then
    insert into coin_tx (player_id,currency,amount,balance_after,reason,ref_id)
      values (v_target,'gold',p_gold,v_ng,'admin_grant',auth.uid());
  end if;
  if coalesce(p_sweeps,0)<>0 then
    insert into coin_tx (player_id,currency,amount,balance_after,reason,ref_id)
      values (v_target,'sweeps',p_sweeps,v_ns,'admin_grant',auth.uid());
  end if;
  return jsonb_build_object('ok',true,'email',p_email,
    'new_gold',v_ng,'new_sweeps',v_ns,'new_diamonds',v_nd);
end; $$;
grant execute on function admin_grant_coins(text,bigint,numeric,numeric) to authenticated;

create or replace function admin_create_code(p_code text,p_kind text,
  p_gold bigint,p_sweeps numeric,p_diamonds numeric,
  p_discount_pct int,p_max_uses int,p_expires_days int)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not is_admin() then return jsonb_build_object('error','forbidden'); end if;
  insert into promo_codes (code,kind,gold_amount,sweeps_amount,diamonds_amount,
    discount_pct,max_uses,expires_at,created_by)
  values (upper(trim(p_code)),p_kind,coalesce(p_gold,0),coalesce(p_sweeps,0),
    coalesce(p_diamonds,0),coalesce(p_discount_pct,0),coalesce(p_max_uses,1),
    case when p_expires_days>0 then now()+(p_expires_days||' days')::interval else null end,
    auth.uid())
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id,'code',upper(trim(p_code)));
exception when unique_violation then
  return jsonb_build_object('error','code_exists');
end; $$;
grant execute on function admin_create_code(text,text,bigint,numeric,numeric,int,int,int) to authenticated;

create or replace function admin_stats()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object(
    'total_users',(select count(*) from profiles),
    'total_games',(select count(*) from games where status='finished'),
    'active_games',(select count(*) from games where status in ('waiting','playing')),
    'total_spins',(select count(*) from slot_spins),
    'total_purchases',(select count(*) from purchases where status='completed'),
    'revenue_usd',(select coalesce(sum(amount_cents),0)/100.0 from purchases where status='completed'),
    'codes_active',(select count(*) from promo_codes where active=true),
    'codes_redeemed',(select count(*) from code_redemptions));
end; $$;
grant execute on function admin_stats() to authenticated;

create or replace function admin_list_codes()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then return jsonb_build_object('error','forbidden'); end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('code',code,'kind',kind,
    'gold',gold_amount,'sweeps',sweeps_amount,'diamonds',diamonds_amount,
    'discount_pct',discount_pct,'uses',uses,'max_uses',max_uses,
    'active',active,'expires_at',expires_at) order by created_at desc),'[]'::jsonb)
    from promo_codes);
end; $$;
grant execute on function admin_list_codes() to authenticated;

select 'v20 OK: bonus, codes, admin creados' as resultado;
