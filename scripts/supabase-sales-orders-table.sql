create table if not exists public.sales_orders (
  id text primary key,
  company_id text,
  customer text not null,
  title text,
  order_date date not null default current_date,
  amount numeric not null default 0,
  status text not null default 'Draft' check (status in ('Confirmed', 'Processing', 'Shipped', 'Cancelled', 'Draft')),
  sales_rep text not null,
  category text not null,
  stage text not null default 'Lead' check (stage in ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_orders
  add column if not exists company_id text;

create index if not exists sales_orders_company_id_created_at_idx
  on public.sales_orders (company_id, created_at desc);

alter table public.sales_orders enable row level security;

drop policy if exists "Allow authenticated users to read sales orders" on public.sales_orders;
drop policy if exists "Allow authenticated users to write sales orders" on public.sales_orders;
drop policy if exists "Allow authenticated users to update sales orders" on public.sales_orders;
drop policy if exists "Company members can read sales orders" on public.sales_orders;
drop policy if exists "Company members can insert sales orders" on public.sales_orders;
drop policy if exists "Company members can update sales orders" on public.sales_orders;
drop policy if exists "Company members can delete sales orders" on public.sales_orders;

-- Requires scripts/supabase-multi-company.sql so public.is_company_member(company_id)
-- is available before these tenant-scoped policies are applied.
create policy "Company members can read sales orders"
  on public.sales_orders for select
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));

create policy "Company members can insert sales orders"
  on public.sales_orders for insert
  to authenticated
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can update sales orders"
  on public.sales_orders for update
  to authenticated
  using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

create policy "Company members can delete sales orders"
  on public.sales_orders for delete
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

drop trigger if exists sales_orders_set_updated_at on public.sales_orders;

create trigger sales_orders_set_updated_at
before update on public.sales_orders
for each row
execute function public.set_updated_at();
