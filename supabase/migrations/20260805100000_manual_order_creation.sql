create or replace function public.create_order(p_customer_id uuid, p_notes text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_customer record; v_order_id uuid := gen_random_uuid(); v_number text; v_line record; v_total numeric(14,2) := 0;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'at least one order line is required'; end if;
  select c.organization_id, c.name, c.company, c.address, c.city, c.province into v_customer from public.customers c where c.id = p_customer_id and c.archived_at is null;
  if not found then raise exception 'customer not found'; end if;
  if not private.can_manage_org(v_customer.organization_id) then raise exception 'not authorized'; end if;
  v_number := public.next_document_number(v_customer.organization_id, 'order');
  insert into public.orders(id, organization_id, customer_id, number, status, customer_name_snapshot, customer_address_snapshot, notes, total, created_by)
  values(v_order_id, v_customer.organization_id, p_customer_id, v_number, 'pending', coalesce(v_customer.company, v_customer.name), concat_ws(', ', v_customer.address, v_customer.city, v_customer.province), nullif(p_notes, ''), 0, auth.uid());
  for v_line in select * from jsonb_to_recordset(p_lines) as x(product_id uuid, description text, quantity numeric, unit text, unit_price numeric, discount_pct numeric, tax_rate numeric) loop
    if coalesce(v_line.description, '') = '' or coalesce(v_line.quantity, 0) <= 0 or coalesce(v_line.unit_price, -1) < 0 or coalesce(v_line.discount_pct, 0) < 0 or coalesce(v_line.discount_pct, 0) > 100 or coalesce(v_line.tax_rate, 0) < 0 or coalesce(v_line.tax_rate, 0) > 100 then raise exception 'invalid order line'; end if;
    if v_line.product_id is not null and not exists (select 1 from public.products p where p.id = v_line.product_id and p.organization_id = v_customer.organization_id and p.archived_at is null) then raise exception 'invalid product'; end if;
    v_total := v_total + round(v_line.quantity * v_line.unit_price * (1 - coalesce(v_line.discount_pct, 0) / 100) * (1 + coalesce(v_line.tax_rate, 0) / 100), 2);
    insert into public.order_lines(order_id, product_id, description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total) values(v_order_id, v_line.product_id, v_line.description, v_line.quantity, coalesce(nullif(v_line.unit, ''), 'ud'), v_line.unit_price, coalesce(v_line.discount_pct, 0), coalesce(v_line.tax_rate, 0), round(v_line.quantity * v_line.unit_price * (1 - coalesce(v_line.discount_pct, 0) / 100), 2));
  end loop;
  update public.orders set total = v_total where id = v_order_id;
  insert into public.order_events(order_id, actor_id, event_type, payload) values(v_order_id, auth.uid(), 'created_manually', '{}'::jsonb);
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action, payload) values(v_customer.organization_id, auth.uid(), 'order', v_order_id, 'created_manually', jsonb_build_object('number', v_number));
  return v_order_id;
end;
$$;
revoke all on function public.create_order(uuid, text, jsonb) from public, anon;
grant execute on function public.create_order(uuid, text, jsonb) to authenticated;
