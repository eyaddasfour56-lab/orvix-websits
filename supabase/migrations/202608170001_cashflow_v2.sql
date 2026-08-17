alter table public.cashflow_entries
  drop constraint if exists cashflow_entries_entry_type_check;

alter table public.cashflow_entries
  add constraint cashflow_entries_entry_type_check
  check (entry_type in ('income','expense','capital','settlement'));

alter table public.cashflow_entries
  add column if not exists from_person text,
  add column if not exists to_person text,
  add column if not exists receipt_path text,
  add column if not exists receipt_name text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.cashflow_entries
  drop constraint if exists cashflow_entries_from_person_check;

alter table public.cashflow_entries
  add constraint cashflow_entries_from_person_check
  check (from_person is null or from_person in ('me','ahmed_samy'));

alter table public.cashflow_entries
  drop constraint if exists cashflow_entries_to_person_check;

alter table public.cashflow_entries
  add constraint cashflow_entries_to_person_check
  check (to_person is null or to_person in ('me','ahmed_samy'));

alter table public.products
  add column if not exists unit_cost numeric not null default 0;

alter table public.products
  drop constraint if exists products_unit_cost_check;

alter table public.products
  add constraint products_unit_cost_check check (unit_cost >= 0);

alter table public.orders
  add column if not exists unit_cost_at_sale numeric;

alter table public.orders
  drop constraint if exists orders_unit_cost_at_sale_check;

alter table public.orders
  add constraint orders_unit_cost_at_sale_check
  check (unit_cost_at_sale is null or unit_cost_at_sale >= 0);

comment on column public.products.unit_cost is
  'Current accounting cost per unit used for cash-flow profit calculations.';
comment on column public.orders.unit_cost_at_sale is
  'Frozen unit cost used for profit calculations once an order is delivered.';
comment on column public.cashflow_entries.from_person is
  'Settlement sender.';
comment on column public.cashflow_entries.to_person is
  'Settlement recipient.';
comment on column public.cashflow_entries.receipt_path is
  'Private Supabase Storage object path for a receipt attachment.';
