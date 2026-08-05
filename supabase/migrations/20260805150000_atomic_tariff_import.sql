-- An imported tariff is all-or-nothing: validation, list creation and prices
-- run in the same transaction invoked by the authenticated manager.
create or replace function public.import_tariff_items(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_item record;
  v_list_id uuid;
  v_product_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one tariff item is required';
  end if;

  select organization_id into v_org
  from public.organization_memberships
  where user_id = auth.uid()
  limit 1;
  if v_org is null or not private.can_manage_org(v_org) then raise exception 'not authorized'; end if;

  for v_item in select * from jsonb_to_recordset(p_items) as x(
    tariff text, product_code text, unit_price numeric
  ) loop
    if coalesce(trim(v_item.tariff), '') = '' or coalesce(trim(v_item.product_code), '') = '' or v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'invalid tariff item';
    end if;

    select id into v_product_id
    from public.products
    where organization_id = v_org and lower(code) = lower(trim(v_item.product_code)) and archived_at is null;
    if v_product_id is null then raise exception 'product not found'; end if;

    insert into public.price_lists (organization_id, name)
    values (v_org, trim(v_item.tariff))
    on conflict (organization_id, name) do update set archived_at = null
    returning id into v_list_id;

    insert into public.price_list_items (price_list_id, product_id, unit_price)
    values (v_list_id, v_product_id, v_item.unit_price)
    on conflict (price_list_id, product_id) do update set unit_price = excluded.unit_price;
    v_count := v_count + 1;
  end loop;

  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, payload)
  values (v_org, auth.uid(), 'tariff_import', v_org, 'imported', jsonb_build_object('items', v_count));
  return v_count;
end;
$$;

revoke all on function public.import_tariff_items(jsonb) from public, anon;
grant execute on function public.import_tariff_items(jsonb) to authenticated;
