create or replace function public.update_order_notes(p_order_id uuid, p_notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not private.can_manage_org(v_order.organization_id) then raise exception 'not authorized'; end if;
  if v_order.status = 'delivered' then raise exception 'delivered orders are locked'; end if;
  update public.orders set notes = nullif(trim(coalesce(p_notes, '')), '') where id = p_order_id;
  insert into public.order_events(order_id, actor_id, event_type, payload) values (p_order_id, auth.uid(), 'notes_updated', '{}'::jsonb);
  insert into public.audit_events(organization_id, actor_id, entity_type, entity_id, action) values (v_order.organization_id, auth.uid(), 'order', p_order_id, 'notes_updated');
  return p_order_id;
end;
$$;
revoke all on function public.update_order_notes(uuid, text) from public, anon;
grant execute on function public.update_order_notes(uuid, text) to authenticated;
