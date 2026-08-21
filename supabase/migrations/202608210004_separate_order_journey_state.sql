-- Separate the customer/import journey from the order lifecycle state.
-- Cancelling an order must never erase the last real journey milestone.

alter table public.orders
  add column if not exists journey_status text not null default 'new',
  add column if not exists journey_updated_at timestamptz;

alter table public.orders drop constraint if exists orders_journey_status_check;
alter table public.orders add constraint orders_journey_status_check
  check (journey_status = any (array[
    'new'::text,
    'international_transit'::text,
    'arrived_egypt'::text,
    'in_customs'::text,
    'customs_cleared'::text,
    'received_at_orvix'::text,
    'ready_for_courier'::text
  ]));

-- Preserve the most recent real import milestone for existing orders. This is
-- especially important for test orders that were later marked cancelled.
update public.orders o
set journey_status = coalesce(
      (
        select e.status
        from public.order_events e
        where e.order_id = o.id
          and e.status = any (array[
            'new'::text,
            'international_transit'::text,
            'arrived_egypt'::text,
            'in_customs'::text,
            'customs_cleared'::text,
            'received_at_orvix'::text,
            'ready_for_courier'::text
          ])
        order by e.created_at desc, e.id desc
        limit 1
      ),
      case
        when o.status = any (array[
          'new'::text,
          'international_transit'::text,
          'arrived_egypt'::text,
          'in_customs'::text,
          'customs_cleared'::text,
          'received_at_orvix'::text,
          'ready_for_courier'::text
        ]) then o.status
        when o.bosta_tracking_number is not null then 'ready_for_courier'
        when o.status = 'confirmed' then 'received_at_orvix'
        else 'new'
      end
    ),
    journey_updated_at = coalesce(o.updated_at, o.created_at, now());

create index if not exists orders_journey_status_idx
  on public.orders(journey_status, created_at desc);

create or replace function private.orvix_log_journey_stage()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare
  v_title text;
  v_details text;
begin
  if new.journey_status is not distinct from old.journey_status then
    return new;
  end if;

  v_title := case new.journey_status
    when 'new' then 'Pre-Ordered'
    when 'international_transit' then 'In Transit to Egypt'
    when 'arrived_egypt' then 'Arrived in Egypt'
    when 'in_customs' then 'In Customs'
    when 'customs_cleared' then 'Customs Cleared'
    when 'received_at_orvix' then 'Received at ORVIX'
    when 'ready_for_courier' then 'Ready for Courier'
    else 'Journey Updated'
  end;

  v_details := case new.journey_status
    when 'new' then 'The pre-order is active and waiting to begin its import journey.'
    when 'international_transit' then 'The item is travelling to Egypt from abroad.'
    when 'arrived_egypt' then 'The item has arrived in Egypt.'
    when 'in_customs' then 'The item is currently being processed by Egyptian customs.'
    when 'customs_cleared' then 'Customs clearance is complete and the item is moving to ORVIX.'
    when 'received_at_orvix' then 'ORVIX has received the item.'
    when 'ready_for_courier' then 'The package is ready to be handed to the local courier.'
    else 'The order journey was updated.'
  end;

  new.journey_updated_at := now();

  insert into public.order_events(
    order_id,
    event_type,
    title,
    details,
    status,
    metadata,
    created_by,
    created_at
  ) values (
    new.id,
    'journey_stage_changed',
    v_title,
    v_details,
    new.journey_status,
    jsonb_build_object('fromJourney', old.journey_status, 'toJourney', new.journey_status),
    'admin',
    now()
  );

  return new;
end;
$function$;

drop trigger if exists orders_journey_stage_log on public.orders;
create trigger orders_journey_stage_log
before update of journey_status on public.orders
for each row execute function private.orvix_log_journey_stage();
