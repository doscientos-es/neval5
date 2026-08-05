-- Commercial assignment is an auditable, organisation-scoped operation.
create or replace function public.assign_order_sales_rep(
  p_order_id uuid,
  p_sales_rep_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_role public.app_role;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;

  select role into v_role
  from public.organization_memberships
  where organization_id = v_order.organization_id and user_id = auth.uid();
  if v_role not in ('administrator', 'administrative') then raise exception 'not authorized'; end if;

  if p_sales_rep_id is not null and not exists (
    select 1
    from public.organization_memberships membership
    join public.profiles profile on profile.id = membership.user_id
    where membership.organization_id = v_order.organization_id
      and membership.user_id = p_sales_rep_id
      and profile.is_sales_rep = true
  ) then
    raise exception 'invalid sales representative';
  end if;

  if v_order.sales_rep_id is not distinct from p_sales_rep_id then return p_order_id; end if;

  update public.orders set sales_rep_id = p_sales_rep_id where id = p_order_id;
  insert into public.order_events (order_id, actor_id, event_type, payload)
  values (p_order_id, auth.uid(), 'sales_rep_assigned', jsonb_build_object('from', v_order.sales_rep_id, 'to', p_sales_rep_id));
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload)
  values (v_order.organization_id, auth.uid(), 'order', p_order_id, 'sales_rep_assigned', jsonb_build_object('from', v_order.sales_rep_id, 'to', p_sales_rep_id));
  return p_order_id;
end;
$$;

revoke all on function public.assign_order_sales_rep(uuid, uuid) from public, anon;
grant execute on function public.assign_order_sales_rep(uuid, uuid) to authenticated;
