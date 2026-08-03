-- Idempotent purchasing, partial receipts and append-only stock movements.
create table public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  idempotency_key uuid not null unique,
  received_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);
create table public.purchase_receipt_lines (
  receipt_id uuid not null references public.purchase_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines(id),
  quantity numeric(14,3) not null check (quantity > 0),
  primary key (receipt_id, purchase_order_line_id)
);
create index purchase_receipts_order_created_idx on public.purchase_receipts(purchase_order_id, received_at desc);
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_lines enable row level security;
create policy "receipts read" on public.purchase_receipts for select to authenticated using ((select private.is_org_member(organization_id)));
create policy "receipt lines read" on public.purchase_receipt_lines for select to authenticated using (exists (select 1 from public.purchase_receipts r where r.id = receipt_id and (select private.is_org_member(r.organization_id))));

drop policy "stock manage" on public.stock_movements;
create policy "stock append" on public.stock_movements for insert to authenticated with check ((select private.can_manage_org(organization_id)));

create or replace function public.create_purchase_order(p_supplier_id uuid, p_notes text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_supplier public.suppliers%rowtype; v_order_id uuid := gen_random_uuid(); v_number text; v_line record; v_total numeric(14,2) := 0;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'at least one purchase line is required'; end if;
  select * into v_supplier from public.suppliers where id = p_supplier_id and archived_at is null;
  if not found then raise exception 'supplier not found'; end if;
  if not private.can_manage_org(v_supplier.organization_id) then raise exception 'not authorized'; end if;
  v_number := public.next_document_number(v_supplier.organization_id, 'purchase');
  insert into public.purchase_orders(id, organization_id, supplier_id, number, status, notes, total) values(v_order_id, v_supplier.organization_id, p_supplier_id, v_number, 'draft', nullif(p_notes, ''), 0);
  for v_line in select * from jsonb_to_recordset(p_lines) as x(product_id uuid, quantity numeric, unit_price numeric) loop
    if coalesce(v_line.quantity, 0) <= 0 or coalesce(v_line.unit_price, -1) < 0 then raise exception 'invalid purchase line'; end if;
    if not exists (select 1 from public.products p where p.id = v_line.product_id and p.organization_id = v_supplier.organization_id and p.archived_at is null) then raise exception 'invalid product'; end if;
    insert into public.purchase_order_lines(purchase_order_id, product_id, quantity, unit_price) values(v_order_id, v_line.product_id, v_line.quantity, v_line.unit_price);
    v_total := v_total + round(v_line.quantity * v_line.unit_price, 2);
  end loop;
  update public.purchase_orders set total = v_total where id = v_order_id;
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action, payload) values(v_supplier.organization_id, auth.uid(), 'purchase_order', v_order_id, 'created', jsonb_build_object('number', v_number));
  return v_order_id;
end;
$$;

create or replace function public.receive_purchase_order(p_purchase_order_id uuid, p_idempotency_key uuid, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order public.purchase_orders%rowtype; v_receipt_id uuid := gen_random_uuid(); v_existing uuid; v_line record; v_db_line public.purchase_order_lines%rowtype; v_all_received boolean;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'at least one receipt line is required'; end if;
  select id into v_existing from public.purchase_receipts where idempotency_key = p_idempotency_key;
  if found then return v_existing; end if;
  select * into v_order from public.purchase_orders where id = p_purchase_order_id for update;
  if not found then raise exception 'purchase order not found'; end if;
  if not private.can_manage_org(v_order.organization_id) then raise exception 'not authorized'; end if;
  if v_order.status = 'cancelled' then raise exception 'cancelled purchase order cannot be received'; end if;
  insert into public.purchase_receipts(id, organization_id, purchase_order_id, idempotency_key, created_by) values(v_receipt_id, v_order.organization_id, p_purchase_order_id, p_idempotency_key, auth.uid());
  for v_line in select * from jsonb_to_recordset(p_lines) as x(purchase_order_line_id uuid, quantity numeric) loop
    select * into v_db_line from public.purchase_order_lines where id = v_line.purchase_order_line_id and purchase_order_id = p_purchase_order_id for update;
    if not found or coalesce(v_line.quantity, 0) <= 0 or v_line.quantity > v_db_line.quantity - v_db_line.received_quantity then raise exception 'invalid receipt quantity'; end if;
    insert into public.purchase_receipt_lines(receipt_id, purchase_order_line_id, quantity) values(v_receipt_id, v_db_line.id, v_line.quantity);
    update public.purchase_order_lines set received_quantity = received_quantity + v_line.quantity where id = v_db_line.id;
    insert into public.stock_movements(organization_id, product_id, purchase_order_id, movement_type, quantity, reason, created_by) values(v_order.organization_id, v_db_line.product_id, p_purchase_order_id, 'purchase_receipt', v_line.quantity, 'Recepción ' || v_order.number, auth.uid());
  end loop;
  select bool_and(received_quantity >= quantity) into v_all_received from public.purchase_order_lines where purchase_order_id = p_purchase_order_id;
  update public.purchase_orders set status = (case when v_all_received then 'received' else 'partially_received' end)::public.purchase_status where id = p_purchase_order_id;
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action, payload) values(v_order.organization_id, auth.uid(), 'purchase_receipt', v_receipt_id, 'created', jsonb_build_object('purchase_order_id', p_purchase_order_id));
  return v_receipt_id;
end;
$$;

create or replace function public.adjust_stock(p_product_id uuid, p_quantity numeric, p_reason text, p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_product public.products%rowtype; v_movement uuid;
begin
  if p_quantity = 0 or nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'quantity and reason are required'; end if;
  select * into v_product from public.products where id = p_product_id and track_stock and archived_at is null;
  if not found then raise exception 'tracked product not found'; end if;
  if not private.can_manage_org(v_product.organization_id) then raise exception 'not authorized'; end if;
  select id into v_movement from public.stock_movements where idempotency_key = p_idempotency_key;
  if found then return v_movement; end if;
  insert into public.stock_movements(organization_id, product_id, movement_type, quantity, reason, idempotency_key, created_by) values(v_product.organization_id, p_product_id, 'adjustment', p_quantity, trim(p_reason), p_idempotency_key, auth.uid()) returning id into v_movement;
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action, payload) values(v_product.organization_id, auth.uid(), 'stock_movement', v_movement, 'adjusted', jsonb_build_object('quantity', p_quantity, 'reason', trim(p_reason)));
  return v_movement;
end;
$$;

revoke all on function public.create_purchase_order(uuid, text, jsonb), public.receive_purchase_order(uuid, uuid, jsonb), public.adjust_stock(uuid, numeric, text, uuid) from public, anon;
grant execute on function public.create_purchase_order(uuid, text, jsonb), public.receive_purchase_order(uuid, uuid, jsonb), public.adjust_stock(uuid, numeric, text, uuid) to authenticated;
