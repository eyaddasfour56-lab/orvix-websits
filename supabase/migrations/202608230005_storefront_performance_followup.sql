-- Cover the reverse lookup used when a product is archived or deleted.
create index if not exists customer_wishlist_product_idx
  on public.customer_wishlist(product_id);

-- These tables are intentionally server-only. Explicit deny policies make that
-- boundary visible in schema reviews while the service role continues to bypass RLS.
drop policy if exists site_settings_deny_direct_clients on public.site_settings;
create policy site_settings_deny_direct_clients
on public.site_settings
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists admin_login_challenges_deny_direct_clients on public.admin_login_challenges;
create policy admin_login_challenges_deny_direct_clients
on public.admin_login_challenges
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists checkout_phone_challenges_deny_direct_clients on public.checkout_phone_challenges;
create policy checkout_phone_challenges_deny_direct_clients
on public.checkout_phone_challenges
for all
to anon, authenticated
using (false)
with check (false);
