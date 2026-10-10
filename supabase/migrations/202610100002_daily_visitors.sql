create table if not exists public.daily_site_visits (
  visit_date date primary key,
  visitor_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.daily_site_visits enable row level security;
revoke all on table public.daily_site_visits from public, anon, authenticated;
grant select, insert, update on table public.daily_site_visits to service_role;

create or replace function public.record_daily_site_visit()
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.daily_site_visits (visit_date, visitor_count, updated_at)
  values ((now() at time zone 'Asia/Jakarta')::date, 1, now())
  on conflict (visit_date) do update
    set visitor_count = public.daily_site_visits.visitor_count + 1,
        updated_at = now();
$$;

revoke all on function public.record_daily_site_visit() from public, anon, authenticated;
grant execute on function public.record_daily_site_visit() to service_role;
