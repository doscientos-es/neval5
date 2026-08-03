-- Creates a safe application profile whenever an invited Auth user is confirmed.
create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Usuario'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into public.profiles (id, full_name)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(email, '@', 1), ''), 'Usuario')
from auth.users
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_auth_user();

create or replace function private.shares_organization(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.organization_memberships mine
    join public.organization_memberships theirs using (organization_id)
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user
  );
$$;
revoke all on function private.shares_organization(uuid) from public;
grant execute on function private.shares_organization(uuid) to authenticated;

create policy "members read colleague profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.shares_organization(id)));

create policy "admins update colleague profiles"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.organization_memberships m
    where m.user_id = profiles.id and (select private.can_manage_org(m.organization_id))
  ))
  with check (id = (select auth.uid()) or exists (
    select 1 from public.organization_memberships m
    where m.user_id = profiles.id and (select private.can_manage_org(m.organization_id))
  ));
