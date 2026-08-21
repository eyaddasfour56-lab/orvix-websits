-- Customer-friendly ORVIX import journey status events.

create or replace function private.orvix_log_order_event()
returns trigger language plpgsql security definer set search_path to 'public','private' as $function$
declare
  v_title text;
  v_details text;
begin
  if tg_op='INSERT' then
    insert into public.order_events(order_id,event_type,title,details,status,created_by,created_at)
    values(new.id,'order_placed','Pre-Ordered','Your pre-order was received by ORVIX and the import journey has started.',new.status,'system',new.created_at);
    return new;
  end if;

  if new.status is distinct from old.status then
    v_title:=case new.status
      when 'new' then 'Pre-Ordered'
      when 'international_transit' then 'In Transit to Egypt'
      when 'arrived_egypt' then 'Arrived in Egypt'
      when 'in_customs' then 'In Customs'
      when 'customs_cleared' then 'Customs Cleared'
      when 'received_at_orvix' then 'Received at ORVIX'
      when 'ready_for_courier' then 'Ready for Courier'
      when 'courier_requested' then 'Courier Requested'
      when 'confirmed' then 'Order confirmed'
      when 'shipped' then 'Order shipped'
      when 'out_for_delivery' then 'Out for delivery'
      when 'delivered' then 'Order delivered'
      when 'cancelled' then 'Order cancelled'
      when 'pending_contact' then 'Awaiting contact'
      else 'Order updated'
    end;

    v_details:=case new.status
      when 'new' then 'The order is registered as a pre-order.'
      when 'international_transit' then 'The item is travelling to Egypt from abroad.'
      when 'arrived_egypt' then 'The item has arrived in Egypt.'
      when 'in_customs' then 'The item is being processed by Egyptian customs.'
      when 'customs_cleared' then 'Customs clearance is complete.'
      when 'received_at_orvix' then 'ORVIX has received the item.'
      when 'ready_for_courier' then 'The package is ready to be handed to the courier.'
      when 'courier_requested' then 'A courier shipment has been created and pickup requested.'
      when 'cancelled' then 'The order has been cancelled.'
      else 'Order status changed from '||coalesce(old.status,'unknown')||' to '||new.status||'.'
    end;

    insert into public.order_events(order_id,event_type,title,details,status,created_by,created_at)
    values(new.id,'status_changed',v_title,v_details,new.status,'system',now());
  end if;

  if new.payment_status is distinct from old.payment_status then
    v_title:=case new.payment_status
      when 'paid' then 'Payment received'
      when 'refunded' then 'Payment refunded'
      when 'partially_refunded' then 'Payment partially refunded'
      else 'Payment pending'
    end;
    insert into public.order_events(order_id,event_type,title,details,status,metadata,created_by,created_at)
    values(new.id,'payment_changed',v_title,'Payment status is now '||new.payment_status||'.',new.status,
      jsonb_build_object('paymentStatus',new.payment_status),'system',now());
  end if;

  return new;
end;
$function$;
