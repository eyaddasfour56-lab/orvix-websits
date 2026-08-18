-- Follow-up from Supabase performance advisor after Orders V2 DDL.
create index if not exists analytics_events_order_id_idx on public.analytics_events(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
