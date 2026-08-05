-- Company settings and membership changes are administrator-only. Operational
-- staff keep their existing commercial and warehouse permissions.
create or replace function private.is_org_administrator(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_org
      and user_id = (select auth.uid())
      and role = 'administrator'
  );
$$;

revoke all on function private.is_org_administrator(uuid) from public;
grant execute on function private.is_org_administrator(uuid) to authenticated;

drop policy if exists "admins manage memberships" on public.organization_memberships;
create policy "administrators manage memberships"
  on public.organization_memberships for all to authenticated
  using ((select private.is_org_administrator(organization_id)))
  with check ((select private.is_org_administrator(organization_id)));

create policy "administrators update organizations"
  on public.organizations for update to authenticated
  using ((select private.is_org_administrator(id)))
  with check ((select private.is_org_administrator(id)));
