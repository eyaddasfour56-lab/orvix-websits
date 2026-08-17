alter table public.orders
  add column if not exists inventory_reserved_qty integer not null default 0,
  add column if not exists inventory_reserved_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists return_status text not null default 'none',
  add column if not exists refunded_amount numeric not null default 0,
  add column if not exists returned_at timestamptz,
  add column if not exists last_workflow_at timestamptz;

alter table public.orders drop constraint if exists orders_inventory_reserved_qty_check;
alter table public.orders add constraint orders_inventory_reserved_qty_check check (inventory_reserved_qty >= 0);
alter table public.orders drop constraint if exists orders_refunded_amount_check;
alter table public.orders add constraint orders_refunded_amount_check check (refunded_amount >= 0);
alter table public.orders drop constraint if exists orders_return_status_check;
alter table public.orders add constraint orders_return_status_check check (return_status in ('none','requested','approved','completed','rejected'));

alter table public.product_inventory add column if not exists reorder_target integer not null default 10;
alter table public.product_inventory drop constraint if exists product_inventory_reorder_target_check;
alter table public.product_inventory add constraint product_inventory_reorder_target_check check (reorder_target >= 0);

alter table public.admin_notifications
  add column if not exists read_at timestamptz,
  add column if not exists severity text not null default 'info';
alter table public.admin_notifications drop constraint if exists admin_notifications_severity_check;
alter table public.admin_notifications add constraint admin_notifications_severity_check check (severity in ('info','warning','critical','success'));

create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_number text not null,
  return_type text not null default 'return_refund' check (return_type in ('return','refund','return_refund')),
  reason text not null,
  refund_amount numeric not null default 0 check (refund_amount >= 0),
  restock boolean not null default false,
  status text not null default 'completed' check (status in ('requested','approved','completed','rejected')),
  created_by text not null default 'owner',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists order_returns_order_id_idx on public.order_returns(order_id);
create index if not exists order_returns_created_at_idx on public.order_returns(created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'Admin',
  role text not null default 'owner',
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log(entity_type, entity_id);

create table if not exists public.admin_access_profiles (
  role text primary key,
  label text not null,
  permissions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.admin_access_profiles(role,label,permissions) values
  ('owner','Owner','["dashboard","orders","inventory","customers","returns","cashflow","analytics","bosta","audit","roles","assistant"]'::jsonb),
  ('manager','Manager','["dashboard","orders","inventory","customers","returns","cashflow","analytics","bosta","audit","assistant"]'::jsonb),
  ('orders','Orders','["dashboard","orders","inventory","customers","returns","bosta"]'::jsonb)
on conflict (role) do update set label=excluded.label, permissions=excluded.permissions, updated_at=now();

alter table public.order_returns enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_access_profiles enable row level security;

grant select, insert, update, delete on public.order_returns to service_role;
grant select, insert on public.admin_audit_log to service_role;
grant select, insert, update, delete on public.admin_access_profiles to service_role;

create or replace function public.orvix_sync_inventory_on_order_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  qty integer;
begin
  qty := greatest(coalesce(new.quantity, 0), 0);

  if new.status in ('confirmed','shipped','out_for_delivery','delivered')
     and coalesce(old.inventory_reserved_qty, 0) = 0
     and coalesce(new.inventory_reserved_qty, 0) = 0
     and qty > 0 then
    update public.product_inventory
      set stock_quantity = greatest(stock_quantity - qty, 0),
          is_available = greatest(stock_quantity - qty, 0) > 0,
          updated_at = now()
      where product_slug = new.product_slug;

    update public.products
      set stock_quantity = greatest(stock_quantity - qty, 0),
          updated_at = now()
      where slug = new.product_slug;

    new.inventory_reserved_qty := qty;
    new.inventory_reserved_at := now();
  end if;

  if new.status = 'cancelled'
     and old.status <> 'cancelled'
     and coalesce(old.inventory_reserved_qty, 0) > 0 then
    update public.product_inventory
      set stock_quantity = stock_quantity + old.inventory_reserved_qty,
          is_available = true,
          updated_at = now()
      where product_slug = new.product_slug;

    update public.products
      set stock_quantity = stock_quantity + old.inventory_reserved_qty,
          updated_at = now()
      where slug = new.product_slug;

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
