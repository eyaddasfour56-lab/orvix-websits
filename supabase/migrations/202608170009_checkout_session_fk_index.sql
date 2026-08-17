create index if not exists checkout_sessions_completed_order_id_idx
on public.checkout_sessions(completed_order_id)
where completed_order_id is not null;
