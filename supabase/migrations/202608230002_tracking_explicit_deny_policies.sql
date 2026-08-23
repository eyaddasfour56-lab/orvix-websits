create policy "tracking challenges deny browser access"
  on public.order_tracking_otp_challenges
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "tracking sessions deny browser access"
  on public.order_tracking_sessions
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
