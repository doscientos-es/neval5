create or replace function public.delete_unused_customer(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
begin
  select * into v_customer from public.customers where id = p_customer_id for update;
  if not found or not private.can_manage_org(v_customer.organization_id) then raise exception 'not authorized'; end if;
  if exists (select 1 from public.orders where customer_id = p_customer_id)
    or exists (select 1 from public.quotes where customer_id = p_customer_id)
    or exists (select 1 from public.attachments where customer_id = p_customer_id) then
    raise exception 'customer has history or attachments';
  end if;
  delete from public.customers where id = p_customer_id;
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload)
  values (v_customer.organization_id, auth.uid(), 'customer', p_customer_id, 'permanently_deleted', '{}'::jsonb);
  return p_customer_id;
end;
$$;

revoke all on function public.delete_unused_customer(uuid) from public, anon;
grant execute on function public.delete_unused_customer(uuid) to authenticated;
