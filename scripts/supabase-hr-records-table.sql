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
