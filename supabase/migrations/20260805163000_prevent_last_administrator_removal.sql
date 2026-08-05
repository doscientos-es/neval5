-- Every organisation must retain at least one administrator.
create or replace function private.prevent_last_administrator_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'administrator'
    and (tg_op = 'DELETE' or new.role <> 'administrator')
    and not exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = old.organization_id
        and membership.user_id <> old.user_id
        and membership.role = 'administrator'
    ) then
    raise exception 'an organization must retain an administrator';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.prevent_last_administrator_removal() from public;

drop trigger if exists organization_memberships_keep_administrator on public.organization_memberships;
create trigger organization_memberships_keep_administrator
before update of role or delete on public.organization_memberships
for each row execute function private.prevent_last_administrator_removal();
