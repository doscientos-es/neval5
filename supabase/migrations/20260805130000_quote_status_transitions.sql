create or replace function public.set_quote_status(p_quote_id uuid, p_status public.quote_status)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_quote public.quotes%rowtype;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote not found'; end if;
  if not private.can_manage_org(v_quote.organization_id) then raise exception 'not authorized'; end if;
  if v_quote.status = 'converted' then raise exception 'converted quote is immutable'; end if;
  if p_status = 'converted' then raise exception 'use conversion operation'; end if;
  if v_quote.status = p_status then return p_quote_id; end if;
  update public.quotes set status = p_status where id = p_quote_id;
  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload)
  values (v_quote.organization_id, auth.uid(), 'quote', p_quote_id, 'status_changed', jsonb_build_object('from', v_quote.status, 'to', p_status));
  return p_quote_id;
end;
$$;
revoke all on function public.set_quote_status(uuid, public.quote_status) from public;
grant execute on function public.set_quote_status(uuid, public.quote_status) to authenticated;
revoke execute on function public.set_quote_status(uuid, public.quote_status) from anon;
