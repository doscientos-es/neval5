-- Production, cutting and CNC roles are operational viewers: orders and stock only.
-- Master/commercial/procurement records remain readable exclusively by managers.
drop policy if exists "customers read" on public.customers;
drop policy if exists "families read" on public.product_families;
drop policy if exists "tax read" on public.tax_rates;
drop policy if exists "prices read" on public.price_lists;
drop policy if exists "quotes read" on public.quotes;
drop policy if exists "suppliers read" on public.suppliers;
drop policy if exists "purchases read" on public.purchase_orders;
drop policy if exists "attachments read" on public.attachments;
drop policy if exists "price items read" on public.price_list_items;
drop policy if exists "quote lines read" on public.quote_lines;
drop policy if exists "purchase lines read" on public.purchase_order_lines;

drop policy if exists "products manage" on public.products;
create policy "products insert manage" on public.products for insert to authenticated with check ((select private.can_manage_org(organization_id)));
create policy "products update manage" on public.products for update to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "products delete manage" on public.products for delete to authenticated using ((select private.can_manage_org(organization_id)));

drop policy if exists "orders manage" on public.orders;
create policy "orders insert manage" on public.orders for insert to authenticated with check ((select private.can_manage_org(organization_id)));
create policy "orders update manage" on public.orders for update to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "orders delete manage" on public.orders for delete to authenticated using ((select private.can_manage_org(organization_id)));

drop policy if exists "stock manage" on public.stock_movements;
create policy "stock insert manage" on public.stock_movements for insert to authenticated with check ((select private.can_manage_org(organization_id)));
create policy "stock update manage" on public.stock_movements for update to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
create policy "stock delete manage" on public.stock_movements for delete to authenticated using ((select private.can_manage_org(organization_id)));

drop policy if exists "tenant reads files" on storage.objects;
create policy "managers read files" on storage.objects for select to authenticated using (bucket_id = 'neval-files' and (select private.can_manage_org((storage.foldername(name))[1]::uuid)));
