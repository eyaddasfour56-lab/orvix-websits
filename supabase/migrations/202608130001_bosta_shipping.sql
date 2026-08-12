-- ORVIX x Bosta shipping integration
-- Run this once in the Supabase SQL Editor before deploying the feature.

alter table public.orders
  add column if not exists bosta_city_id text,
  add column if not exists bosta_city_name text,
  add column if not exists bosta_city_sector integer,
  add column if not exists bosta_zone_id text,
  add column if not exists bosta_zone_name text,
  add column if not exists bosta_district_id text,
  add column if not exists bosta_district_name text,
  add column if not exists bosta_delivery_id text,
  add column if not exists bosta_tracking_number text,
  add column if not exists bosta_state_code integer,
  add column if not exists bosta_state_name text,
  add column if not exists bosta_submitted_at timestamptz,
  add column if not exists bosta_status_updated_at timestamptz,
  add column if not exists bosta_batch_id uuid,
  add column if not exists bosta_pickup_id text,
  add column if not exists bosta_pickup_date date,
  add column if not exists bosta_pickup_location_id text,
  add column if not exists bosta_last_error text;

create unique index if not exists orders_bosta_tracking_number_unique
  on public.orders (bosta_tracking_number)
  where bosta_tracking_number is not null;

create index if not exists orders_bosta_batch_id_index
  on public.orders (bosta_batch_id)
  where bosta_batch_id is not null;

create index if not exists orders_bosta_ready_index
  on public.orders (status, created_at)
  where status = 'confirmed'
    and bosta_tracking_number is null
    and bosta_batch_id is null;
