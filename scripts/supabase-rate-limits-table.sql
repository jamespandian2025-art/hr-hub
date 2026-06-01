create table if not exists public.rate_limits (
  key text primary key,
  scope text not null,
  identifier_hash text not null,
  count integer not null default 0 check (count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limits_scope_updated_at_idx
on public.rate_limits (scope, updated_at desc);

create index if not exists rate_limits_blocked_until_idx
on public.rate_limits (blocked_until)
where blocked_until is not null;

alter table public.rate_limits enable row level security;

create or replace function public.record_rate_limit_hit(
  input_scope text,
  input_identifier text,
  input_limit integer,
  input_window_seconds integer,
  input_block_seconds integer,
  input_mode text default 'hit'
)
returns table(
  allowed boolean,
  blocked boolean,
  remaining integer,
  retry_after_seconds integer,
  count integer
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  normalized_scope text := lower(trim(coalesce(input_scope, 'default')));
  normalized_identifier text := lower(trim(coalesce(input_identifier, 'anonymous')));
  limiter_key text := normalized_scope || ':' || md5(normalized_identifier);
  now_at timestamptz := now();
  row_record public.rate_limits%rowtype;
  next_count integer := 0;
  next_blocked_until timestamptz := null;
begin
  if input_limit < 1 or input_window_seconds < 1 or input_block_seconds < 1 then
    raise exception 'Invalid rate limit policy.';
  end if;

  perform pg_advisory_xact_lock(hashtext(normalized_scope), hashtext(normalized_identifier));

  select *
    into row_record
    from public.rate_limits
    where key = limiter_key
    for update;

  if input_mode = 'reset' then
    delete from public.rate_limits where key = limiter_key;
    allowed := true;
    blocked := false;
    remaining := input_limit;
    retry_after_seconds := 0;
    count := 0;
    return next;
    return;
  end if;

  if not found then
    insert into public.rate_limits (
      key,
      scope,
      identifier_hash,
      count,
      window_started_at,
      blocked_until,
      updated_at
    )
    values (
      limiter_key,
      normalized_scope,
      md5(normalized_identifier),
      0,
      now_at,
      null,
      now_at
    )
    returning * into row_record;
  end if;

  if row_record.blocked_until is not null and row_record.blocked_until > now_at then
    allowed := false;
    blocked := true;
    remaining := 0;
    retry_after_seconds := greatest(1, ceil(extract(epoch from (row_record.blocked_until - now_at)))::integer);
    count := row_record.count;
    return next;
    return;
  end if;

  if row_record.window_started_at < now_at - make_interval(secs => input_window_seconds) then
    row_record.count := 0;
    row_record.window_started_at := now_at;
    row_record.blocked_until := null;
  end if;

  if input_mode = 'check' then
    update public.rate_limits
      set count = row_record.count,
          window_started_at = row_record.window_started_at,
          blocked_until = row_record.blocked_until,
          updated_at = now_at
      where key = limiter_key;

    allowed := true;
    blocked := false;
    remaining := greatest(0, input_limit - row_record.count);
    retry_after_seconds := 0;
    count := row_record.count;
    return next;
    return;
  end if;

  if input_mode <> 'hit' then
    raise exception 'Invalid rate limit mode.';
  end if;

  next_count := row_record.count + 1;
  next_blocked_until := case
    when next_count > input_limit then now_at + make_interval(secs => input_block_seconds)
    else null
  end;

  update public.rate_limits
    set count = next_count,
        window_started_at = row_record.window_started_at,
        blocked_until = next_blocked_until,
        updated_at = now_at
    where key = limiter_key;

  allowed := next_blocked_until is null;
  blocked := next_blocked_until is not null;
  remaining := greatest(0, input_limit - next_count);
  retry_after_seconds := case
    when next_blocked_until is null then 0
    else greatest(1, ceil(extract(epoch from (next_blocked_until - now_at)))::integer)
  end;
  count := next_count;
  return next;
end;
$$;

revoke all on function public.record_rate_limit_hit(text, text, integer, integer, integer, text) from public;
grant execute on function public.record_rate_limit_hit(text, text, integer, integer, integer, text) to service_role;
