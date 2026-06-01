create or replace function public.verify_wiseflow_production_setup()
returns table(check_name text, passed boolean, detail text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  required_tables text[] := array[
    'companies',
    'company_members',
    'clients',
    'sales_orders',
    'hr_records',
    'business_records',
    'rate_limits'
  ];
  required_table text;
begin
  foreach required_table in array required_tables loop
    return query
      select
        format('table %s exists', required_table),
        to_regclass(format('public.%I', required_table)) is not null,
        format('public.%s', required_table);
  end loop;

  foreach required_table in array required_tables loop
    return query
      select
        format('table %s has RLS enabled', required_table),
        coalesce((
          select relrowsecurity
          from pg_class
          where oid = to_regclass(format('public.%I', required_table))
        ), false),
        format('public.%s', required_table);
  end loop;

  return query
    select
      'tenant membership function exists',
      to_regprocedure('public.is_company_member(text)') is not null,
      'public.is_company_member(text)';

  return query
    select
      'tenant admin function exists',
      to_regprocedure('public.is_company_admin(text)') is not null,
      'public.is_company_admin(text)';

  return query
    select
      'rate limit function exists',
      to_regprocedure('public.record_rate_limit_hit(text,text,integer,integer,integer,text)') is not null,
      'public.record_rate_limit_hit(text,text,integer,integer,integer,text)';

  foreach required_table in array array['clients', 'sales_orders', 'hr_records', 'business_records'] loop
    return query
      select
        format('table %s policies require company membership', required_table),
        exists (
          select 1
          from pg_policies
          where schemaname = 'public'
            and tablename = required_table
            and (
              coalesce(qual, '') ilike '%is_company_member%'
              or coalesce(with_check, '') ilike '%is_company_member%'
            )
        ),
        format('public.%s', required_table);
  end loop;

  return query
    select
      'company member policies require admin membership',
      exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'company_members'
          and (
            coalesce(qual, '') ilike '%is_company_admin%'
            or coalesce(with_check, '') ilike '%is_company_admin%'
          )
      ),
      'public.company_members';
end;
$$;

revoke all on function public.verify_wiseflow_production_setup() from public;
grant execute on function public.verify_wiseflow_production_setup() to authenticated;
