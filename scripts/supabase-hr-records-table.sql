create table if not exists public.hr_records (
  id text primary key,
  collection text not null,
  payload jsonb not null default '{}'::jsonb,
  company_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_records_collection_idx
on public.hr_records (collection);

create index if not exists hr_records_company_collection_idx
on public.hr_records (company_id, collection);

alter table public.hr_records enable row level security;

drop policy if exists "Company members can read HR records" on public.hr_records;
drop policy if exists "Company members can insert HR records" on public.hr_records;
drop policy if exists "Company members can update HR records" on public.hr_records;
drop policy if exists "Company members can delete HR records" on public.hr_records;

-- Requires scripts/supabase-multi-company.sql so public.is_company_member(company_id)
-- is available before these tenant-scoped policies are applied.
create policy "Company members can read HR records"
  on public.hr_records for select
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));

create policy "Company members can insert HR records"
  on public.hr_records for insert
  to authenticated
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can update HR records"
  on public.hr_records for update
  to authenticated
  using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can delete HR records"
  on public.hr_records for delete
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));
