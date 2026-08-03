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
