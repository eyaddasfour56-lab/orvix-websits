-- ORVIX detailed pre-order and supplier fulfillment journey.

alter table public.orders
  add column if not exists supplier_name text not null default 'Ahmed Samy',
  add column if not exists supplier_status text not null default 'preordered',
  add column if not exists supplier_ordered_at timestamptz,
  add column if not exists supplier_confirmed_at timestamptz,
  add column if not exists supplier_preparing_at timestamptz,
  add column if not exists supplier_shipped_at timestamptz,
  add column if not exists received_at_orvix timestamptz,
  add column if not exists ready_for_courier_at timestamptz,
  add column if not exists fulfillment_updated_at timestamptz not null default now();

alter table public.orders alter column order_type set default 'preorder';

alter table public.orders drop constraint if exists orders_supplier_status_check;
alter table public.orders add constraint orders_supplier_status_check
  check (supplier_status = any (array[
    'preordered'::text,
    'supplier_confirmed'::text,
    'supplier_preparing'::text,
    'supplier_shipped'::text,
    'received_at_orvix'::text,
    'ready_for_courier'::text,
    'cancelled'::text
  ]));

update public.orders
set order_type = 'preorder',
    supplier_name = coalesce(nullif(trim(supplier_name), ''), 'Ahmed Samy'),
    supplier_ordered_at = coalesce(supplier_ordered_at, created_at),
    supplier_status = case
      when status = 'cancelled' then 'cancelled'
      when bosta_tracking_number is not null or status in ('shipped','out_for_delivery','delivered') then 'ready_for_courier'
      else coalesce(nullif(supplier_status, ''), 'preordered')
    end,
    fulfillment_updated_at = now()
where order_type is distinct from 'preorder'
   or supplier_ordered_at is null
   or supplier_name is null
   or supplier_name = '';

create or replace function private.orvix_preorder_journey_before_write()
returns trigger
language plpgsql
security invoker
set search_path to 'public','private'
as $function$
begin
  new.order_type := 'preorder';
  new.supplier_name := coalesce(nullif(trim(new.supplier_name), ''), 'Ahmed Samy');

  if tg_op = 'INSERT' then
    new.supplier_status := coalesce(nullif(new.supplier_status, ''), 'preordered');
    new.supplier_ordered_at := coalesce(new.supplier_ordered_at, new.created_at, now());
    new.fulfillment_updated_at := coalesce(new.fulfillment_updated_at, now());
    return new;
  end if;

  if new.supplier_status is distinct from old.supplier_status then
    new.fulfillment_updated_at := now();

    if new.supplier_status = 'preordered' then
      new.supplier_ordered_at := coalesce(new.supplier_ordered_at, now());
    elsif new.supplier_status = 'supplier_confirmed' then
      new.supplier_confirmed_at := coalesce(new.supplier_confirmed_at, now());
    elsif new.supplier_status = 'supplier_preparing' then
      new.supplier_preparing_at := coalesce(new.supplier_preparing_at, now());
    elsif new.supplier_status = 'supplier_shipped' then
      new.supplier_shipped_at := coalesce(new.supplier_shipped_at, now());
    elsif new.supplier_status = 'received_at_orvix' then
      new.received_at_orvix := coalesce(new.received_at_orvix, now());
    elsif new.supplier_status = 'ready_for_courier' then
      new.received_at_orvix := coalesce(new.received_at_orvix, now());
      new.ready_for_courier_at := coalesce(new.ready_for_courier_at, now());
    end if;
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.supplier_status := 'cancelled';
    new.fulfillment_updated_at := now();
  end if;

  return new;
end;
$function$;

revoke all on function private.orvix_preorder_journey_before_write() from public, anon, authenticated;

drop trigger if exists orders_preorder_journey_before_write on public.orders;
create trigger orders_preorder_journey_before_write
before insert or update of order_type, supplier_name, supplier_status, status
on public.orders
for each row execute function private.orvix_preorder_journey_before_write();

create or replace function private.orvix_preorder_journey_event_log()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare
  v_title text;
  v_details text;
begin
  if tg_op = 'INSERT' then
    insert into public.order_events(order_id,event_type,title,details,status,metadata,created_by,created_at)
    values(
      new.id,
      'supplier_preordered',
      'Pre-ordered from ' || new.supplier_name,
      'The order was added to the supplier queue.',
      new.status,
      jsonb_build_object('supplierName',new.supplier_name,'supplierStatus',new.supplier_status),
      'system',
      coalesce(new.supplier_ordered_at,new.created_at,now())
    );
    return new;
  end if;

  if new.supplier_status is distinct from old.supplier_status then
    v_title := case new.supplier_status
      when 'preordered' then 'Pre-ordered from ' || new.supplier_name
      when 'supplier_confirmed' then 'Supplier confirmed the pre-order'
      when 'supplier_preparing' then 'Supplier is preparing the order'
      when 'supplier_shipped' then 'Supplier shipped the order to ORVIX'
      when 'received_at_orvix' then 'Received at ORVIX'
      when 'ready_for_courier' then 'Ready for courier pickup'
      when 'cancelled' then 'Supplier fulfillment cancelled'
      else 'Supplier status updated'
    end;

    v_details := case new.supplier_status
      when 'preordered' then 'Supplier: ' || new.supplier_name || '.'
      when 'supplier_confirmed' then new.supplier_name || ' confirmed the order.'
      when 'supplier_preparing' then new.supplier_name || ' is preparing the order for ORVIX.'
      when 'supplier_shipped' then 'The order is on its way from ' || new.supplier_name || ' to ORVIX.'
      when 'received_at_orvix' then 'ORVIX received the product and can prepare it for dispatch.'
      when 'ready_for_courier' then 'The package is ready to be handed to the courier.'
      when 'cancelled' then 'The supplier-side fulfillment flow was cancelled.'
      else 'Supplier fulfillment status changed.'
    end;

    insert into public.order_events(order_id,event_type,title,details,status,metadata,created_by,created_at)
    values(
      new.id,
      'supplier_status_changed',
      v_title,
      v_details,
      new.status,
      jsonb_build_object('supplierName',new.supplier_name,'from',old.supplier_status,'to',new.supplier_status),
      'admin',
      now()
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.orvix_preorder_journey_event_log() from public, anon, authenticated;

drop trigger if exists orders_preorder_journey_event_log on public.orders;
create trigger orders_preorder_journey_event_log
after insert or update of supplier_status
on public.orders
for each row execute function private.orvix_preorder_journey_event_log();

create index if not exists orders_supplier_status_created_idx
  on public.orders (supplier_status, created_at desc);
