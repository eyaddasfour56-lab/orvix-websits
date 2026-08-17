create or replace function public.orvix_sync_product_inventory_from_products()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.product_inventory
    where product_slug = old.slug;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    delete from public.product_inventory
    where product_slug = old.slug;
  end if;

  insert into public.product_inventory (
    product_slug,
    product_name,
    stock_quantity,
    low_stock_limit,
    is_available,
    updated_at
  ) values (
    new.slug,
    new.name,
    greatest(coalesce(new.stock_quantity, 0), 0),
    greatest(coalesce(new.low_stock_limit, 0), 0),
    new.status = 'available'
      and coalesce(new.allow_purchase, false)
      and coalesce(new.stock_quantity, 0) > 0,
    now()
  )
  on conflict (product_slug) do update set
    product_name = excluded.product_name,
    stock_quantity = excluded.stock_quantity,
    low_stock_limit = excluded.low_stock_limit,
    is_available = excluded.is_available,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists products_sync_inventory on public.products;
create trigger products_sync_inventory
after insert or update of name, slug, stock_quantity, low_stock_limit, status, allow_purchase or delete
on public.products
for each row
execute function public.orvix_sync_product_inventory_from_products();

insert into public.product_inventory (
  product_slug,
  product_name,
  stock_quantity,
  low_stock_limit,
  is_available,
  updated_at
)
select
  p.slug,
  p.name,
  greatest(coalesce(p.stock_quantity, 0), 0),
  greatest(coalesce(p.low_stock_limit, 0), 0),
  p.status = 'available'
    and coalesce(p.allow_purchase, false)
    and coalesce(p.stock_quantity, 0) > 0,
  now()
from public.products p
on conflict (product_slug) do update set
  product_name = excluded.product_name,
  stock_quantity = excluded.stock_quantity,
  low_stock_limit = excluded.low_stock_limit,
  is_available = excluded.is_available,
  updated_at = excluded.updated_at;
