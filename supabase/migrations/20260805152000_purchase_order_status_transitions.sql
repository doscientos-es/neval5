create or replace function public.set_purchase_order_status(
  p_purchase_order_id uuid,
  p_status public.purchase_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.purchase_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  select * into v_order from public.purchase_orders where id = p_purchase_order_id for update;
  if not found or not private.can_manage_org(v_order.organization_id) then raise exception 'not authorized'; end if;
  if v_order.status = p_status then return p_purchase_order_id; end if;

  if p_status = 'requested' and v_order.status <> 'draft' then raise exception 'only draft purchase orders can be requested'; end if;
  if p_status = 'cancelled' and v_order.status not in ('draft', 'requested', 'partially_received') then raise exception 'purchase order cannot be cancelled'; end if;
  if p_status not in ('requested', 'cancelled') then raise exception 'invalid manual purchase status'; end if;

  update public.purchase_orders set status = p_status where id = p_purchase_order_id;
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload)
  values (v_order.organization_id, auth.uid(), 'purchase_order', p_purchase_order_id, 'status_changed', jsonb_build_object('from', v_order.status, 'to', p_status));
  return p_purchase_order_id;
end;
$$;

revoke all on function public.set_purchase_order_status(uuid, public.purchase_status) from public, anon;
grant execute on function public.set_purchase_order_status(uuid, public.purchase_status) to authenticated;
