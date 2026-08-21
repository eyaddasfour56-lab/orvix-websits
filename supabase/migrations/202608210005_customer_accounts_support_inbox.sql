create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  phone_normalized text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

alter table public.customer_chat_sessions
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_email text;

create index if not exists idx_customer_profiles_phone_normalized
  on public.customer_profiles(phone_normalized)
  where phone_normalized is not null;
create index if not exists idx_orders_customer_user_id_created_at
  on public.orders(customer_user_id, created_at desc)
  where customer_user_id is not null;
create index if not exists idx_customer_chat_sessions_user_id_last_message
  on public.customer_chat_sessions(user_id, last_message_at desc)
  where user_id is not null;

alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.customer_chat_sessions enable row level security;
alter table public.customer_chat_messages enable row level security;

grant select on public.customer_profiles to authenticated;
grant select on public.orders to authenticated;
grant select on public.customer_chat_sessions to authenticated;
grant select on public.customer_chat_messages to authenticated;

drop policy if exists customer_profiles_select_own on public.customer_profiles;
create policy customer_profiles_select_own
on public.customer_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists orders_select_own_account on public.orders;
create policy orders_select_own_account
on public.orders
for select
to authenticated
using (customer_user_id = (select auth.uid()));

drop policy if exists chat_sessions_select_own_account on public.customer_chat_sessions;
create policy chat_sessions_select_own_account
on public.customer_chat_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists chat_messages_select_own_account on public.customer_chat_messages;
create policy chat_messages_select_own_account
on public.customer_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.customer_chat_sessions s
    where s.id = customer_chat_messages.session_id
      and s.user_id = (select auth.uid())
  )
);
