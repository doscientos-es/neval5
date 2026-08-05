-- Corporate contact data is configurable per company and captured in new quotes.
alter table public.organizations
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists email text,
  add column if not exists phone text;

alter table public.quotes
  add column if not exists company_name_snapshot text,
  add column if not exists company_tax_id_snapshot text,
  add column if not exists company_address_snapshot text,
  add column if not exists company_email_snapshot text,
  add column if not exists company_phone_snapshot text;

create or replace function public.create_quote(
  p_customer_id uuid,
  p_notes text,
  p_global_discount_pct numeric,
  p_lines jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_customer record;
  v_company record;
  v_quote_id uuid := gen_random_uuid();
  v_number text;
  v_subtotal numeric(14,2) := 0;
  v_tax_total numeric(14,2) := 0;
  v_global_discount numeric(5,2) := coalesce(p_global_discount_pct, 0);
  v_line record;
  v_line_net numeric(14,2);
  v_discounted_net numeric(14,2);
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'at least one quote line is required'; end if;
  if v_global_discount < 0 or v_global_discount > 100 then raise exception 'invalid global discount'; end if;
  select c.organization_id, c.name, c.company, c.address, c.city, c.province into v_customer from public.customers c where c.id = p_customer_id and c.archived_at is null;
  if not found then raise exception 'customer not found'; end if;
  v_org := v_customer.organization_id;
  if not private.can_manage_org(v_org) then raise exception 'not authorized'; end if;
  select o.name, o.tax_id, o.address, o.city, o.province, o.email, o.phone into v_company from public.organizations o where o.id = v_org;
  v_number := public.next_document_number(v_org, 'quote');
  insert into public.quotes (id, organization_id, customer_id, number, customer_name_snapshot, customer_address_snapshot, company_name_snapshot, company_tax_id_snapshot, company_address_snapshot, company_email_snapshot, company_phone_snapshot, notes, global_discount_pct, subtotal, tax_total, total, created_by)
  values (v_quote_id, v_org, p_customer_id, v_number, coalesce(v_customer.company, v_customer.name), concat_ws(', ', v_customer.address, v_customer.city, v_customer.province), v_company.name, v_company.tax_id, concat_ws(', ', v_company.address, v_company.city, v_company.province), v_company.email, v_company.phone, nullif(p_notes, ''), v_global_discount, 0, 0, 0, auth.uid());
  for v_line in select * from jsonb_to_recordset(p_lines) as x(product_id uuid, description text, quantity numeric, unit text, unit_price numeric, discount_pct numeric, tax_rate numeric) loop
    if coalesce(v_line.description, '') = '' or coalesce(v_line.quantity, 0) <= 0 or coalesce(v_line.unit_price, -1) < 0 or coalesce(v_line.discount_pct, 0) < 0 or coalesce(v_line.discount_pct, 0) > 100 or coalesce(v_line.tax_rate, 0) < 0 or coalesce(v_line.tax_rate, 0) > 100 then raise exception 'invalid quote line'; end if;
    if v_line.product_id is not null and not exists (select 1 from public.products p where p.id = v_line.product_id and p.organization_id = v_org and p.archived_at is null) then raise exception 'invalid product'; end if;
    v_line_net := round(v_line.quantity * v_line.unit_price * (1 - coalesce(v_line.discount_pct, 0) / 100), 2);
    v_discounted_net := round(v_line_net * (1 - v_global_discount / 100), 2);
    v_subtotal := v_subtotal + v_discounted_net;
    v_tax_total := v_tax_total + round(v_discounted_net * coalesce(v_line.tax_rate, 0) / 100, 2);
    insert into public.quote_lines (quote_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total) values (v_quote_id, v_line.product_id, v_line.description, v_line.quantity, coalesce(nullif(v_line.unit, ''), 'ud'), v_line.unit_price, coalesce(v_line.discount_pct, 0), coalesce(v_line.tax_rate, 0), v_line_net);
  end loop;
  update public.quotes set subtotal = v_subtotal, tax_total = v_tax_total, total = v_subtotal + v_tax_total where id = v_quote_id;
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload) values (v_org, auth.uid(), 'quote', v_quote_id, 'created', jsonb_build_object('number', v_number));
  return v_quote_id;
end;
$$;
