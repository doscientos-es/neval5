-- A customer may have one company price list.  Documents retain their own
-- price snapshots, so changing this assignment never rewrites history.
alter table public.customers
  add column if not exists price_list_id uuid
  references public.price_lists(id) on delete set null;

create index if not exists customers_price_list_id_idx on public.customers(price_list_id);

-- Prevent associating a customer with a list from another organization.
create or replace function private.customer_price_list_matches_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price_list_id is not null and not exists (
    select 1 from public.price_lists
    where id = new.price_list_id
      and organization_id = new.organization_id
  ) then
    raise exception 'price list must belong to the customer organization';
  end if;
  return new;
end;
$$;

revoke all on function private.customer_price_list_matches_organization() from public;

drop trigger if exists customers_price_list_organization_check on public.customers;
create trigger customers_price_list_organization_check
before insert or update of organization_id, price_list_id on public.customers
for each row execute function private.customer_price_list_matches_organization();
