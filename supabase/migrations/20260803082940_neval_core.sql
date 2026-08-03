-- NEVAL 5 core. Every business record is scoped to an organisation.
create schema if not exists private;

create type public.app_role as enum ('administrator', 'administrative', 'production', 'cutter', 'cnc_operator');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
create type public.order_status as enum ('pending', 'in_manufacturing', 'ready', 'delivered');
create type public.purchase_status as enum ('draft', 'requested', 'partially_received', 'received', 'cancelled');
create type public.stock_movement_type as enum ('entry', 'exit', 'purchase_receipt', 'adjustment');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  timezone text not null default 'Europe/Madrid',
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  is_sales_rep boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'administrative',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_memberships_user_idx on public.organization_memberships(user_id);

create or replace function private.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_org and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_org(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_org
      and user_id = (select auth.uid())
      and role in ('administrator', 'administrative')
  );
$$;
revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.can_manage_org(uuid) from public;
grant execute on function private.is_org_member(uuid), private.can_manage_org(uuid) to authenticated;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company text,
  address text,
  city text,
  province text,
  phone text,
  mobile text,
  email text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_org_name_idx on public.customers(organization_id, name);

create table public.product_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  unique (organization_id, name)
);
create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  is_default boolean not null default false,
  unique (organization_id, name)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid references public.product_families(id) on delete set null,
  default_tax_rate_id uuid references public.tax_rates(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  base_price numeric(14,2) not null default 0 check (base_price >= 0),
  track_stock boolean not null default false,
  stock_unit text not null default 'ud',
  minimum_stock numeric(14,3) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index products_org_name_idx on public.products(organization_id, name);
create index products_family_idx on public.products(family_id);

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  unique (organization_id, name)
);
create table public.price_list_items (
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  primary key (price_list_id, product_id)
);

create table public.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('quote', 'order', 'purchase')),
  year integer not null,
  last_value integer not null default 0,
  primary key (organization_id, document_type, year)
);

create or replace function public.next_document_number(target_org uuid, target_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare next_value integer; current_year integer := extract(year from now() at time zone 'Europe/Madrid'); prefix text;
begin
  if not private.can_manage_org(target_org) then raise exception 'not authorized'; end if;
  if target_type not in ('quote', 'order', 'purchase') then raise exception 'invalid document type'; end if;
  insert into public.document_sequences (organization_id, document_type, year, last_value)
  values (target_org, target_type, current_year, 1)
  on conflict (organization_id, document_type, year)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into next_value;
  prefix := case target_type when 'quote' then 'PRE' when 'order' then 'PED' else 'COM' end;
  return prefix || '-' || current_year || '-' || lpad(next_value::text, 4, '0');
end;
$$;
revoke all on function public.next_document_number(uuid, text) from public;
grant execute on function public.next_document_number(uuid, text) to authenticated;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  number text not null,
  status public.quote_status not null default 'draft',
  customer_name_snapshot text not null,
  customer_address_snapshot text,
  notes text,
  global_discount_pct numeric(5,2) not null default 0 check (global_discount_pct between 0 and 100),
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index quotes_org_status_created_idx on public.quotes(organization_id, status, created_at desc);
create index quotes_customer_idx on public.quotes(customer_id);
create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description_snapshot text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null default 'ud',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  tax_rate_snapshot numeric(5,2) not null default 21,
  line_total numeric(14,2) not null default 0
);
create index quote_lines_quote_idx on public.quote_lines(quote_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  source_quote_id uuid unique references public.quotes(id),
  sales_rep_id uuid references public.profiles(id),
  number text not null,
  status public.order_status not null default 'pending',
  customer_name_snapshot text not null,
  customer_address_snapshot text,
  notes text,
  total numeric(14,2) not null default 0,
  delivered_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index orders_org_status_created_idx on public.orders(organization_id, status, created_at desc);
create index orders_customer_idx on public.orders(customer_id);
create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description_snapshot text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null default 'ud',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  tax_rate_snapshot numeric(5,2) not null default 21,
  line_total numeric(14,2) not null default 0
);
create index order_lines_order_idx on public.order_lines(order_id);
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index order_events_order_created_idx on public.order_events(order_id, created_at desc);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  number text not null,
  status public.purchase_status not null default 'draft',
  notes text,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index purchase_orders_org_status_created_idx on public.purchase_orders(organization_id, status, created_at desc);
create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  received_quantity numeric(14,3) not null default 0 check (received_quantity >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0)
);
create index purchase_order_lines_po_idx on public.purchase_order_lines(purchase_order_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  movement_type public.stock_movement_type not null,
  quantity numeric(14,3) not null check (quantity <> 0),
  reason text not null,
  idempotency_key uuid unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_product_created_idx on public.stock_movements(product_id, created_at desc);
create index stock_movements_org_created_idx on public.stock_movements(organization_id, created_at desc);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  bucket text not null default 'neval-files',
  path text not null unique,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size <= 20971520),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((customer_id is not null)::integer + (order_id is not null)::integer = 1)
);
create index attachments_customer_idx on public.attachments(customer_id);
create index attachments_order_idx on public.attachments(order_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_org_created_idx on public.audit_events(organization_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.product_families enable row level security;
alter table public.tax_rates enable row level security;
alter table public.products enable row level security;
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.document_sequences enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_events enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.stock_movements enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_events enable row level security;

create policy "members read organizations" on public.organizations for select to authenticated using ((select private.is_org_member(id)));
create policy "users read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "members read memberships" on public.organization_memberships for select to authenticated using (user_id = (select auth.uid()) or (select private.can_manage_org(organization_id)));
create policy "admins manage memberships" on public.organization_memberships for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));

-- Shared tenant policies. Child tables inherit visibility from their parent document.
create policy "customers read" on public.customers for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "customers manage" on public.customers for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "families read" on public.product_families for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "families manage" on public.product_families for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "tax read" on public.tax_rates for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "tax manage" on public.tax_rates for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "products read" on public.products for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "products manage" on public.products for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "prices read" on public.price_lists for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "prices manage" on public.price_lists for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "quotes read" on public.quotes for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "quotes manage" on public.quotes for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "orders read" on public.orders for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "orders manage" on public.orders for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "suppliers read" on public.suppliers for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "suppliers manage" on public.suppliers for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "purchases read" on public.purchase_orders for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "purchases manage" on public.purchase_orders for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "stock read" on public.stock_movements for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "stock manage" on public.stock_movements for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "attachments read" on public.attachments for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "attachments manage" on public.attachments for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "audit read" on public.audit_events for select to authenticated using ((select private.can_manage_org(organization_id)));

create policy "price items read" on public.price_list_items for select to authenticated using (exists (select 1 from public.price_lists p where p.id = price_list_id and (select private.is_org_member(p.organization_id))));
create policy "price items manage" on public.price_list_items for all to authenticated using (exists (select 1 from public.price_lists p where p.id = price_list_id and (select private.can_manage_org(p.organization_id)))) with check (exists (select 1 from public.price_lists p where p.id = price_list_id and (select private.can_manage_org(p.organization_id))));
create policy "quote lines read" on public.quote_lines for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and (select private.is_org_member(q.organization_id))));
create policy "quote lines manage" on public.quote_lines for all to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and (select private.can_manage_org(q.organization_id)))) with check (exists (select 1 from public.quotes q where q.id = quote_id and (select private.can_manage_org(q.organization_id))));
create policy "order lines read" on public.order_lines for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (select private.is_org_member(o.organization_id))));
create policy "order lines manage" on public.order_lines for all to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (select private.can_manage_org(o.organization_id)))) with check (exists (select 1 from public.orders o where o.id = order_id and (select private.can_manage_org(o.organization_id))));
create policy "order events access" on public.order_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (select private.is_org_member(o.organization_id))));
create policy "purchase lines read" on public.purchase_order_lines for select to authenticated using (exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and (select private.is_org_member(p.organization_id))));
create policy "purchase lines manage" on public.purchase_order_lines for all to authenticated using (exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and (select private.can_manage_org(p.organization_id)))) with check (exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and (select private.can_manage_org(p.organization_id))));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('neval-files', 'neval-files', false, 20971520, array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;
create policy "tenant reads files" on storage.objects for select to authenticated using (bucket_id = 'neval-files' and (select private.is_org_member((storage.foldername(name))[1]::uuid)));
create policy "managers upload files" on storage.objects for insert to authenticated with check (bucket_id = 'neval-files' and (select private.can_manage_org((storage.foldername(name))[1]::uuid)));
create policy "managers update files" on storage.objects for update to authenticated using (bucket_id = 'neval-files' and (select private.can_manage_org((storage.foldername(name))[1]::uuid))) with check (bucket_id = 'neval-files' and (select private.can_manage_org((storage.foldername(name))[1]::uuid)));
create policy "managers delete files" on storage.objects for delete to authenticated using (bucket_id = 'neval-files' and (select private.can_manage_org((storage.foldername(name))[1]::uuid)));
