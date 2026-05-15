create table if not exists public.sales_orders (
  id text primary key,
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

alter table public.sales_orders enable row level security;

create policy "Allow authenticated users to read sales orders"
  on public.sales_orders for select
  to authenticated
  using (true);

create policy "Allow authenticated users to write sales orders"
  on public.sales_orders for insert
  to authenticated
  with check (true);

create policy "Allow authenticated users to update sales orders"
  on public.sales_orders for update
  to authenticated
  using (true)
  with check (true);

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
