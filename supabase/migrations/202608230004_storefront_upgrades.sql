-- ORVIX storefront upgrades: brand control, customer self-service,
-- verified review media, customer notifications and operational snapshots.

create table if not exists public.site_settings (
  id text primary key default 'default' check (id = 'default'),
  brand_name text not null default 'ORVIX' check (char_length(brand_name) between 2 and 40),
  short_name text not null default 'ORVIX' check (char_length(short_name) between 2 and 16),
  tagline_en text not null default 'Fitness technology made simple.',
  tagline_ar text not null default 'تقنيات لياقة أكثر بساطة.',
  logo_url text not null default '/logo.jpeg',
  favicon_url text not null default '/icon.svg',
  primary_color text not null default '#2563eb' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text not null default '#60a5fa' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  instagram_url text not null default 'https://www.instagram.com/orvix_tech/',
  instagram_handle text not null default '@orvix_tech',
  support_email text,
  support_phone text,
  site_url text not null default 'https://orvix-websits.vercel.app',
  seo_title text not null default 'ORVIX | Smart Fitness Technology in Egypt',
  seo_description text not null default 'Shop ORVIX smart fitness technology in Egypt with secure checkout, live order tracking and reliable customer service.',
  seo_keywords text[] not null default array['smart fitness','fitness tracker','Egypt','ORVIX']::text[],
  promo_enabled boolean not null default true,
  promo_code text not null default 'ORVIX15',
  promo_product_slug text not null default 'google-fitbit-air',
  promo_label_en text not null default 'Limited offer',
  promo_label_ar text not null default 'عرض لفترة محدودة',
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_settings(id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home' check (char_length(label) between 1 and 40),
  full_name text not null check (char_length(full_name) between 2 and 160),
  phone text not null check (char_length(phone) between 8 and 40),
  governorate text not null check (char_length(governorate) between 2 and 120),
  area text,
  address text not null check (char_length(address) between 5 and 500),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_updated_idx
  on public.customer_addresses(customer_user_id, updated_at desc);
create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(customer_user_id)
  where is_default;

create table if not exists public.customer_wishlist (
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_user_id, product_id)
);

create index if not exists customer_wishlist_user_created_idx
  on public.customer_wishlist(customer_user_id, created_at desc);

alter table public.order_returns
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists order_returns_customer_created_idx
  on public.order_returns(customer_user_id, created_at desc)
  where customer_user_id is not null;
create unique index if not exists order_returns_one_open_customer_request_idx
  on public.order_returns(customer_user_id, order_id)
  where customer_user_id is not null and status = 'requested';

alter table public.reviews
  add column if not exists photo_urls text[] not null default '{}'::text[];

create table if not exists public.admin_login_challenges (
  id uuid primary key,
  role text not null check (role in ('owner','manager','orders')),
  otp_hash text not null,
  ip_hash text,
  attempts integer not null default 0 check (attempts between 0 and 10),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_challenges_expiry_idx
  on public.admin_login_challenges(expires_at)
  where used_at is null;

create table if not exists public.checkout_phone_challenges (
  id uuid primary key,
  phone_normalized text not null,
  otp_hash text not null,
  ip_hash text,
  attempts integer not null default 0 check (attempts between 0 and 6),
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists checkout_phone_challenges_expiry_idx
  on public.checkout_phone_challenges(expires_at)
  where verified_at is null;

alter table public.site_settings enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_wishlist enable row level security;
alter table public.order_returns enable row level security;
alter table public.reviews enable row level security;
alter table public.admin_login_challenges enable row level security;
alter table public.checkout_phone_challenges enable row level security;

revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.admin_login_challenges from anon, authenticated;
revoke all on table public.checkout_phone_challenges from anon, authenticated;
grant select, insert, update, delete on public.site_settings to service_role;
grant select, insert, update, delete on public.admin_login_challenges to service_role;
grant select, insert, update, delete on public.checkout_phone_challenges to service_role;

grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, delete on public.customer_wishlist to authenticated;
grant select on public.order_returns to authenticated;

drop policy if exists customer_addresses_manage_own on public.customer_addresses;
create policy customer_addresses_manage_own
on public.customer_addresses
for all
to authenticated
using ((select auth.uid()) = customer_user_id)
with check ((select auth.uid()) = customer_user_id);

drop policy if exists customer_wishlist_manage_own on public.customer_wishlist;
create policy customer_wishlist_manage_own
on public.customer_wishlist
for all
to authenticated
using ((select auth.uid()) = customer_user_id)
with check ((select auth.uid()) = customer_user_id);

drop policy if exists order_returns_select_own_account on public.order_returns;
create policy order_returns_select_own_account
on public.order_returns
for select
to authenticated
using ((select auth.uid()) = customer_user_id);

create or replace function private.orvix_keep_one_default_address()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.is_default then
    update public.customer_addresses
    set is_default = false,
        updated_at = now()
    where customer_user_id = new.customer_user_id
      and id <> new.id
      and is_default;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_addresses_keep_one_default on public.customer_addresses;
create trigger customer_addresses_keep_one_default
before insert or update of is_default
on public.customer_addresses
for each row execute function private.orvix_keep_one_default_address();

-- Public review images are uploaded only by the server after a delivered-order check.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-media',
  'review-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.orvix_queue_customer_order_updates()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_email text := nullif(trim(coalesce(new.customer_email, new.email, '')), '');
  v_phone text := nullif(trim(coalesce(new.phone, '')), '');
begin
  if new.status is distinct from old.status then
    if v_email is not null then
      insert into public.commerce_jobs(kind, payload, dedupe_key)
      values (
        'send_order_status_email',
        jsonb_build_object('orderId', new.id, 'orderNumber', new.order_number, 'status', new.status),
        'order:' || new.id::text || ':status:' || new.status || ':email'
      )
      on conflict (dedupe_key) do nothing;
    end if;

    if v_phone is not null then
      insert into public.commerce_jobs(kind, payload, dedupe_key)
      values (
        'send_order_status_sms',
        jsonb_build_object('orderId', new.id, 'orderNumber', new.order_number, 'status', new.status),
        'order:' || new.id::text || ':status:' || new.status || ':sms'
      )
      on conflict (dedupe_key) do nothing;
    end if;

    if new.status = 'delivered' and v_email is not null then
      insert into public.commerce_jobs(kind, payload, dedupe_key, run_after)
      values (
        'send_review_request_email',
        jsonb_build_object('orderId', new.id, 'orderNumber', new.order_number),
        'order:' || new.id::text || ':review-request:email',
        now() + interval '24 hours'
      )
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  if new.journey_status is distinct from old.journey_status
     and new.status not in ('cancelled', 'delivered') then
    if v_email is not null then
      insert into public.commerce_jobs(kind, payload, dedupe_key)
      values (
        'send_order_journey_email',
        jsonb_build_object('orderId', new.id, 'orderNumber', new.order_number, 'journeyStatus', new.journey_status),
        'order:' || new.id::text || ':journey:' || new.journey_status || ':email'
      )
      on conflict (dedupe_key) do nothing;
    end if;

    if v_phone is not null then
      insert into public.commerce_jobs(kind, payload, dedupe_key)
      values (
        'send_order_journey_sms',
        jsonb_build_object('orderId', new.id, 'orderNumber', new.order_number, 'journeyStatus', new.journey_status),
        'order:' || new.id::text || ':journey:' || new.journey_status || ':sms'
      )
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_queue_customer_updates on public.orders;
create trigger orders_queue_customer_updates
after update of status, journey_status
on public.orders
for each row execute function private.orvix_queue_customer_order_updates();

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
    'siteSettings', coalesce((select to_jsonb(s) from public.site_settings s where id = 'default'), '{}'::jsonb),
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
    'customerOperations', jsonb_build_object(
      'accounts', (select count(*) from public.customer_profiles),
      'addresses', (select count(*) from public.customer_addresses),
      'wishlistItems', (select count(*) from public.customer_wishlist),
      'openReturns', (select count(*) from public.order_returns where status = 'requested'),
      'pendingReviews', (select count(*) from public.reviews where status = 'pending')
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

create or replace function public.orvix_commerce_housekeeping()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.commerce_rate_limits where bucket_start < now() - interval '1 day';
  delete from public.checkout_sessions where completed_at is not null and completed_at < now() - interval '90 days';
  delete from public.checkout_sessions where completed_at is null and last_seen_at < now() - interval '30 days';
  delete from public.admin_login_challenges where expires_at < now() - interval '1 day' or used_at < now() - interval '1 day';
  delete from public.checkout_phone_challenges where expires_at < now() - interval '1 day';

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

revoke execute on function private.orvix_keep_one_default_address() from public, anon, authenticated;
revoke execute on function private.orvix_queue_customer_order_updates() from public, anon, authenticated;
revoke execute on function public.orvix_take_commerce_snapshot(date) from public, anon, authenticated;
revoke execute on function public.orvix_commerce_housekeeping() from public, anon, authenticated;
grant execute on function public.orvix_take_commerce_snapshot(date) to service_role;
grant execute on function public.orvix_commerce_housekeeping() to service_role;
