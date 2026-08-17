-- ORVIX growth + resilience layer.
-- Feature flags, abandoned checkout sessions and daily operational snapshots.

create table if not exists public.feature_flags (
  flag_key text primary key,
  enabled boolean not null default false,
  rollout_percent integer not null default 100 check (rollout_percent >= 0 and rollout_percent <= 100),
  description text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feature_flags(flag_key, enabled, rollout_percent, description)
values
  ('dynamic_product_checkout', true, 100, 'Use live product data and atomic order safety in checkout.'),
  ('commerce_queue', true, 100, 'Process non-critical order side effects in the background.'),
  ('fraud_signals', true, 100, 'Record non-blocking checkout risk signals.'),
  ('scheduled_pricing', true, 100, 'Allow time-based product pricing.'),
  ('variant_stock', true, 100, 'Enable per-variant stock when variants are configured.')
on conflict (flag_key) do nothing;

create table if not exists public.checkout_sessions (
  session_key text primary key,
  source_hash text,
  user_agent_hash text,
  visitor_id text,
  analytics_session_id text,
  product_slug text,
  variant_key text,
  stage text not null default 'checkout_started' check (stage in (
    'checkout_started',
    'checkout_active',
    'checkout_left',
    'order_submitting',
    'completed'
  )),
  metadata jsonb not null default '{}'::jsonb,
  completed_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists checkout_sessions_stage_last_seen_idx
  on public.checkout_sessions(stage, last_seen_at desc);
create index if not exists checkout_sessions_product_last_seen_idx
  on public.checkout_sessions(product_slug, last_seen_at desc)
  where product_slug is not null;
create index if not exists checkout_sessions_completed_idx
  on public.checkout_sessions(completed_at desc)
  where completed_at is not null;

create table if not exists public.commerce_snapshots (
  snapshot_date date primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.commerce_snapshots enable row level security;

grant select, insert, update, delete on public.feature_flags to service_role;
grant select, insert, update, delete on public.checkout_sessions to service_role;
grant select, insert, update, delete on public.commerce_snapshots to service_role;

create or replace function public.orvix_mark_checkout_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.checkout_session_key is not null then
    insert into public.checkout_sessions(
      session_key,
      product_slug,
      variant_key,
      stage,
      completed_order_id,
      created_at,
      last_seen_at,
      completed_at
    ) values (
      new.checkout_session_key,
      new.product_slug,
      new.variant_key,
      'completed',
      new.id,
      new.created_at,
      now(),
      now()
    )
    on conflict (session_key) do update set
      product_slug = coalesce(excluded.product_slug, public.checkout_sessions.product_slug),
      variant_key = coalesce(excluded.variant_key, public.checkout_sessions.variant_key),
      stage = 'completed',
      completed_order_id = excluded.completed_order_id,
      last_seen_at = now(),
      completed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists orders_mark_checkout_completed on public.orders;
create trigger orders_mark_checkout_completed
after insert on public.orders
for each row execute function public.orvix_mark_checkout_completed();

create or replace view public.abandoned_checkouts as
select
  session_key,
  visitor_id,
  analytics_session_id,
  product_slug,
  variant_key,
  stage,
  metadata,
  created_at,
  last_seen_at,
  extract(epoch from (now() - last_seen_at))::bigint as inactive_seconds
from public.checkout_sessions
where completed_order_id is null
  and stage <> 'completed'
  and last_seen_at < now() - interval '15 minutes';

alter view public.abandoned_checkouts set (security_invoker = true);
grant select on public.abandoned_checkouts to service_role;

create or replace function public.orvix_take_commerce_snapshot(p_snapshot_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  select jsonb_build_object(
    'capturedAt', now(),
    'snapshotDate', p_snapshot_date,
    'settings', coalesce((select to_jsonb(s) from public.commerce_settings s where id = 'default'), '{}'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) order by p.display_order, p.created_at) from public.products p), '[]'::jsonb),
    'variants', coalesce((select jsonb_agg(to_jsonb(v) order by v.product_id, v.display_order, v.created_at) from public.product_variants v), '[]'::jsonb),
    'activeDiscounts', coalesce((select jsonb_agg(to_jsonb(d) - 'id' order by d.created_at) from public.delivery_discount_codes d where d.active), '[]'::jsonb),
    'orderMetrics', jsonb_build_object(
      'orders', (select count(*) from public.orders where created_at::date = p_snapshot_date),
      'delivered', (select count(*) from public.orders where status = 'delivered' and coalesce(delivered_at, created_at)::date = p_snapshot_date),
      'cancelled', (select count(*) from public.orders where status = 'cancelled' and created_at::date = p_snapshot_date),
      'sales', coalesce((select sum(total_price) from public.orders where status <> 'cancelled' and created_at::date = p_snapshot_date), 0),
      'deliveredRevenue', coalesce((select sum(total_price) from public.orders where status = 'delivered' and coalesce(delivered_at, created_at)::date = p_snapshot_date), 0)
    ),
    'queue', jsonb_build_object(
      'pending', (select count(*) from public.commerce_jobs where status = 'pending'),
      'processing', (select count(*) from public.commerce_jobs where status = 'processing'),
      'dead', (select count(*) from public.commerce_jobs where status = 'dead')
    )
  ) into v_payload;

  insert into public.commerce_snapshots(snapshot_date, payload, created_at)
  values (p_snapshot_date, v_payload, now())
  on conflict (snapshot_date) do update set
    payload = excluded.payload,
    created_at = now();

  return v_payload;
end;
$$;

-- Extend housekeeping with bounded retention for high-churn operational tables.
create or replace function public.orvix_commerce_housekeeping()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.commerce_rate_limits
  where bucket_start < now() - interval '1 day';

  delete from public.checkout_sessions
  where completed_at is not null
    and completed_at < now() - interval '90 days';

  delete from public.checkout_sessions
  where completed_at is null
    and last_seen_at < now() - interval '30 days';

  update public.commerce_jobs
  set status = case when attempts >= max_attempts then 'dead' else 'pending' end,
      locked_at = null,
      run_after = case when attempts >= max_attempts then run_after else now() + interval '2 minutes' end,
      last_error = coalesce(last_error, 'Recovered after a stuck processing lock.'),
      updated_at = now()
  where status = 'processing'
    and locked_at < now() - interval '15 minutes';
end;
$$;

-- Schedule a daily operational configuration/catalog snapshot.
do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_job_id in
      select jobid from cron.job where jobname = 'orvix-commerce-snapshot'
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    perform cron.schedule(
      'orvix-commerce-snapshot',
      '15 2 * * *',
      $job$select public.orvix_take_commerce_snapshot(current_date);$job$
    );
  end if;
end;
$$;

revoke execute on function public.orvix_mark_checkout_completed() from public, anon, authenticated;
revoke execute on function public.orvix_take_commerce_snapshot(date) from public, anon, authenticated;
grant execute on function public.orvix_mark_checkout_completed() to service_role;
grant execute on function public.orvix_take_commerce_snapshot(date) to service_role;
