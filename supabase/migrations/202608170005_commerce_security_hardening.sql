-- Harden ORVIX commerce functions so only the server-side service role can call them.

alter view public.store_products set (security_invoker = true);
grant select on public.store_products to service_role;

alter function public.set_updated_at() set search_path = public;

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'orvix_%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;

  revoke execute on function public.set_updated_at() from public, anon, authenticated;
end;
$$;
