-- Commercial document operations are centralised here so totals and document
-- numbers cannot be forged or duplicated by concurrent browser requests.
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
  v_quote_id uuid := gen_random_uuid();
  v_number text;
  v_subtotal numeric(14,2) := 0;
  v_tax_total numeric(14,2) := 0;
  v_global_discount numeric(5,2) := coalesce(p_global_discount_pct, 0);
  v_line record;
  v_line_net numeric(14,2);
  v_discounted_net numeric(14,2);
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'at least one quote line is required';
  end if;
  if v_global_discount < 0 or v_global_discount > 100 then raise exception 'invalid global discount'; end if;

  select c.organization_id, c.name, c.company, c.address, c.city, c.province
    into v_customer from public.customers c where c.id = p_customer_id and c.archived_at is null;
  if not found then raise exception 'customer not found'; end if;
  v_org := v_customer.organization_id;
  if not private.can_manage_org(v_org) then raise exception 'not authorized'; end if;

  v_number := public.next_document_number(v_org, 'quote');
  insert into public.quotes (id, organization_id, customer_id, number, customer_name_snapshot, customer_address_snapshot, notes, global_discount_pct, subtotal, tax_total, total, created_by)
  values (v_quote_id, v_org, p_customer_id, v_number, coalesce(v_customer.company, v_customer.name), concat_ws(', ', v_customer.address, v_customer.city, v_customer.province), nullif(p_notes, ''), v_global_discount, 0, 0, 0, auth.uid());
  for v_line in select * from jsonb_to_recordset(p_lines) as x(
    product_id uuid, description text, quantity numeric, unit text, unit_price numeric,
    discount_pct numeric, tax_rate numeric
  ) loop
    if coalesce(v_line.description, '') = '' or coalesce(v_line.quantity, 0) <= 0 or coalesce(v_line.unit_price, -1) < 0
      or coalesce(v_line.discount_pct, 0) < 0 or coalesce(v_line.discount_pct, 0) > 100
      or coalesce(v_line.tax_rate, 0) < 0 or coalesce(v_line.tax_rate, 0) > 100 then
      raise exception 'invalid quote line';
    end if;
    if v_line.product_id is not null and not exists (
      select 1 from public.products p where p.id = v_line.product_id and p.organization_id = v_org and p.archived_at is null
    ) then raise exception 'invalid product'; end if;
    v_line_net := round(v_line.quantity * v_line.unit_price * (1 - coalesce(v_line.discount_pct, 0) / 100), 2);
    v_discounted_net := round(v_line_net * (1 - v_global_discount / 100), 2);
    v_subtotal := v_subtotal + v_discounted_net;
    v_tax_total := v_tax_total + round(v_discounted_net * coalesce(v_line.tax_rate, 0) / 100, 2);
    insert into public.quote_lines (quote_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total)
    values (v_quote_id, v_line.product_id, v_line.description, v_line.quantity, coalesce(nullif(v_line.unit, ''), 'ud'), v_line.unit_price, coalesce(v_line.discount_pct, 0), coalesce(v_line.tax_rate, 0), v_line_net);
  end loop;

  update public.quotes set subtotal = v_subtotal, tax_total = v_tax_total, total = v_subtotal + v_tax_total where id = v_quote_id;
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload)
  values (v_org, auth.uid(), 'quote', v_quote_id, 'created', jsonb_build_object('number', v_number));
  return v_quote_id;
end;
$$;

create or replace function public.convert_quote_to_order(p_quote_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.quotes%rowtype;
  v_order_id uuid;
  v_number text;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote not found'; end if;
  if not private.can_manage_org(v_quote.organization_id) then raise exception 'not authorized'; end if;
  select id into v_order_id from public.orders where source_quote_id = p_quote_id;
  if found then return v_order_id; end if;
  if v_quote.status in ('rejected', 'expired') then raise exception 'quote cannot be converted'; end if;

  v_order_id := gen_random_uuid();
  v_number := public.next_document_number(v_quote.organization_id, 'order');
  insert into public.orders (id, organization_id, customer_id, source_quote_id, number, status, customer_name_snapshot, customer_address_snapshot, notes, total, created_by)
  values (v_order_id, v_quote.organization_id, v_quote.customer_id, v_quote.id, v_number, 'pending', v_quote.customer_name_snapshot, v_quote.customer_address_snapshot, v_quote.notes, v_quote.total, auth.uid());
  insert into public.order_lines (order_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total)
  select v_order_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total from public.quote_lines where quote_id = p_quote_id;
  update public.quotes set status = 'converted' where id = p_quote_id;
  insert into public.order_events (order_id, actor_id, event_type, payload) values (v_order_id, auth.uid(), 'created_from_quote', jsonb_build_object('quote_id', p_quote_id, 'quote_number', v_quote.number));
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload) values (v_quote.organization_id, auth.uid(), 'order', v_order_id, 'created_from_quote', jsonb_build_object('quote_id', p_quote_id, 'number', v_number));
  return v_order_id;
end;
$$;

create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status, p_reason text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_role public.app_role;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  select role into v_role from public.organization_memberships where organization_id = v_order.organization_id and user_id = auth.uid();
  if v_role not in ('administrator', 'administrative') then raise exception 'not authorized'; end if;
  if v_order.status = 'delivered' and p_status <> 'delivered' and v_role <> 'administrator' then raise exception 'only administrators can reopen delivered orders'; end if;
  if v_order.status = p_status then return p_order_id; end if;
  update public.orders set status = p_status, delivered_at = case when p_status = 'delivered' then now() else null end where id = p_order_id;
  insert into public.order_events (order_id, actor_id, event_type, payload) values (p_order_id, auth.uid(), 'status_changed', jsonb_build_object('from', v_order.status, 'to', p_status, 'reason', nullif(p_reason, '')));
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload) values (v_order.organization_id, auth.uid(), 'order', p_order_id, 'status_changed', jsonb_build_object('from', v_order.status, 'to', p_status));
  return p_order_id;
end;
$$;

create or replace function public.duplicate_order(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_source public.orders%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_number text;
begin
  select * into v_source from public.orders where id = p_order_id;
  if not found then raise exception 'order not found'; end if;
  if not private.can_manage_org(v_source.organization_id) then raise exception 'not authorized'; end if;
  v_number := public.next_document_number(v_source.organization_id, 'order');
  insert into public.orders (id, organization_id, customer_id, sales_rep_id, number, status, customer_name_snapshot, customer_address_snapshot, notes, total, created_by)
  values (v_order_id, v_source.organization_id, v_source.customer_id, v_source.sales_rep_id, v_number, 'pending', v_source.customer_name_snapshot, v_source.customer_address_snapshot, v_source.notes, v_source.total, auth.uid());
  insert into public.order_lines (order_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total)
  select v_order_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total from public.order_lines where order_id = p_order_id;
  insert into public.order_events (order_id, actor_id, event_type, payload) values (v_order_id, auth.uid(), 'duplicated', jsonb_build_object('source_order_id', p_order_id, 'source_number', v_source.number));
  return v_order_id;
end;
$$;

revoke all on function public.create_quote(uuid, text, numeric, jsonb), public.convert_quote_to_order(uuid), public.set_order_status(uuid, public.order_status, text), public.duplicate_order(uuid) from public;
grant execute on function public.create_quote(uuid, text, numeric, jsonb), public.convert_quote_to_order(uuid), public.set_order_status(uuid, public.order_status, text), public.duplicate_order(uuid) to authenticated;
