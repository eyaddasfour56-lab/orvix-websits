-- Atomic multi-item checkout for ORVIX Orders V2.

create or replace function public.orvix_create_order_v4(
  p_idempotency_key text,p_checkout_session_key text,p_items jsonb,p_customer_name text,p_phone text,p_customer_email text,
  p_governorate text,p_bosta_city_id text,p_bosta_city_name text,p_bosta_city_sector integer,p_bosta_zone_id text,
  p_bosta_zone_name text,p_bosta_district_id text,p_bosta_district_name text,p_address text,p_notes text,
  p_delivery_fee numeric,p_discount_code text,p_source_hash text,p_user_agent_hash text
) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_settings public.commerce_settings%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_schedule public.product_price_schedules%rowtype;
  v_discount public.delivery_discount_codes%rowtype;
  v_existing public.orders%rowtype;
  v_item jsonb;
  v_sorted_items jsonb;
  v_has_variants boolean;
  v_variant_found boolean;
  v_discount_found boolean:=false;
  v_slug text;
  v_variant_key text;
  v_colour text;
  v_qty integer;
  v_price numeric;
  v_compare_at numeric;
  v_available_stock integer;
  v_max_qty integer;
  v_line_total numeric;
  v_products_gross numeric:=0;
  v_products_net numeric:=0;
  v_delivery_fee numeric:=greatest(coalesce(p_delivery_fee,0),0);
  v_product_discount numeric:=0;
  v_delivery_discount numeric:=0;
  v_discount_amount numeric:=0;
  v_final_total numeric:=0;
  v_discount_code text:=nullif(upper(trim(coalesce(p_discount_code,''))),'');
  v_order_id uuid:=gen_random_uuid();
  v_order_number text;
  v_shipping_number text;
  v_now timestamptz:=clock_timestamp();
  v_total_qty integer:=0;
  v_item_count integer:=0;
  v_reserved_total integer:=0;
  v_total_cost numeric:=0;
  v_any_preorder boolean:=false;
  v_any_standard boolean:=false;
  v_order_type text:='standard';
  v_eta_from date;
  v_eta_to date;
  v_item_eta_from date;
  v_item_eta_to date;
  v_first_name text:='Shopping Cart';
  v_first_slug text:='cart';
  v_first_colour text:='Mixed';
  v_first_variant_key text;
  v_first_variant_label text;
  v_first_price numeric:=0;
  v_risk_score integer:=0;
  v_risk_flags text[]:='{}'::text[];
  v_recent_phone integer:=0;
  v_recent_source integer:=0;
  v_items_result jsonb;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>20 then
    raise exception 'INVALID_ITEMS';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key));
  select * into v_existing from public.orders where idempotency_key=p_idempotency_key limit 1;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',oi.id,'productSlug',oi.product_slug,'productName',oi.product_name,'variantKey',oi.variant_key,
      'variantLabel',oi.variant_label,'colour',oi.colour,'quantity',oi.quantity,'unitPrice',oi.unit_price,
      'lineTotal',oi.line_total,'isPreorder',oi.is_preorder,'estimatedDeliveryFrom',oi.estimated_delivery_from,
      'estimatedDeliveryTo',oi.estimated_delivery_to
    ) order by oi.created_at,oi.id),'[]'::jsonb)
    into v_items_result from public.order_items oi where oi.order_id=v_existing.id;
    return jsonb_build_object(
      'duplicate',true,'orderId',v_existing.id,'orderNumber',v_existing.order_number,'shippingNumber',v_existing.shipping_number,
      'productsTotal',v_existing.products_total,'deliveryFee',v_existing.delivery_fee,'discountAmount',v_existing.discount_amount,
      'totalPrice',v_existing.total_price,'orderType',v_existing.order_type,'paymentStatus',v_existing.payment_status,
      'estimatedDeliveryFrom',v_existing.estimated_delivery_from,'estimatedDeliveryTo',v_existing.estimated_delivery_to,'items',v_items_result
    );
  end if;

  select * into v_settings from public.commerce_settings where id='default' for share;
  if not found then
    insert into public.commerce_settings(id) values('default') returning * into v_settings;
  end if;
  if not v_settings.checkout_enabled then raise exception 'CHECKOUT_DISABLED'; end if;

  select jsonb_agg(value order by value->>'productSlug',coalesce(value->>'variantKey',''),coalesce(value->>'colour',''))
  into v_sorted_items from jsonb_array_elements(p_items);

  v_order_number:='ORVIX-'||(floor(extract(epoch from v_now)*1000))::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  v_shipping_number:='SHIP-'||(floor(extract(epoch from v_now)*1000))::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.orders(
    id,order_number,shipping_number,shipping_status,label_created_at,payment_method,payment_status,
    product_name,product_slug,customer_name,phone,customer_email,governorate,bosta_city_id,bosta_city_name,bosta_city_sector,
    bosta_zone_id,bosta_zone_name,bosta_district_id,bosta_district_name,address,notes,colour,quantity,product_price,products_total,
    delivery_fee,discount_amount,total_price,status,unit_cost_at_sale,inventory_reserved_qty,idempotency_key,checkout_session_key,
    risk_score,risk_flags,source_hash,user_agent_hash,processing_status,item_count,order_type,created_at,updated_at
  ) values(
    v_order_id,v_order_number,v_shipping_number,'ready_to_print',v_now,'instapay_on_delivery','pending','Shopping Cart','cart',
    p_customer_name,p_phone,nullif(trim(coalesce(p_customer_email,'')),''),p_governorate,p_bosta_city_id,p_bosta_city_name,
    p_bosta_city_sector,p_bosta_zone_id,p_bosta_zone_name,p_bosta_district_id,p_bosta_district_name,p_address,
    coalesce(nullif(trim(coalesce(p_notes,'')),''),'No notes'),'Mixed',1,0,0,v_delivery_fee,0,v_delivery_fee,'new',0,0,
    p_idempotency_key,nullif(trim(coalesce(p_checkout_session_key,'')),''),0,'{}'::text[],nullif(trim(coalesce(p_source_hash,'')),''),
    nullif(trim(coalesce(p_user_agent_hash,'')),''),case when v_settings.queue_enabled then 'queued' else 'accepted' end,1,'standard',v_now,v_now
  );

  for v_item in select value from jsonb_array_elements(v_sorted_items) loop
    v_slug:=trim(coalesce(v_item->>'productSlug',''));
    v_variant_key:=nullif(trim(coalesce(v_item->>'variantKey','')),'');
    v_colour:=coalesce(nullif(trim(coalesce(v_item->>'colour','')),''),'Standard');
    begin
      v_qty:=(v_item->>'quantity')::integer;
    exception when others then
      raise exception 'INVALID_QUANTITY';
    end;

    select * into v_product from public.products where slug=v_slug for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND:%',v_slug; end if;
    if v_product.status not in('available','preorder') or not coalesce(v_product.allow_purchase,false)
      or (v_product.available_from is not null and v_product.available_from>v_now)
      or (v_product.available_until is not null and v_product.available_until<=v_now) then
      raise exception 'PRODUCT_UNAVAILABLE:%',v_slug;
    end if;

    select * into v_schedule from public.product_price_schedules s
    where s.product_id=v_product.id and s.active and s.starts_at<=v_now and (s.ends_at is null or s.ends_at>v_now)
    order by s.priority desc,s.starts_at desc,s.created_at desc limit 1;
    if found then
      v_price:=v_schedule.price;
      v_compare_at:=coalesce(v_schedule.compare_at_price,v_product.compare_at_price);
    else
      v_price:=v_product.price;
      v_compare_at:=v_product.compare_at_price;
    end if;
    if v_price<=0 then raise exception 'INVALID_PRODUCT_PRICE:%',v_slug; end if;

    select exists(select 1 from public.product_variants where product_id=v_product.id) into v_has_variants;
    v_variant_found:=false;
    if v_has_variants then
      select * into v_variant from public.product_variants v
      where v.product_id=v_product.id and v.active and
        ((v_variant_key is not null and lower(v.variant_key)=lower(v_variant_key)) or lower(v.label)=lower(v_colour))
      order by case when v_variant_key is not null and lower(v.variant_key)=lower(v_variant_key) then 0 else 1 end,
        v.display_order,v.created_at for update limit 1;
      v_variant_found:=found;
      if not v_variant_found or not v_variant.allow_purchase then raise exception 'VARIANT_UNAVAILABLE:%',v_slug; end if;
      v_available_stock:=v_variant.stock_quantity;
      v_colour:=v_variant.label;
      v_variant_key:=v_variant.variant_key;
    else
      v_available_stock:=v_product.stock_quantity;
    end if;

    v_max_qty:=least(greatest(coalesce(v_settings.max_quantity_per_order,10),1),greatest(coalesce(v_product.max_order_quantity,10),1));
    if v_qty is null or v_qty<1 or v_qty>v_max_qty then raise exception 'INVALID_QUANTITY:%',v_slug; end if;

    if v_product.status='available' then
      if v_qty>v_available_stock then raise exception 'INSUFFICIENT_STOCK:%:%',v_slug,v_available_stock; end if;
      if v_variant_found then
        update public.product_variants set stock_quantity=stock_quantity-v_qty,updated_at=v_now
        where id=v_variant.id and stock_quantity>=v_qty;
      else
        update public.products set stock_quantity=stock_quantity-v_qty,updated_at=v_now
        where id=v_product.id and stock_quantity>=v_qty;
      end if;
      if not found then raise exception 'INSUFFICIENT_STOCK:%:0',v_slug; end if;
      v_reserved_total:=v_reserved_total+v_qty;
      v_any_standard:=true;
      v_item_eta_from:=null;
      v_item_eta_to:=null;
    else
      v_any_preorder:=true;
      v_item_eta_from:=(v_now::date+v_product.preorder_min_days);
      v_item_eta_to:=(v_now::date+v_product.preorder_max_days);
      v_eta_from:=case when v_eta_from is null then v_item_eta_from else greatest(v_eta_from,v_item_eta_from) end;
      v_eta_to:=case when v_eta_to is null then v_item_eta_to else greatest(v_eta_to,v_item_eta_to) end;
    end if;

    v_line_total:=round(v_price*v_qty,2);
    v_products_gross:=v_products_gross+v_line_total;
    v_total_qty:=v_total_qty+v_qty;
    v_item_count:=v_item_count+1;
    v_total_cost:=v_total_cost+coalesce(v_product.unit_cost,0)*v_qty;

    if v_item_count=1 then
      v_first_name:=v_product.name;
      v_first_slug:=v_product.slug;
      v_first_colour:=v_colour;
      v_first_variant_key:=case when v_variant_found then v_variant.variant_key else null end;
      v_first_variant_label:=case when v_variant_found then v_variant.label else null end;
      v_first_price:=v_price;
    end if;

    insert into public.order_items(
      order_id,product_id,product_slug,product_name,variant_key,variant_label,colour,quantity,unit_price,unit_cost,
      line_total,reserved_qty,is_preorder,estimated_delivery_from,estimated_delivery_to,created_at
    ) values(
      v_order_id,v_product.id,v_product.slug,v_product.name,
      case when v_variant_found then v_variant.variant_key else null end,
      case when v_variant_found then v_variant.label else null end,
      v_colour,v_qty,v_price,coalesce(v_product.unit_cost,0),v_line_total,
      case when v_product.status='available' then v_qty else 0 end,
      v_product.status='preorder',v_item_eta_from,v_item_eta_to,v_now
    );
  end loop;

  if v_total_qty<1 or v_total_qty>20 then raise exception 'INVALID_CART_QUANTITY'; end if;
  if v_any_preorder and v_any_standard then
    v_order_type:='mixed';
  elsif v_any_preorder then
    v_order_type:='preorder';
  else
    v_order_type:='standard';
  end if;

  if v_discount_code is not null then
    select * into v_discount from public.delivery_discount_codes
    where upper(code)=v_discount_code limit 1 for update;
    v_discount_found:=found;
    if not v_discount_found or not v_discount.active
      or (v_discount.starts_at is not null and v_discount.starts_at>v_now)
      or (v_discount.expires_at is not null and v_discount.expires_at<=v_now)
      or (v_discount.usage_limit is not null and coalesce(v_discount.times_used,0)>=v_discount.usage_limit)
      or v_products_gross<coalesce(v_discount.minimum_order_value,0) then
      raise exception 'INVALID_DISCOUNT';
    end if;
    if v_discount.discount_type='free_delivery' then
      v_delivery_discount:=v_delivery_fee;
    elsif v_discount.discount_type='fixed_amount' then
      v_product_discount:=least(greatest(coalesce(v_discount.discount_value,0),0),v_products_gross);
    elsif v_discount.discount_type='percentage' then
      v_product_discount:=least(round(v_products_gross*least(greatest(coalesce(v_discount.discount_value,0),0),100)/100,2),v_products_gross);
    else
      raise exception 'INVALID_DISCOUNT';
    end if;
    if v_discount.maximum_discount is not null and v_product_discount>v_discount.maximum_discount then
      v_product_discount:=v_discount.maximum_discount;
    end if;
  end if;

  v_products_net:=greatest(v_products_gross-v_product_discount,0);
  v_delivery_fee:=greatest(v_delivery_fee-v_delivery_discount,0);
  v_discount_amount:=v_product_discount+v_delivery_discount;
  v_final_total:=v_products_net+v_delivery_fee;

  select count(*)::integer into v_recent_phone from public.orders
  where phone=p_phone and id<>v_order_id and status<>'cancelled' and created_at>=v_now-interval '10 minutes';
  if nullif(trim(coalesce(p_source_hash,'')),'') is not null then
    select count(*)::integer into v_recent_source from public.orders
    where source_hash=p_source_hash and id<>v_order_id and status<>'cancelled' and created_at>=v_now-interval '10 minutes';
  end if;
  if v_recent_phone>=2 then
    v_risk_score:=least(v_risk_score+45,100);
    v_risk_flags:=array_append(v_risk_flags,'repeated_phone_orders');
  end if;
  if v_recent_source>=3 then
    v_risk_score:=least(v_risk_score+45,100);
    v_risk_flags:=array_append(v_risk_flags,'repeated_device_orders');
  end if;
  if v_total_qty>=20 then
    v_risk_score:=least(v_risk_score+10,100);
    v_risk_flags:=array_append(v_risk_flags,'maximum_cart_quantity');
  end if;

  update public.orders set
    product_name=case when v_item_count=1 then v_first_name else v_item_count::text||' items' end,
    product_slug=v_first_slug,
    colour=case when v_item_count=1 then v_first_colour else 'Mixed' end,
    quantity=v_total_qty,
    product_price=v_first_price,
    products_total=v_products_net,
    delivery_fee=v_delivery_fee,
    discount_code=v_discount_code,
    discount_amount=v_discount_amount,
    total_price=v_final_total,
    unit_cost_at_sale=case when v_total_qty>0 then round(v_total_cost/v_total_qty,2) else 0 end,
    inventory_reserved_qty=v_reserved_total,
    inventory_reserved_at=case when v_reserved_total>0 then v_now else null end,
    variant_key=case when v_item_count=1 then v_first_variant_key else null end,
    variant_label=case when v_item_count=1 then v_first_variant_label else null end,
    risk_score=v_risk_score,
    risk_flags=v_risk_flags,
    item_count=v_item_count,
    order_type=v_order_type,
    estimated_delivery_from=v_eta_from,
    estimated_delivery_to=v_eta_to,
    updated_at=v_now
  where id=v_order_id;

  if v_discount_found then
    update public.delivery_discount_codes
    set times_used=coalesce(times_used,0)+1,updated_at=v_now
    where id=v_discount.id;
  end if;

  if v_settings.queue_enabled then
    insert into public.commerce_jobs(kind,payload,dedupe_key)
    values('send_order_admin_email',jsonb_build_object('orderId',v_order_id,'orderNumber',v_order_number),
      'order:'||v_order_id::text||':admin-email')
    on conflict(dedupe_key) do nothing;
    if nullif(trim(coalesce(p_customer_email,'')),'') is not null then
      insert into public.commerce_jobs(kind,payload,dedupe_key)
      values('send_order_customer_email',jsonb_build_object('orderId',v_order_id,'orderNumber',v_order_number),
        'order:'||v_order_id::text||':customer-email')
      on conflict(dedupe_key) do nothing;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',oi.id,'productSlug',oi.product_slug,'productName',oi.product_name,'variantKey',oi.variant_key,
    'variantLabel',oi.variant_label,'colour',oi.colour,'quantity',oi.quantity,'unitPrice',oi.unit_price,
    'lineTotal',oi.line_total,'isPreorder',oi.is_preorder,'estimatedDeliveryFrom',oi.estimated_delivery_from,
    'estimatedDeliveryTo',oi.estimated_delivery_to
  ) order by oi.created_at,oi.id),'[]'::jsonb)
  into v_items_result from public.order_items oi where oi.order_id=v_order_id;

  return jsonb_build_object(
    'duplicate',false,'orderId',v_order_id,'orderNumber',v_order_number,'shippingNumber',v_shipping_number,
    'productsTotal',v_products_net,'deliveryFee',v_delivery_fee,'discountAmount',v_discount_amount,'totalPrice',v_final_total,
    'orderType',v_order_type,'paymentStatus','pending','estimatedDeliveryFrom',v_eta_from,'estimatedDeliveryTo',v_eta_to,
    'riskScore',v_risk_score,'items',v_items_result
  );
end;
$function$;

revoke all on function public.orvix_create_order_v4(
  text,text,jsonb,text,text,text,text,text,text,integer,text,text,text,text,text,text,numeric,text,text,text
) from public, anon, authenticated;
grant execute on function public.orvix_create_order_v4(
  text,text,jsonb,text,text,text,text,text,text,integer,text,text,text,text,text,text,numeric,text,text,text
) to service_role;
