-- Controlled world node tuning for the admin BFF.
-- Keeps balance changes bounded, transactional and auditable.

alter table public.world_nodes
  drop constraint if exists world_nodes_reward_xp_bounds,
  add constraint world_nodes_reward_xp_bounds
    check (reward_xp between 0 and 5000);

alter table public.world_nodes
  drop constraint if exists world_nodes_reward_gold_bounds,
  add constraint world_nodes_reward_gold_bounds
    check (reward_gold between 0 and 1000000);

alter table public.world_nodes
  drop constraint if exists world_nodes_max_stars_bounds,
  add constraint world_nodes_max_stars_bounds
    check (max_stars between 1 and 3);

create table if not exists public.world_node_tuning_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  node_id uuid not null references public.world_nodes(id) on delete cascade,
  world_id text not null references public.worlds(id) on delete cascade,
  action text not null check (action in ('apply')),
  reason text not null default '',
  before_values jsonb not null,
  after_values jsonb not null,
  impact_preview jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_world_node_tuning_audit_created
  on public.world_node_tuning_audit(created_at desc);

create index if not exists idx_world_node_tuning_audit_node_created
  on public.world_node_tuning_audit(node_id, created_at desc);

alter table public.world_node_tuning_audit enable row level security;

revoke all on table public.world_node_tuning_audit from anon, authenticated;
grant all on table public.world_node_tuning_audit to service_role;

comment on table public.world_node_tuning_audit is
  'Admin-only audit trail for bounded world node reward/star tuning.';

comment on column public.world_node_tuning_audit.before_values is
  'Whitelisted world_nodes values before the tuning operation.';

comment on column public.world_node_tuning_audit.after_values is
  'Whitelisted world_nodes values after the tuning operation.';

comment on column public.world_node_tuning_audit.impact_preview is
  'Server-generated impact estimate that the admin reviewed before applying.';

create or replace function public.service_admin_apply_world_node_tuning(
  p_actor_id uuid,
  p_node_id uuid,
  p_expected_reward_xp integer,
  p_expected_reward_gold bigint,
  p_expected_max_stars integer,
  p_reward_xp integer,
  p_reward_gold bigint,
  p_max_stars integer,
  p_reason text,
  p_impact_preview jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_email text;
  v_before public.world_nodes%rowtype;
  v_after public.world_nodes%rowtype;
  v_before_values jsonb;
  v_after_values jsonb;
  v_audit_id uuid;
  v_reason text := left(trim(coalesce(p_reason, '')), 240);
begin
  if p_actor_id is null then
    return jsonb_build_object('error', 'actor_required');
  end if;

  select lower(email)
    into v_actor_email
    from auth.users
    where id = p_actor_id;

  if v_actor_email is distinct from 'rubengomezesp@gmail.com' then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if p_node_id is null then
    return jsonb_build_object('error', 'invalid_node');
  end if;

  if p_reward_xp is null or p_reward_xp < 0 or p_reward_xp > 5000 then
    return jsonb_build_object('error', 'invalid_reward_xp');
  end if;

  if p_reward_gold is null or p_reward_gold < 0 or p_reward_gold > 1000000 then
    return jsonb_build_object('error', 'invalid_reward_gold');
  end if;

  if p_max_stars is null or p_max_stars < 1 or p_max_stars > 3 then
    return jsonb_build_object('error', 'invalid_max_stars');
  end if;

  select *
    into v_before
    from public.world_nodes
    where id = p_node_id
    for update;

  if not found then
    return jsonb_build_object('error', 'node_not_found');
  end if;

  if v_before.reward_xp is distinct from p_expected_reward_xp
    or v_before.reward_gold is distinct from p_expected_reward_gold
    or v_before.max_stars is distinct from p_expected_max_stars then
    return jsonb_build_object('error', 'stale_node');
  end if;

  if v_before.reward_xp = p_reward_xp
    and v_before.reward_gold = p_reward_gold
    and v_before.max_stars = p_max_stars then
    return jsonb_build_object('error', 'no_changes');
  end if;

  v_before_values := jsonb_build_object(
    'id', v_before.id,
    'world_id', v_before.world_id,
    'node_index', v_before.node_index,
    'node_type', v_before.node_type,
    'title', v_before.title,
    'target_ref', v_before.target_ref,
    'reward_xp', v_before.reward_xp,
    'reward_gold', v_before.reward_gold,
    'max_stars', v_before.max_stars,
    'active', v_before.active
  );

  update public.world_nodes
    set reward_xp = p_reward_xp,
        reward_gold = p_reward_gold,
        max_stars = p_max_stars
    where id = p_node_id
    returning * into v_after;

  v_after_values := jsonb_build_object(
    'id', v_after.id,
    'world_id', v_after.world_id,
    'node_index', v_after.node_index,
    'node_type', v_after.node_type,
    'title', v_after.title,
    'target_ref', v_after.target_ref,
    'reward_xp', v_after.reward_xp,
    'reward_gold', v_after.reward_gold,
    'max_stars', v_after.max_stars,
    'active', v_after.active
  );

  insert into public.world_node_tuning_audit (
    actor_id,
    node_id,
    world_id,
    action,
    reason,
    before_values,
    after_values,
    impact_preview
  )
  values (
    p_actor_id,
    p_node_id,
    v_after.world_id,
    'apply',
    v_reason,
    v_before_values,
    v_after_values,
    coalesce(p_impact_preview, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return jsonb_build_object(
    'ok', true,
    'audit_id', v_audit_id,
    'before', v_before_values,
    'after', v_after_values
  );
end;
$$;

revoke all on function public.service_admin_apply_world_node_tuning(
  uuid,
  uuid,
  integer,
  bigint,
  integer,
  integer,
  bigint,
  integer,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.service_admin_apply_world_node_tuning(
  uuid,
  uuid,
  integer,
  bigint,
  integer,
  integer,
  bigint,
  integer,
  text,
  jsonb
) to service_role;
