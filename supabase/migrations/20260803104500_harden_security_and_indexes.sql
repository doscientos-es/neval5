-- Security hardening and foreign-key indexes identified during production review.
revoke execute on function public.next_document_number(uuid, text) from anon;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Document sequences are only reachable through the authorized RPC above.
create policy "no direct sequence access"
  on public.document_sequences
  for all
  to authenticated
  using (false)
  with check (false);

create index attachments_organization_id_idx on public.attachments(organization_id);
create index attachments_created_by_idx on public.attachments(created_by);
create index audit_events_actor_id_idx on public.audit_events(actor_id);
create index order_events_actor_id_idx on public.order_events(actor_id);
create index order_lines_product_id_idx on public.order_lines(product_id);
create index orders_sales_rep_id_idx on public.orders(sales_rep_id);
create index orders_created_by_idx on public.orders(created_by);
create index price_list_items_product_id_idx on public.price_list_items(product_id);
create index products_default_tax_rate_id_idx on public.products(default_tax_rate_id);
create index purchase_order_lines_product_id_idx on public.purchase_order_lines(product_id);
create index purchase_orders_supplier_id_idx on public.purchase_orders(supplier_id);
create index quote_lines_product_id_idx on public.quote_lines(product_id);
create index quotes_created_by_idx on public.quotes(created_by);
create index stock_movements_created_by_idx on public.stock_movements(created_by);
