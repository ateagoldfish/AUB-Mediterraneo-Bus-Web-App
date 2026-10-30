-- Dorm Shuttle — database setup for Supabase.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Then follow docs/SETUP.md (admin user, passcodes, tracker key).
--
-- Security model (SPEC §7, §9):
--  * Anyone can read stops, timetable and active alerts.
--  * Nobody can read the bus position directly; students get it from get_bus_position(),
--    which checks the passcode, the pause switch and service hours.
--  * Only the admin (one login, the project email) can change anything.
--  * Only the tracker (with its secret key) can report a position, via report_position().

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tables ----------

create table public.stops (
  id text primary key,
  name text not null,
  lat double precision,
  lng double precision,
  sort int not null,                       -- dorms first, campus last
  weekend_only boolean not null default false
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  days int[] not null check (cardinality(days) > 0 and days <@ array[0,1,2,3,4,5,6]),  -- 0 = Sunday
  stop_ids text[] not null check (cardinality(stop_ids) >= 2),  -- stops in the order visited
  direction text not null check (direction in ('to_campus', 'to_dorms')),  -- set from stop_ids
  times jsonb not null default '{}',       -- typed times only, e.g. { "anavargos": "08:30" }; others are estimated
  note text not null default '',
  tracked boolean not null default true    -- false = another vehicle, not on the live map
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('delay', 'cancel', 'info')),
  message text not null check (char_length(message) between 1 and 300),
  delay_min int check (delay_min between 1 and 240),
  trip_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Exactly one row of settings.
create table public.settings (
  id int primary key default 1 check (id = 1),
  admin_email text not null,
  service_hours jsonb not null default '{}',   -- { "1": { "start": "08:15", "end": "21:45" }, ... }
  margin_minutes int not null default 15,      -- live position also shown this long before/after
  paused boolean not null default false,
  paused_until timestamptz,
  student_passcode_hash text,
  device_key_hash text
);

-- Travel time between two stops (D-031). manual_min is the admin's estimate;
-- measured_avg / measured_count are a running average kept by report_position.
-- Only the average and the number of trips are stored — never individual trips.
create table public.travel_times (
  from_stop text not null references public.stops (id),
  to_stop text not null references public.stops (id),
  manual_min int check (manual_min between 1 and 180),
  measured_avg real,
  measured_count int not null default 0,
  primary key (from_stop, to_stop),
  check (from_stop <> to_stop)
);

-- Exactly one row: the latest position only, no history (D-010).
-- at_stop / last_stop / left_at are a small, constantly overwritten note used to time
-- the trip to the next stop ("left Tepak at 08:41"); they are cleared when not tracking.
create table public.bus_position (
  id int primary key default 1 check (id = 1),
  lat double precision,
  lng double precision,
  speed real,
  heading real,
  battery int,
  recorded_at timestamptz,
  at_stop text,
  last_stop text,
  left_at timestamptz
);

-- Wrong passcode attempts, kept 20 minutes, for brute-force protection (D-028).
-- "client" is the visitor's network address — shared by everyone on the same Wi-Fi.
create table public.passcode_attempts (
  client text not null,
  attempted_at timestamptz not null default now()
);
create index passcode_attempts_client on public.passcode_attempts (client, attempted_at);

-- ---------- Helpers ----------

-- True only for the logged-in admin account.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and lower(coalesce(auth.jwt() ->> 'email', '')) = (select lower(admin_email) from settings where id = 1);
$$;

-- Is the bus in service right now (Cyprus time, with the margin)?
create function public.in_service() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s settings;
  local timestamp := now() at time zone 'Europe/Nicosia';
  today jsonb;
  now_min int;
  start_min int;
  end_min int;
begin
  select * into s from settings where id = 1;
  today := s.service_hours -> extract(dow from local)::int::text;
  if today is null then return false; end if;
  now_min := extract(hour from local)::int * 60 + extract(minute from local)::int;
  start_min := split_part(today ->> 'start', ':', 1)::int * 60 + split_part(today ->> 'start', ':', 2)::int;
  end_min := split_part(today ->> 'end', ':', 1)::int * 60 + split_part(today ->> 'end', ':', 2)::int;
  return now_min between start_min - s.margin_minutes and end_min + s.margin_minutes;
end;
$$;

create function public.is_paused() returns boolean
language sql stable security definer set search_path = public as $$
  select paused and (paused_until is null or paused_until > now()) from settings where id = 1;
$$;

-- ---------- Public functions ----------

create function public.get_service_hours() returns jsonb
language sql stable security definer set search_path = public as $$
  select service_hours from settings where id = 1;
$$;

-- The student page calls this every few seconds with the passcode.
create function public.get_bus_position(passcode text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  caller text := coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), 'unknown');
  s settings;
  p bus_position;
  fails int;
  oldest timestamptz;
begin
  -- 30 wrong passcodes from one network within 10 minutes blocks that network until the
  -- oldest of them is 10 minutes old. The limit is high because a whole dorm shares one
  -- network; the admin can lift a block early (clear_passcode_blocks).
  delete from passcode_attempts where attempted_at < now() - interval '20 minutes';
  select count(*), min(attempted_at) into fails, oldest
    from passcode_attempts where client = caller and attempted_at > now() - interval '10 minutes';
  if fails >= 30 then
    return json_build_object('status', 'rate_limited',
      'retry_after', ceil(extract(epoch from oldest + interval '10 minutes' - now())));
  end if;

  select * into s from settings where id = 1;
  if s.student_passcode_hash is null or passcode is null
     or extensions.crypt(passcode, s.student_passcode_hash) <> s.student_passcode_hash then
    insert into passcode_attempts (client) values (caller);
    return json_build_object('status', 'wrong_passcode');
  end if;

  if is_paused() then return json_build_object('status', 'paused'); end if;
  if not in_service() then return json_build_object('status', 'not_in_service'); end if;

  select * into p from bus_position where id = 1;
  if p.lat is null or p.lng is null then return json_build_object('status', 'no_position'); end if;
  return json_build_object('status', 'ok', 'lat', p.lat, 'lng', p.lng, 'recorded_at', p.recorded_at);
end;
$$;

-- The GPS tracker calls this. Outside service hours or while tracking is off it only
-- records that it is alive (and its battery), not where it is.
-- It also times trips between stops: when the bus leaves a stop it notes the time, and
-- when it reaches a different stop it adds the trip's duration to that pair's average.
create function public.report_position(
  device_key text, lat double precision default null, lng double precision default null,
  speed real default null, heading real default null, battery int default null
) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  s settings;
  p bus_position;
  tracking boolean;
  here text;                -- the stop the bus is at now (within 150 m), if any
  new_at text;
  new_last text;
  new_left timestamptz;
  trip_minutes real;
begin
  select * into s from settings where id = 1;
  if s.device_key_hash is null or device_key is null
     or extensions.crypt(device_key, s.device_key_hash) <> s.device_key_hash then
    raise exception 'invalid device key' using errcode = '28000';
  end if;
  tracking := in_service() and not is_paused();
  select * into p from bus_position where id = 1;

  if not tracking then
    -- Forget the stop note, so nothing is timed across a break in tracking.
    new_at := null; new_last := null; new_left := null;
  elsif report_position.lat is null or report_position.lng is null then
    -- No GPS fix right now: keep the note as it is.
    new_at := p.at_stop; new_last := p.last_stop; new_left := p.left_at;
  else
    -- Distance in metres (flat-earth approximation, fine over a few hundred metres).
    select stops.id into here from stops
    where stops.lat is not null and stops.lng is not null
      and sqrt(power((stops.lat - report_position.lat) * 111320, 2)
             + power((stops.lng - report_position.lng) * 111320 * cos(radians(stops.lat)), 2)) < 150
    order by power(stops.lat - report_position.lat, 2) + power(stops.lng - report_position.lng, 2)
    limit 1;

    if here is not null then
      -- Just arrived at a different stop from the one it last left: time the trip.
      if p.at_stop is null and p.last_stop is not null and p.last_stop <> here and p.left_at is not null then
        trip_minutes := extract(epoch from now() - p.left_at) / 60;
        if trip_minutes between 1 and 90 then
          insert into travel_times (from_stop, to_stop, measured_avg, measured_count)
          values (p.last_stop, here, trip_minutes, 1)
          on conflict (from_stop, to_stop) do update set
            measured_avg = (coalesce(travel_times.measured_avg, 0) * travel_times.measured_count + trip_minutes)
                           / (travel_times.measured_count + 1),
            measured_count = travel_times.measured_count + 1;
        end if;
      end if;
      new_at := here; new_last := p.last_stop; new_left := p.left_at;
    elsif p.at_stop is not null then
      -- Just left a stop.
      new_at := null; new_last := p.at_stop; new_left := now();
    else
      new_at := null; new_last := p.last_stop; new_left := p.left_at;
    end if;
  end if;

  insert into bus_position (id, lat, lng, speed, heading, battery, recorded_at, at_stop, last_stop, left_at)
  values (1,
    case when tracking then report_position.lat end,
    case when tracking then report_position.lng end,
    case when tracking then report_position.speed end,
    case when tracking then report_position.heading end,
    report_position.battery, now(), new_at, new_last, new_left)
  on conflict (id) do update set
    lat = excluded.lat, lng = excluded.lng, speed = excluded.speed, heading = excluded.heading,
    battery = excluded.battery, recorded_at = excluded.recorded_at,
    at_stop = excluded.at_stop, last_stop = excluded.last_stop, left_at = excluded.left_at;
  -- Tells the tracker how long to wait before the next report (it can sleep when not tracking).
  return json_build_object('tracking', tracking, 'next_report_seconds', case when tracking then 10 else 300 end);
end;
$$;

-- ---------- Admin-only functions ----------

create function public.set_student_passcode(new_passcode text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if char_length(coalesce(new_passcode, '')) < 8 then raise exception 'passcode too short'; end if;
  update settings set student_passcode_hash = extensions.crypt(new_passcode, extensions.gen_salt('bf')) where id = 1;
  delete from passcode_attempts where true;
end;
$$;

-- How many networks are blocked right now for too many wrong passcodes.
create function public.count_passcode_blocks() returns int
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (select count(*) from (
    select client from passcode_attempts
    where attempted_at > now() - interval '10 minutes'
    group by client having count(*) >= 30) blocked);
end;
$$;

-- Lifts all blocks at once (e.g. a dorm's Wi-Fi got blocked by someone's mistakes).
create function public.clear_passcode_blocks() returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from passcode_attempts where true;
end;
$$;

-- Replaces the whole timetable in one transaction, so it is never half-saved.
create function public.save_timetable(new_trips jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from trips where true;
  insert into trips (id, days, stop_ids, direction, times, note, tracked)
  select id, days, stop_ids,
    case when stop_ids[cardinality(stop_ids)] = 'campus' then 'to_campus' else 'to_dorms' end,
    coalesce(times, '{}'), coalesce(note, ''), coalesce(tracked, true)
  from jsonb_to_recordset(new_trips)
    as x(id uuid, days int[], stop_ids text[], times jsonb, note text, tracked boolean);
end;
$$;

-- Saves the admin's own travel-time estimates. Measured averages are left alone.
create function public.save_travel_times(new_times jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into travel_times (from_stop, to_stop, manual_min)
  select from_stop, to_stop, manual_min
  from jsonb_to_recordset(new_times) as x(from_stop text, to_stop text, manual_min int)
  on conflict (from_stop, to_stop) do update set manual_min = excluded.manual_min;
end;
$$;

-- ---------- Row level security ----------

alter table public.stops enable row level security;
alter table public.trips enable row level security;
alter table public.travel_times enable row level security;
alter table public.alerts enable row level security;
alter table public.settings enable row level security;
alter table public.bus_position enable row level security;
alter table public.passcode_attempts enable row level security;

create policy "anyone reads stops" on public.stops for select using (true);
create policy "admin edits stops" on public.stops for all using (is_admin()) with check (is_admin());

create policy "anyone reads trips" on public.trips for select using (true);
create policy "anyone reads travel times" on public.travel_times for select using (true);
-- travel_times is changed only through save_travel_times (admin) and report_position (tracker).
create policy "admin edits trips" on public.trips for all using (is_admin()) with check (is_admin());

create policy "anyone reads active alerts" on public.alerts for select
  using (expires_at is null or expires_at > now() or is_admin());
create policy "admin adds alerts" on public.alerts for insert with check (is_admin());
create policy "admin changes alerts" on public.alerts for update using (is_admin()) with check (is_admin());
create policy "admin removes alerts" on public.alerts for delete using (is_admin());

create policy "admin reads settings" on public.settings for select using (is_admin());
create policy "admin changes settings" on public.settings for update using (is_admin()) with check (is_admin());

create policy "admin reads tracker status" on public.bus_position for select using (is_admin());
-- passcode_attempts: no policies, so only the functions above can use it.

-- The admin may change service hours and the pause switch, but not the hashes or email.
revoke update on public.settings from anon, authenticated;
grant update (service_hours, paused, paused_until, margin_minutes) on public.settings to authenticated;

-- ---------- Starting data ----------

insert into public.stops (id, name, lat, lng, sort, weekend_only) values
  ('anavargos', 'Anavargos Dorms', 34.800635, 32.451972, 1, false),
  ('tepak', 'Tepak Dorms', 34.776953, 32.434246, 2, false),
  ('oldtown', 'Old Town', null, null, 3, true),
  ('campus', 'Campus', 34.767469, 32.417171, 4, false);

-- Starting travel times in minutes: guesses (only Anavargos→Tepak and Campus→Old Town come
-- from the old schedule). The admin can change them; measured averages take over later.
insert into public.travel_times (from_stop, to_stop, manual_min) values
  ('anavargos', 'tepak', 10), ('tepak', 'anavargos', 10),
  ('tepak', 'campus', 8), ('campus', 'tepak', 8),
  ('tepak', 'oldtown', 10), ('oldtown', 'tepak', 10),
  ('oldtown', 'campus', 5), ('campus', 'oldtown', 5);

-- Replace the email with the project email before running (D-017).
insert into public.settings (id, admin_email) values (1, 'CHANGE-ME@example.com');
insert into public.bus_position (id) values (1);
