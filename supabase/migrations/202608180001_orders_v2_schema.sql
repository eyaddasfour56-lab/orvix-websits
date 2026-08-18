-- ORVIX Orders V2: pre-orders, multi-item orders, timeline and commerce analytics.

alter table public.products
  add column if not exists preorder_min_days integer not null default 25,
  add column if not exists preorder_max_days integer not null default 45;

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status = any (array['available'::text,'preorder'::text,'coming_soon'::text,'out_of_stock'::text,'hidden'::text]));
alter table public.products drop constraint if exists products_preorder_window_check;
alter table public.products add constraint products_preorder_window_check
  check (preorder_min_days >= 1 and preorder_max_days >= preorder_min_days and preorder_max_days <= 180);

alter table public.orders
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_updated_at timestamptz,
  add column if not exists order_type text not null default 'standard',
  add column if not exists item_count integer not null default 1,
  add column if not exists estimated_delivery_from date,
  add column if not exists estimated_delivery_to date,
  add column if not exists confirmed_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status = any (array['pending'::text,'paid'::text,'partially_refunded'::text,'refunded'::text]));
alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders add constraint orders_order_type_check
  check (order_type = any (array['standard'::text,'preorder'::text,'mixed'::text]));
alter table public.orders drop constraint if exists orders_item_count_check;
alter table public.orders add constraint orders_item_count_check check (item_count >= 1 and item_count <= 50);
alter table public.orders drop constraint if exists orders_estimated_delivery_window_check;
alter table public.orders add constraint orders_estimated_delivery_window_check
  check (estimated_delivery_to is null or estimated_delivery_from is null or estimated_delivery_to >= estimated_delivery_from);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  variant_key text,
  variant_label text,
  colour text not null default 'Standard',
  quantity integer not null,
  unit_price numeric not null,
  unit_cost numeric not null default 0,
  line_total numeric not null,
  reserved_qty integer not null default 0,
  is_preorder boolean not null default false,
  estimated_delivery_from date,
  estimated_delivery_to date,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_check check (quantity >= 1 and quantity <= 100),
  constraint order_items_unit_price_check check (unit_price >= 0),
  constraint order_items_unit_cost_check check (unit_cost >= 0),
  constraint order_items_line_total_check check (line_total >= 0),
  constraint order_items_reserved_qty_check check (reserved_qty >= 0 and reserved_qty <= quantity),
  constraint order_items_eta_check check (estimated_delivery_to is null or estimated_delivery_from is null or estimated_delivery_to >= estimated_delivery_from)
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_product_slug_idx on public.order_items(product_slug);

create table if not exists public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  title text not null,
  details text,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null default 'system',
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_created_idx on public.order_events(order_id, created_at desc);

create table if not exists public.analytics_events (
  id bigserial primary key,
  event_name text not null,
  visitor_id text,
  session_id text,
  path text,
  product_slug text,
  order_id uuid references public.orders(id) on delete set null,
  order_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_created_idx on public.analytics_events(event_name, created_at desc);
create index if not exists analytics_events_product_created_idx on public.analytics_events(product_slug, created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events(session_id, created_at desc);
create index if not exists analytics_events_order_id_idx on public.analytics_events(order_id);

alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.analytics_events enable row level security;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.order_events from anon, authenticated;
revoke all on table public.analytics_events from anon, authenticated;
revoke all on sequence public.order_events_id_seq from anon, authenticated;
revoke all on sequence public.analytics_events_id_seq from anon, authenticated;

drop view if exists public.store_products;
create view public.store_products with (security_invoker = true) as
select p.id,p.name,p.slug,p.short_description,p.description,p.price as base_price,
  coalesce(active_sale.price,p.price::numeric) as effective_price,
  coalesce(active_sale.compare_at_price,p.compare_at_price) as effective_compare_at_price,
  active_sale.id is not null as sale_active,active_sale.starts_at as sale_starts_at,active_sale.ends_at as sale_ends_at,
  p.image,p.images,p.status,p.stock_quantity,p.low_stock_limit,p.show_on_homepage,p.allow_wishlist,
  p.allow_purchase and (p.available_from is null or p.available_from<=now()) and (p.available_until is null or p.available_until>now()) as allow_purchase,
  p.display_order,p.max_order_quantity,p.available_from,p.available_until,p.preorder_min_days,p.preorder_max_days,p.created_at,p.updated_at
from public.products p
left join lateral (
  select s.* from public.product_price_schedules s
  where s.product_id=p.id and s.active and s.starts_at<=now() and (s.ends_at is null or s.ends_at>now())
  order by s.priority desc,s.starts_at desc,s.created_at desc limit 1
) active_sale on true;

create or replace function public.orvix_sync_inventory_on_order_status()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  qty integer;
  v_variant_id uuid;
  v_has_items boolean := false;
  v_item public.order_items%rowtype;
begin
  qty:=greatest(coalesce(new.quantity,0),0);
  select exists(select 1 from public.order_items where order_id=new.id) into v_has_items;

  if new.status in ('confirmed','shipped','out_for_delivery','delivered')
     and old.status not in ('confirmed','shipped','out_for_delivery','delivered') then
    if v_has_items then
      for v_item in
        select * from public.order_items
        where order_id=new.id and not is_preorder and reserved_qty=0
        order by product_slug,coalesce(variant_key,'') for update
      loop
        v_variant_id:=null;
        if v_item.variant_key is not null then
          select id into v_variant_id from public.product_variants
          where product_id=(select id from public.products where slug=v_item.product_slug)
            and variant_key=v_item.variant_key for update;
        end if;
        if v_variant_id is not null then
          update public.product_variants set stock_quantity=stock_quantity-v_item.quantity,updated_at=now()
          where id=v_variant_id and stock_quantity>=v_item.quantity;
        else
          update public.products set stock_quantity=stock_quantity-v_item.quantity,updated_at=now()
          where slug=v_item.product_slug and stock_quantity>=v_item.quantity;
        end if;
        if not found then raise exception 'INSUFFICIENT_STOCK_FOR_CONFIRMATION:%',v_item.product_slug; end if;
        update public.order_items set reserved_qty=v_item.quantity where id=v_item.id;
      end loop;
      select coalesce(sum(reserved_qty),0)::integer into new.inventory_reserved_qty
      from public.order_items where order_id=new.id;
      if new.inventory_reserved_qty>0 then new.inventory_reserved_at:=coalesce(new.inventory_reserved_at,now()); end if;
    elsif coalesce(old.inventory_reserved_qty,0)=0 and coalesce(new.inventory_reserved_qty,0)=0 and qty>0 then
      if new.variant_key is not null then
        select id into v_variant_id from public.product_variants
        where product_id=(select id from public.products where slug=new.product_slug)
          and variant_key=new.variant_key for update;
      end if;
      if v_variant_id is not null then
        update public.product_variants set stock_quantity=stock_quantity-qty,updated_at=now()
        where id=v_variant_id and stock_quantity>=qty;
      else
        update public.products set stock_quantity=stock_quantity-qty,updated_at=now()
        where slug=new.product_slug and stock_quantity>=qty;
      end if;
      if not found then raise exception 'INSUFFICIENT_STOCK_FOR_CONFIRMATION'; end if;
      new.inventory_reserved_qty:=qty;
      new.inventory_reserved_at:=now();
    end if;
  end if;

  if new.status='cancelled' and old.status<>'cancelled' then
    if v_has_items then
      for v_item in
        select * from public.order_items where order_id=new.id and reserved_qty>0
        order by product_slug,coalesce(variant_key,'') for update
      loop
        v_variant_id:=null;
        if v_item.variant_key is not null then
          select id into v_variant_id from public.product_variants
          where product_id=(select id from public.products where slug=v_item.product_slug)
            and variant_key=v_item.variant_key for update;
        end if;
        if v_variant_id is not null then
          update public.product_variants set stock_quantity=stock_quantity+v_item.reserved_qty,updated_at=now() where id=v_variant_id;
        else
          update public.products set stock_quantity=stock_quantity+v_item.reserved_qty,updated_at=now() where slug=v_item.product_slug;
        end if;
        update public.order_items set reserved_qty=0 where id=v_item.id;
      end loop;
      new.inventory_reserved_qty:=0;
      new.inventory_reserved_at:=null;
    elsif coalesce(old.inventory_reserved_qty,0)>0 then
      if old.variant_key is not null then
        select id into v_variant_id from public.product_variants
        where product_id=(select id from public.products where slug=old.product_slug)
          and variant_key=old.variant_key for update;
      end if;
      if v_variant_id is not null then
        update public.product_variants set stock_quantity=stock_quantity+old.inventory_reserved_qty,updated_at=now() where id=v_variant_id;
      else
        update public.products set stock_quantity=stock_quantity+old.inventory_reserved_qty,updated_at=now() where slug=old.product_slug;
      end if;
      new.inventory_reserved_qty:=0;
      new.inventory_reserved_at:=null;
    end if;
  end if;

  if new.status='confirmed' and old.status<>'confirmed' then new.confirmed_at:=coalesce(new.confirmed_at,now()); end if;
  if new.status='shipped' and old.status<>'shipped' then new.shipped_at:=coalesce(new.shipped_at,now()); end if;
  if new.status='out_for_delivery' and old.status<>'out_for_delivery' then new.out_for_delivery_at:=coalesce(new.out_for_delivery_at,now()); end if;
  if new.status='delivered' and old.status<>'delivered' then new.delivered_at:=coalesce(new.delivered_at,now()); end if;
  return new;
end;
$function$;

create or replace function private.orvix_log_order_event()
returns trigger language plpgsql security definer set search_path to 'public','private' as $function$
declare v_title text;
begin
  if tg_op='INSERT' then
    insert into public.order_events(order_id,event_type,title,details,status,created_by,created_at)
    values(new.id,'order_placed','Order placed','Your order was received by ORVIX.',new.status,'system',new.created_at);
    return new;
  end if;
  if new.status is distinct from old.status then
    v_title:=case new.status when 'confirmed' then 'Order confirmed' when 'shipped' then 'Order shipped'
      when 'out_for_delivery' then 'Out for delivery' when 'delivered' then 'Order delivered'
      when 'cancelled' then 'Order cancelled' when 'pending_contact' then 'Awaiting contact' else 'Order updated' end;
    insert into public.order_events(order_id,event_type,title,details,status,created_by,created_at)
    values(new.id,'status_changed',v_title,'Order status changed from '||coalesce(old.status,'unknown')||' to '||new.status||'.',new.status,'system',now());
  end if;
  if new.payment_status is distinct from old.payment_status then
    v_title:=case new.payment_status when 'paid' then 'Payment received' when 'refunded' then 'Payment refunded'
      when 'partially_refunded' then 'Payment partially refunded' else 'Payment pending' end;
    insert into public.order_events(order_id,event_type,title,details,status,metadata,created_by,created_at)
    values(new.id,'payment_changed',v_title,'Payment status is now '||new.payment_status||'.',new.status,
      jsonb_build_object('paymentStatus',new.payment_status),'system',now());
  end if;
  return new;
end;
$function$;

drop trigger if exists orders_v2_event_log on public.orders;
create trigger orders_v2_event_log after insert or update of status,payment_status on public.orders
for each row execute function private.orvix_log_order_event();

create or replace function private.orvix_notify_order_v2_update()
returns trigger language plpgsql security definer set search_path to 'public','private' as $function$
begin
  if new.status='cancelled' and old.status<>'cancelled' then
    insert into public.admin_notifications(kind,title,body,target_url,event_key,severity,created_at,read_at)
    values('order','Order cancelled',new.order_number||' was cancelled.','/admin/orders-v2','order-cancelled:'||new.id::text,'warning',now(),null)
    on conflict(event_key) do update set body=excluded.body,created_at=now(),read_at=null,severity=excluded.severity;
  end if;
  if new.payment_status='paid' and old.payment_status<>'paid' then
    insert into public.admin_notifications(kind,title,body,target_url,event_key,severity,created_at,read_at)
    values('payment','Payment received',new.order_number||' was marked as paid.','/admin/orders-v2','order-paid:'||new.id::text,'success',now(),null)
    on conflict(event_key) do update set body=excluded.body,created_at=now(),read_at=null,severity=excluded.severity;
  end if;
  return new;
end;
$function$;

drop trigger if exists orders_v2_admin_notify on public.orders;
create trigger orders_v2_admin_notify after update of status,payment_status on public.orders
for each row execute function private.orvix_notify_order_v2_update();
