-- ORVIX Commerce Reliability Platform
-- Atomic inventory reservation, duplicate protection, variants, scheduled pricing,
-- queue/outbox processing, rate limiting, system health and performance indexes.

alter table public.orders
  add column if not exists idempotency_key text,
  add column if not exists checkout_session_key text,
  add column if not exists variant_key text,
  add column if not exists variant_label text,
  add column if not exists risk_score integer not null default 0,
  add column if not exists risk_flags text[] not null default '{}'::text[],
  add column if not exists source_hash text,
  add column if not exists user_agent_hash text,
  add column if not exists processing_status text not null default 'accepted',
  add column if not exists internal_notes text;

alter table public.orders drop constraint if exists orders_risk_score_check;
alter table public.orders add constraint orders_risk_score_check check (risk_score >= 0 and risk_score <= 100);
alter table public.orders drop constraint if exists orders_processing_status_check;
alter table public.orders add constraint orders_processing_status_check check (processing_status in ('accepted','queued','needs_attention'));

create unique index if not exists orders_idempotency_key_uidx
  on public.orders(idempotency_key)
  where idempotency_key is not null;
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_created_at_idx on public.orders(status, created_at desc);
create index if not exists orders_phone_created_at_idx on public.orders(phone, created_at desc);
create index if not exists orders_product_created_at_idx on public.orders(product_slug, created_at desc);
create index if not exists orders_source_hash_created_at_idx on public.orders(source_hash, created_at desc) where source_hash is not null;
create index if not exists orders_bosta_error_idx on public.orders(created_at desc) where bosta_last_error is not null;

alter table public.products
  add column if not exists compare_at_price numeric,
  add column if not exists max_order_quantity integer not null default 10,
  add column if not exists available_from timestamptz,
  add column if not exists available_until timestamptz;

alter table public.products drop constraint if exists products_compare_at_price_check;
alter table public.products add constraint products_compare_at_price_check check (compare_at_price is null or compare_at_price >= 0);
alter table public.products drop constraint if exists products_max_order_quantity_check;
alter table public.products add constraint products_max_order_quantity_check check (max_order_quantity >= 1 and max_order_quantity <= 100);
alter table public.products drop constraint if exists products_availability_window_check;
alter table public.products add constraint products_availability_window_check check (available_until is null or available_from is null or available_until > available_from);

create table if not exists public.commerce_settings (
  id text primary key default 'default' check (id = 'default'),
  checkout_enabled boolean not null default true,
  max_quantity_per_order integer not null default 10 check (max_quantity_per_order >= 1 and max_quantity_per_order <= 100),
  rate_limit_per_minute integer not null default 20 check (rate_limit_per_minute >= 1 and rate_limit_per_minute <= 1000),
  duplicate_window_seconds integer not null default 600 check (duplicate_window_seconds >= 60 and duplicate_window_seconds <= 86400),
  queue_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.commerce_settings(id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_key text not null,
  label text not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_limit integer not null default 2 check (low_stock_limit >= 0),
  allow_purchase boolean not null default true,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, variant_key)
);

create index if not exists product_variants_product_idx
  on public.product_variants(product_id, active, display_order);

create table if not exists public.product_price_schedules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric not null check (price >= 0),
  compare_at_price numeric check (compare_at_price is null or compare_at_price >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index if not exists product_price_schedules_active_idx
  on public.product_price_schedules(product_id, active, starts_at desc, priority desc);

create table if not exists public.commerce_rate_limits (
  bucket_key text not null,
  bucket_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key(bucket_key, bucket_start)
);
create index if not exists commerce_rate_limits_time_idx on public.commerce_rate_limits(bucket_start);

create table if not exists public.commerce_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  status text not null default 'pending' check (status in ('pending','processing','completed','dead')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts >= 1),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commerce_jobs_claim_idx on public.commerce_jobs(status, run_after, created_at);
create index if not exists commerce_jobs_dead_idx on public.commerce_jobs(created_at desc) where status = 'dead';

alter table public.admin_notifications drop constraint if exists admin_notifications_kind_check;
alter table public.admin_notifications add constraint admin_notifications_kind_check
  check (kind in ('order','chat','human','inventory','system'));

alter table public.commerce_settings enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_price_schedules enable row level security;
alter table public.commerce_rate_limits enable row level security;
alter table public.commerce_jobs enable row level security;

grant select, insert, update, delete on public.commerce_settings to service_role;
grant select, insert, update, delete on public.product_variants to service_role;
grant select, insert, update, delete on public.product_price_schedules to service_role;
grant select, insert, update, delete on public.commerce_rate_limits to service_role;
grant select, insert, update, delete on public.commerce_jobs to service_role;

create or replace function public.orvix_recompute_product_stock_from_variants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_total integer;
begin
  v_product_id := coalesce(new.product_id, old.product_id);

  select coalesce(sum(case when active then stock_quantity else 0 end), 0)::integer
  into v_total
  from public.product_variants
  where product_id = v_product_id;

  update public.products
  set stock_quantity = v_total,
      updated_at = now()
  where id = v_product_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists product_variants_recompute_stock on public.product_variants;
create trigger product_variants_recompute_stock
after insert or update of stock_quantity, active, product_id or delete
on public.product_variants
for each row execute function public.orvix_recompute_product_stock_from_variants();

create or replace function public.orvix_product_low_stock_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_severity text;
begin
  v_key := 'low_stock:' || new.slug;

  if new.status = 'available'
     and coalesce(new.allow_purchase, false)
     and new.stock_quantity <= new.low_stock_limit then
    v_severity := case when new.stock_quantity <= 0 then 'critical' else 'warning' end;

    insert into public.admin_notifications(kind, title, body, target_url, event_key, severity, created_at, read_at)
    values (
      'inventory',
      case when new.stock_quantity <= 0 then 'Out of stock' else 'Low stock' end,
      new.name || ' has ' || new.stock_quantity::text || ' unit(s) remaining.',
      '/admin/products',
      v_key,
      v_severity,
      now(),
      null
    )
    on conflict (event_key) do update set
      title = excluded.title,
      body = excluded.body,
      severity = excluded.severity,
      created_at = now(),
      read_at = null;
  else
    delete from public.admin_notifications where event_key = v_key;
  end if;

  return new;
end;
$$;

drop trigger if exists products_low_stock_alert on public.products;
create trigger products_low_stock_alert
after insert or update of stock_quantity, low_stock_limit, status, allow_purchase
on public.products
for each row execute function public.orvix_product_low_stock_alert();

create or replace view public.store_products as
select
  p.id,
  p.name,
  p.slug,
  p.short_description,
  p.description,
  p.price as base_price,
  coalesce(active_sale.price, p.price::numeric) as effective_price,
  coalesce(active_sale.compare_at_price, p.compare_at_price) as effective_compare_at_price,
  (active_sale.id is not null) as sale_active,
  active_sale.starts_at as sale_starts_at,
  active_sale.ends_at as sale_ends_at,
  p.image,
  p.images,
  p.status,
  p.stock_quantity,
  p.low_stock_limit,
  p.show_on_homepage,
  p.allow_wishlist,
  (
    p.allow_purchase
    and (p.available_from is null or p.available_from <= now())
    and (p.available_until is null or p.available_until > now())
  ) as allow_purchase,
  p.display_order,
  p.max_order_quantity,
  p.available_from,
  p.available_until,
  p.created_at,
  p.updated_at
from public.products p
left join lateral (
  select s.*
  from public.product_price_schedules s
  where s.product_id = p.id
    and s.active
    and s.starts_at <= now()
    and (s.ends_at is null or s.ends_at > now())
  order by s.priority desc, s.starts_at desc, s.created_at desc
  limit 1
) active_sale on true;

grant select on public.store_products to service_role;

create or replace function public.orvix_take_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window integer := greatest(coalesce(p_window_seconds, 60), 1);
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
  v_bucket timestamptz;
  v_hits integer;
begin
  v_bucket := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / v_window) * v_window
  );

  insert into public.commerce_rate_limits(bucket_key, bucket_start, hits)
  values (p_key, v_bucket, 1)
  on conflict (bucket_key, bucket_start)
  do update set hits = public.commerce_rate_limits.hits + 1
  returning hits into v_hits;

  return v_hits <= v_limit;
end;
$$;

grant execute on function public.orvix_take_rate_limit(text, integer, integer) to service_role;

create or replace function public.orvix_claim_jobs(p_limit integer default 10)
returns setof public.commerce_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id
    from public.commerce_jobs
    where status = 'pending'
      and run_after <= now()
    order by run_after, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  ), claimed as (
    update public.commerce_jobs j
    set status = 'processing',
        attempts = j.attempts + 1,
        locked_at = now(),
        updated_at = now()
    from picked p
    where j.id = p.id
    returning j.*
  )
  select * from claimed;
end;
$$;

grant execute on function public.orvix_claim_jobs(integer) to service_role;

create or replace function public.orvix_commerce_housekeeping()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.commerce_rate_limits
  where bucket_start < now() - interval '1 day';

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

grant execute on function public.orvix_commerce_housekeeping() to service_role;

create or replace function public.orvix_health_snapshot()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'databaseTime', now(),
    'checkoutEnabled', coalesce((select checkout_enabled from public.commerce_settings where id = 'default'), true),
    'queueEnabled', coalesce((select queue_enabled from public.commerce_settings where id = 'default'), true),
    'ordersLast15m', (select count(*) from public.orders where created_at >= now() - interval '15 minutes'),
    'ordersToday', (select count(*) from public.orders where created_at >= date_trunc('day', now())),
    'lowStockProducts', (select count(*) from public.products where status = 'available' and allow_purchase and stock_quantity <= low_stock_limit),
    'outOfStockProducts', (select count(*) from public.products where status = 'available' and allow_purchase and stock_quantity <= 0),
    'pendingJobs', (select count(*) from public.commerce_jobs where status = 'pending'),
    'processingJobs', (select count(*) from public.commerce_jobs where status = 'processing'),
    'deadJobs', (select count(*) from public.commerce_jobs where status = 'dead'),
    'riskyOrders24h', (select count(*) from public.orders where created_at >= now() - interval '24 hours' and risk_score >= 50),
    'bostaErrors24h', (select count(*) from public.orders where created_at >= now() - interval '24 hours' and bosta_last_error is not null)
  );
$$;

grant execute on function public.orvix_health_snapshot() to service_role;

create or replace function public.orvix_create_order_v3(
  p_idempotency_key text,
  p_checkout_session_key text,
  p_product_slug text,
  p_variant_key text,
  p_colour text,
  p_quantity integer,
  p_customer_name text,
  p_phone text,
  p_customer_email text,
  p_governorate text,
  p_bosta_city_id text,
  p_bosta_city_name text,
  p_bosta_city_sector integer,
  p_bosta_zone_id text,
  p_bosta_zone_name text,
  p_bosta_district_id text,
  p_bosta_district_name text,
  p_address text,
  p_notes text,
  p_delivery_fee numeric,
  p_discount_code text,
  p_source_hash text,
  p_user_agent_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.commerce_settings%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_schedule public.product_price_schedules%rowtype;
  v_discount public.delivery_discount_codes%rowtype;
  v_existing public.orders%rowtype;
  v_has_variants boolean := false;
  v_variant_found boolean := false;
  v_discount_found boolean := false;
  v_price numeric := 0;
  v_compare_at numeric := null;
  v_available_stock integer := 0;
  v_remaining_stock integer := 0;
  v_max_qty integer := 10;
  v_products_total numeric := 0;
  v_delivery_fee numeric := greatest(coalesce(p_delivery_fee, 0), 0);
  v_product_discount numeric := 0;
  v_delivery_discount numeric := 0;
  v_discount_amount numeric := 0;
  v_final_products_total numeric := 0;
  v_final_total numeric := 0;
  v_discount_code text := nullif(upper(trim(coalesce(p_discount_code, ''))), '');
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_shipping_number text;
  v_risk_score integer := 0;
  v_risk_flags text[] := '{}'::text[];
  v_recent_phone integer := 0;
  v_recent_source integer := 0;
  v_now timestamptz := clock_timestamp();
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key));

  select * into v_existing
  from public.orders
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate', true,
      'orderId', v_existing.id,
      'orderNumber', v_existing.order_number,
      'shippingNumber', v_existing.shipping_number,
      'productsTotal', v_existing.products_total,
      'deliveryFee', v_existing.delivery_fee,
      'discountAmount', v_existing.discount_amount,
      'totalPrice', v_existing.total_price,
      'remainingStock', null
    );
  end if;

  select * into v_settings
  from public.commerce_settings
  where id = 'default'
  for share;

  if not found then
    insert into public.commerce_settings(id) values ('default') returning * into v_settings;
  end if;

  if not v_settings.checkout_enabled then
    raise exception 'CHECKOUT_DISABLED';
  end if;

  select * into v_product
  from public.products
  where slug = p_product_slug
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if v_product.status <> 'available'
     or not coalesce(v_product.allow_purchase, false)
     or (v_product.available_from is not null and v_product.available_from > v_now)
     or (v_product.available_until is not null and v_product.available_until <= v_now) then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  select * into v_schedule
  from public.product_price_schedules s
  where s.product_id = v_product.id
    and s.active
    and s.starts_at <= v_now
    and (s.ends_at is null or s.ends_at > v_now)
  order by s.priority desc, s.starts_at desc, s.created_at desc
  limit 1;

  if found then
    v_price := v_schedule.price;
    v_compare_at := coalesce(v_schedule.compare_at_price, v_product.compare_at_price);
  else
    v_price := v_product.price;
    v_compare_at := v_product.compare_at_price;
  end if;

  if v_price <= 0 then
    raise exception 'INVALID_PRODUCT_PRICE';
  end if;

  select exists(
    select 1 from public.product_variants where product_id = v_product.id
  ) into v_has_variants;

  if v_has_variants then
    select * into v_variant
    from public.product_variants v
    where v.product_id = v_product.id
      and v.active
      and (
        (nullif(trim(coalesce(p_variant_key, '')), '') is not null and lower(v.variant_key) = lower(trim(p_variant_key)))
        or lower(v.label) = lower(trim(coalesce(p_colour, '')))
      )
    order by case when lower(v.variant_key) = lower(trim(coalesce(p_variant_key, ''))) then 0 else 1 end,
             v.display_order,
             v.created_at
    for update
    limit 1;

    v_variant_found := found;

    if not v_variant_found or not v_variant.allow_purchase then
      raise exception 'VARIANT_UNAVAILABLE';
    end if;

    v_available_stock := v_variant.stock_quantity;
  else
    v_available_stock := v_product.stock_quantity;
  end if;

  v_max_qty := least(
    greatest(coalesce(v_settings.max_quantity_per_order, 10), 1),
    greatest(coalesce(v_product.max_order_quantity, 10), 1)
  );

  if p_quantity is null or p_quantity < 1 or p_quantity > v_max_qty then
    raise exception 'INVALID_QUANTITY';
  end if;

  if p_quantity > v_available_stock then
    raise exception 'INSUFFICIENT_STOCK:%', v_available_stock;
  end if;

  v_products_total := round(v_price * p_quantity, 2);
  v_final_products_total := v_products_total;

  if v_discount_code is not null then
    select * into v_discount
    from public.delivery_discount_codes
    where upper(code) = v_discount_code
    limit 1
    for update;

    v_discount_found := found;

    if not v_discount_found
       or not v_discount.active
       or (v_discount.starts_at is not null and v_discount.starts_at > v_now)
       or (v_discount.expires_at is not null and v_discount.expires_at <= v_now)
       or (v_discount.usage_limit is not null and coalesce(v_discount.times_used, 0) >= v_discount.usage_limit)
       or v_products_total < coalesce(v_discount.minimum_order_value, 0) then
      raise exception 'INVALID_DISCOUNT';
    end if;

    if v_discount.discount_type = 'free_delivery' then
      v_delivery_discount := v_delivery_fee;
    elsif v_discount.discount_type = 'fixed_amount' then
      v_product_discount := least(greatest(coalesce(v_discount.discount_value, 0), 0), v_products_total);
    elsif v_discount.discount_type = 'percentage' then
      v_product_discount := least(
        round(v_products_total * least(greatest(coalesce(v_discount.discount_value, 0), 0), 100) / 100, 2),
        v_products_total
      );
    else
      raise exception 'INVALID_DISCOUNT';
    end if;

    if v_discount.maximum_discount is not null and v_product_discount > v_discount.maximum_discount then
      v_product_discount := v_discount.maximum_discount;
    end if;
  end if;

  v_final_products_total := greatest(v_products_total - v_product_discount, 0);
  v_delivery_fee := greatest(v_delivery_fee - v_delivery_discount, 0);
  v_discount_amount := v_product_discount + v_delivery_discount;
  v_final_total := v_final_products_total + v_delivery_fee;

  select count(*)::integer into v_recent_phone
  from public.orders
  where phone = p_phone
    and status <> 'cancelled'
    and created_at >= v_now - interval '10 minutes';

  if nullif(trim(coalesce(p_source_hash, '')), '') is not null then
    select count(*)::integer into v_recent_source
    from public.orders
    where source_hash = p_source_hash
      and status <> 'cancelled'
      and created_at >= v_now - interval '10 minutes';
  end if;

  if v_recent_phone >= 2 then
    v_risk_score := least(v_risk_score + 45, 100);
    v_risk_flags := array_append(v_risk_flags, 'repeated_phone_orders');
  end if;

  if v_recent_source >= 3 then
    v_risk_score := least(v_risk_score + 45, 100);
    v_risk_flags := array_append(v_risk_flags, 'repeated_device_orders');
  end if;

  if p_quantity >= v_max_qty then
    v_risk_score := least(v_risk_score + 10, 100);
    v_risk_flags := array_append(v_risk_flags, 'maximum_quantity');
  end if;

  if v_variant_found then
    update public.product_variants
    set stock_quantity = stock_quantity - p_quantity,
        updated_at = v_now
    where id = v_variant.id
      and stock_quantity >= p_quantity
    returning stock_quantity into v_remaining_stock;

    if not found then
      raise exception 'INSUFFICIENT_STOCK:0';
    end if;
  else
    update public.products
    set stock_quantity = stock_quantity - p_quantity,
        updated_at = v_now
    where id = v_product.id
      and stock_quantity >= p_quantity
    returning stock_quantity into v_remaining_stock;

    if not found then
      raise exception 'INSUFFICIENT_STOCK:0';
    end if;
  end if;

  v_order_number := 'ORVIX-' || (floor(extract(epoch from v_now) * 1000))::bigint::text || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_shipping_number := 'SHIP-' || (floor(extract(epoch from v_now) * 1000))::bigint::text || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders(
    id,
    order_number,
    shipping_number,
    shipping_status,
    label_created_at,
    payment_method,
    product_name,
    product_slug,
    customer_name,
    phone,
    customer_email,
    governorate,
    bosta_city_id,
    bosta_city_name,
    bosta_city_sector,
    bosta_zone_id,
    bosta_zone_name,
    bosta_district_id,
    bosta_district_name,
    address,
    notes,
    colour,
    quantity,
    product_price,
    products_total,
    delivery_fee,
    discount_code,
    discount_amount,
    total_price,
    status,
    unit_cost_at_sale,
    inventory_reserved_qty,
    inventory_reserved_at,
    idempotency_key,
    checkout_session_key,
    variant_key,
    variant_label,
    risk_score,
    risk_flags,
    source_hash,
    user_agent_hash,
    processing_status,
    created_at,
    updated_at
  ) values (
    v_order_id,
    v_order_number,
    v_shipping_number,
    'ready_to_print',
    v_now,
    'instapay_on_delivery',
    v_product.name,
    v_product.slug,
    p_customer_name,
    p_phone,
    nullif(trim(coalesce(p_customer_email, '')), ''),
    p_governorate,
    p_bosta_city_id,
    p_bosta_city_name,
    p_bosta_city_sector,
    p_bosta_zone_id,
    p_bosta_zone_name,
    p_bosta_district_id,
    p_bosta_district_name,
    p_address,
    coalesce(nullif(trim(coalesce(p_notes, '')), ''), 'No notes'),
    p_colour,
    p_quantity,
    v_price,
    v_final_products_total,
    v_delivery_fee,
    v_discount_code,
    v_discount_amount,
    v_final_total,
    'new',
    coalesce(v_product.unit_cost, 0),
    p_quantity,
    v_now,
    p_idempotency_key,
    nullif(trim(coalesce(p_checkout_session_key, '')), ''),
    case when v_variant_found then v_variant.variant_key else null end,
    case when v_variant_found then v_variant.label else null end,
    v_risk_score,
    v_risk_flags,
    nullif(trim(coalesce(p_source_hash, '')), ''),
    nullif(trim(coalesce(p_user_agent_hash, '')), ''),
    case when v_settings.queue_enabled then 'queued' else 'accepted' end,
    v_now,
    v_now
  );

  if v_discount_found then
    update public.delivery_discount_codes
    set times_used = coalesce(times_used, 0) + 1,
        updated_at = v_now
    where id = v_discount.id;
  end if;

  if v_settings.queue_enabled then
    insert into public.commerce_jobs(kind, payload, dedupe_key)
    values (
      'send_order_admin_email',
      jsonb_build_object('orderId', v_order_id, 'orderNumber', v_order_number),
      'order:' || v_order_id::text || ':admin-email'
    )
    on conflict (dedupe_key) do nothing;

    if nullif(trim(coalesce(p_customer_email, '')), '') is not null then
      insert into public.commerce_jobs(kind, payload, dedupe_key)
      values (
        'send_order_customer_email',
        jsonb_build_object('orderId', v_order_id, 'orderNumber', v_order_number),
        'order:' || v_order_id::text || ':customer-email'
      )
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'shippingNumber', v_shipping_number,
    'productName', v_product.name,
    'productSlug', v_product.slug,
    'productPrice', v_price,
    'compareAtPrice', v_compare_at,
    'productsTotal', v_final_products_total,
    'deliveryFee', v_delivery_fee,
    'discountAmount', v_discount_amount,
    'totalPrice', v_final_total,
    'remainingStock', v_remaining_stock,
    'riskScore', v_risk_score,
    'variantKey', case when v_variant_found then v_variant.variant_key else null end,
    'variantLabel', case when v_variant_found then v_variant.label else null end
  );
end;
$$;

grant execute on function public.orvix_create_order_v3(
  text,text,text,text,text,integer,text,text,text,text,text,text,integer,text,text,text,text,text,text,numeric,text,text,text
) to service_role;

-- New orders reserve stock at creation. Keep the legacy status trigger compatible
-- so old unreserved orders still reserve when they are confirmed.
create or replace function public.orvix_sync_inventory_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  qty integer;
  v_variant_id uuid;
begin
  qty := greatest(coalesce(new.quantity, 0), 0);

  if new.status in ('confirmed','shipped','out_for_delivery','delivered')
     and coalesce(old.inventory_reserved_qty, 0) = 0
     and coalesce(new.inventory_reserved_qty, 0) = 0
     and qty > 0 then

    if new.variant_key is not null then
      select id into v_variant_id
      from public.product_variants
      where product_id = (select id from public.products where slug = new.product_slug)
        and variant_key = new.variant_key
      for update;
    end if;

    if v_variant_id is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - qty,
          updated_at = now()
      where id = v_variant_id and stock_quantity >= qty;
    else
      update public.products
      set stock_quantity = stock_quantity - qty,
          updated_at = now()
      where slug = new.product_slug and stock_quantity >= qty;
    end if;

    if not found then
      raise exception 'INSUFFICIENT_STOCK_FOR_CONFIRMATION';
    end if;

    new.inventory_reserved_qty := qty;
    new.inventory_reserved_at := now();
  end if;

  if new.status = 'cancelled'
     and old.status <> 'cancelled'
     and coalesce(old.inventory_reserved_qty, 0) > 0 then

    if old.variant_key is not null then
      select id into v_variant_id
      from public.product_variants
      where product_id = (select id from public.products where slug = old.product_slug)
        and variant_key = old.variant_key
      for update;
    end if;

    if v_variant_id is not null then
      update public.product_variants
      set stock_quantity = stock_quantity + old.inventory_reserved_qty,
          updated_at = now()
      where id = v_variant_id;
    else
      update public.products
      set stock_quantity = stock_quantity + old.inventory_reserved_qty,
          updated_at = now()
      where slug = old.product_slug;
    end if;

    new.inventory_reserved_qty := 0;
    new.inventory_reserved_at := null;
  end if;

  if new.status = 'delivered' and old.status <> 'delivered' then
    new.delivered_at := coalesce(new.delivered_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists orders_inventory_autopilot on public.orders;
create trigger orders_inventory_autopilot
before update of status on public.orders
for each row execute function public.orvix_sync_inventory_on_order_status();
