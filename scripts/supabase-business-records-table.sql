create table if not exists public.business_records (
  company_id text not null,
  collection text not null,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, collection, id)
);

create index if not exists business_records_company_collection_idx
on public.business_records (company_id, collection, created_at desc);

alter table public.business_records enable row level security;

drop policy if exists "Company members can read business records" on public.business_records;
drop policy if exists "Company members can insert business records" on public.business_records;
drop policy if exists "Company members can update business records" on public.business_records;
drop policy if exists "Company members can delete business records" on public.business_records;

-- Requires scripts/supabase-multi-company.sql so public.is_company_member(company_id)
-- is available before these tenant-scoped policies are applied.
create policy "Company members can read business records"
  on public.business_records for select
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));

create policy "Company members can insert business records"
  on public.business_records for insert
  to authenticated
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can update business records"
  on public.business_records for update
  to authenticated
  using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can delete business records"
  on public.business_records for delete
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_records_set_updated_at on public.business_records;

create trigger business_records_set_updated_at
before update on public.business_records
for each row
execute function public.set_updated_at();
