create table if not exists public.order_tracking_otp_challenges (
  id uuid primary key,
  phone_hash text not null,
  phone_normalized text not null,
  email_normalized text,
  customer_name text,
  otp_hash text not null,
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  delivery_status text not null default 'pending',
  delivered_at timestamptz,
  verified_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint order_tracking_otp_attempts_check
    check (attempts >= 0 and max_attempts between 1 and 10 and attempts <= max_attempts),
  constraint order_tracking_otp_delivery_status_check
    check (delivery_status in ('pending', 'sent', 'not_found', 'failed'))
);

create index if not exists order_tracking_otp_phone_created_idx
  on public.order_tracking_otp_challenges(phone_hash, created_at desc);

create index if not exists order_tracking_otp_expiry_idx
  on public.order_tracking_otp_challenges(expires_at);

create table if not exists public.order_tracking_sessions (
  id uuid primary key,
  token_hash text not null unique,
  phone_normalized text not null,
  email_normalized text not null,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists order_tracking_sessions_identity_idx
  on public.order_tracking_sessions(phone_normalized, email_normalized, expires_at desc);

create index if not exists order_tracking_sessions_expiry_idx
  on public.order_tracking_sessions(expires_at);

alter table public.order_tracking_otp_challenges enable row level security;
alter table public.order_tracking_sessions enable row level security;

revoke all on table public.order_tracking_otp_challenges from public, anon, authenticated;
revoke all on table public.order_tracking_sessions from public, anon, authenticated;

grant select, insert, update, delete on table public.order_tracking_otp_challenges to service_role;
grant select, insert, update, delete on table public.order_tracking_sessions to service_role;

comment on table public.order_tracking_otp_challenges is
  'Short-lived, service-role-only challenges for secure customer order tracking.';

comment on table public.order_tracking_sessions is
  'Short-lived, service-role-only tracking sessions. Browser cookies contain only the unhashed random token.';
