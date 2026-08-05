-- Cover foreign keys used by receipt history and duplicate-import review queries.
create index if not exists import_reviews_created_by_idx on public.import_reviews (created_by);
create index if not exists import_reviews_resolved_by_idx on public.import_reviews (resolved_by);
create index if not exists purchase_receipt_lines_purchase_order_line_id_idx on public.purchase_receipt_lines (purchase_order_line_id);
create index if not exists purchase_receipts_created_by_idx on public.purchase_receipts (created_by);
create index if not exists purchase_receipts_organization_id_idx on public.purchase_receipts (organization_id);
