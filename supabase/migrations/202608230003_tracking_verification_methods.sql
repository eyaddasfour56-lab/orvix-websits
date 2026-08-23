alter table public.order_tracking_otp_challenges
  add column if not exists verification_method text;

update public.order_tracking_otp_challenges
set verification_method = 'email_otp'
where verification_method is null;

alter table public.order_tracking_otp_challenges
  alter column verification_method set default 'email_otp',
  alter column verification_method set not null;

alter table public.order_tracking_otp_challenges
  drop constraint if exists order_tracking_otp_verification_method_check;

alter table public.order_tracking_otp_challenges
  add constraint order_tracking_otp_verification_method_check
  check (verification_method in ('email_otp', 'sms_otp', 'checkout_email'));

alter table public.order_tracking_otp_challenges
  drop constraint if exists order_tracking_otp_delivery_status_check;

alter table public.order_tracking_otp_challenges
  add constraint order_tracking_otp_delivery_status_check
  check (delivery_status in ('pending', 'sent', 'not_found', 'failed', 'not_required'));

comment on column public.order_tracking_otp_challenges.verification_method is
  'Verification route selected for this challenge. checkout_email is the no-provider fallback.';
