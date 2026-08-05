create table public.import_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type = 'customer'),
  status text not null default 'pending' check (status in ('pending', 'created', 'skipped')),
  payload jsonb not null,
  reason text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz
);
create index import_reviews_org_status_created_idx on public.import_reviews(organization_id, status, created_at desc);
alter table public.import_reviews enable row level security;
create policy "import reviews read" on public.import_reviews for select to authenticated using ((select private.can_manage_org(organization_id)));
create policy "import reviews manage" on public.import_reviews for all to authenticated using ((select private.can_manage_org(organization_id))) with check ((select private.can_manage_org(organization_id)));
