-- Explicitly deny unauthenticated RPC access. PUBLIC grants are not sufficient
-- when a role has previously received a direct privilege.
revoke execute on function public.create_quote(uuid, text, numeric, jsonb), public.convert_quote_to_order(uuid), public.set_order_status(uuid, public.order_status, text), public.duplicate_order(uuid) from anon;
