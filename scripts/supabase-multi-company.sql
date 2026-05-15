-- WiseFlow multi-company tenancy foundation.
-- Run this before wiring production Supabase data sources to company workspaces.

create table if not exists public.companies (
  id text primary key,
  name text not null,
  type text not null default 'Operating Company',
  owner_user_id uuid references auth.users(id) on delete set null,
  settings jsonb not null default '{"currency":"USD","timezone":"UTC","fiscalYearStart":"January"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'Member',
  permissions text[] not null default array['dashboard'],
  status text not null default 'Pending',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique(company_id, email)
);

create index if not exists company_members_company_id_idx on public.company_members(company_id);
create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists company_members_email_idx on public.company_members(lower(email));

alter table if exists public.clients add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.sales_orders add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.sales add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.projects add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.employees add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.payroll add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.invoices add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.documents add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.workflows add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.suppliers add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.warehouse_inventory add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.reports add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.settings add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.user_roles add column if not exists company_id text references public.companies(id) on delete cascade;
alter table if exists public.permissions add column if not exists company_id text references public.companies(id) on delete cascade;

create or replace function public.is_company_member(target_company_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members member
    where member.company_id = target_company_id
      and member.status = 'Active'
      and (
        member.user_id = auth.uid()
        or lower(member.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table if exists public.clients enable row level security;
alter table if exists public.sales_orders enable row level security;

drop policy if exists "Company members can read companies" on public.companies;
create policy "Company members can read companies"
on public.companies for select
using (public.is_company_member(id));

drop policy if exists "Company admins can manage members" on public.company_members;
create policy "Company admins can manage members"
on public.company_members for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "Company members can read clients" on public.clients;
create policy "Company members can read clients"
on public.clients for select
using (public.is_company_member(company_id));

drop policy if exists "Company members can write clients" on public.clients;
create policy "Company members can write clients"
on public.clients for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "Company members can read sales orders" on public.sales_orders;
create policy "Company members can read sales orders"
on public.sales_orders for select
using (public.is_company_member(company_id));

drop policy if exists "Company members can write sales orders" on public.sales_orders;
create policy "Company members can write sales orders"
on public.sales_orders for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));
