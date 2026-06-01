create table if not exists public.clients (
  id text primary key,
  company_id text,
  name text not null,
  company text,
  email text not null,
  phone text not null,
  website text,
  industry text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  company_size text,
  company_type text,
  annual_revenue text,
  tax_id text,
  billing_address text,
  account_manager text,
  account_manager_avatar text,
  default_currency text default 'PHP - Philippine Peso',
  payment_terms text,
  tags jsonb not null default '[]'::jsonb,
  description text,
  created_at date not null default current_date,
  last_contact text,
  total_projects integer not null default 0,
  active_projects integer not null default 0,
  completed_projects integer not null default 0,
  on_hold_projects integer not null default 0,
  total_revenue numeric not null default 0,
  paid_revenue numeric not null default 0,
  outstanding_revenue numeric not null default 0,
  invoices jsonb not null default '{"total":0,"paid":0,"unpaid":0,"overdue":0}'::jsonb,
  contracts integer not null default 0,
  documents integer not null default 0,
  contacts jsonb not null default '[]'::jsonb,
  activities jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients
  add column if not exists company_id text;

create index if not exists clients_company_id_created_at_idx
  on public.clients (company_id, created_at desc);

alter table public.clients enable row level security;

drop policy if exists "Allow authenticated users to read clients" on public.clients;
drop policy if exists "Allow authenticated users to write clients" on public.clients;
drop policy if exists "Allow authenticated users to update clients" on public.clients;
drop policy if exists "Company members can read clients" on public.clients;
drop policy if exists "Company members can insert clients" on public.clients;
drop policy if exists "Company members can update clients" on public.clients;
drop policy if exists "Company members can delete clients" on public.clients;

-- Requires scripts/supabase-multi-company.sql so public.is_company_member(company_id)
-- is available before these tenant-scoped policies are applied.
create policy "Company members can read clients"
  on public.clients for select
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));

create policy "Company members can insert clients"
  on public.clients for insert
  to authenticated
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can update clients"
  on public.clients for update
  to authenticated
  using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can delete clients"
  on public.clients for delete
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

drop trigger if exists clients_set_updated_at on public.clients;

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();
