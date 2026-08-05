-- Stock movements are immutable ledger entries; only the receipt/adjustment
-- functions may append them through the existing "stock append" policy.
drop policy if exists "stock insert manage" on public.stock_movements;
drop policy if exists "stock update manage" on public.stock_movements;
drop policy if exists "stock delete manage" on public.stock_movements;
