-- Run in Supabase SQL editor. This prototype exposes read-only public observation data.
create table if not exists public.fire_observations (
 id bigint generated always as identity primary key,
 source_key text not null unique,
 sensor text not null check(sensor in ('MODIS','VIIRS')),
 satellite text,
 instrument text,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 acq_date date not null,
 acq_time text,
 frp double precision,
 confidence text,
 brightness double precision,
 bright_t31 double precision,
 scan double precision,
 track double precision,
 daynight text,
 version text,
 source_file text not null
);
create index if not exists fire_observations_date_idx on public.fire_observations(acq_date desc);
create index if not exists fire_observations_sensor_date_idx on public.fire_observations(sensor,acq_date desc);
alter table public.fire_observations enable row level security;
drop policy if exists "Public read fire observations" on public.fire_observations;
create policy "Public read fire observations" on public.fire_observations for select to anon, authenticated using (true);
create or replace function public.daily_fire_counts(date_from date,date_to date,sensor_filter text default null)
returns table(day date,observations bigint) language sql stable security invoker set search_path = '' as $$
 select f.acq_date as day,count(*)::bigint as observations
 from public.fire_observations f
 where f.acq_date between date_from and date_to and (sensor_filter is null or f.sensor=sensor_filter)
 group by f.acq_date order by f.acq_date;
$$;
grant execute on function public.daily_fire_counts(date,date,text) to anon,authenticated;
