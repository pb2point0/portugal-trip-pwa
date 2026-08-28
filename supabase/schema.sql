create table if not exists public.trip_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.trip_data (
  trip_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_requests_user_created_idx
on public.ai_requests (user_id, created_at desc);

alter table public.trip_members enable row level security;
alter table public.trip_data enable row level security;
alter table public.ai_requests enable row level security;

revoke all on table public.trip_members, public.trip_data, public.ai_requests from anon;
grant select on table public.trip_members to authenticated;
grant select, insert, update on table public.trip_data to authenticated;
grant select, insert on table public.ai_requests to authenticated;

drop policy if exists "members can see their own membership" on public.trip_members;
create policy "members can see their own membership"
on public.trip_members for select to authenticated
using (user_id = auth.uid());

drop policy if exists "trip members can read trip data" on public.trip_data;
create policy "trip members can read trip data"
on public.trip_data for select to authenticated
using (exists (select 1 from public.trip_members where user_id = auth.uid()));

drop policy if exists "trip members can create trip data" on public.trip_data;
create policy "trip members can create trip data"
on public.trip_data for insert to authenticated
with check (exists (select 1 from public.trip_members where user_id = auth.uid()));

drop policy if exists "members can see their own AI usage" on public.ai_requests;
create policy "members can see their own AI usage"
on public.ai_requests for select to authenticated
using (user_id = auth.uid());

drop policy if exists "members can record their own AI usage" on public.ai_requests;
create policy "members can record their own AI usage"
on public.ai_requests for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.trip_members where user_id = auth.uid())
);

drop policy if exists "trip members can update trip data" on public.trip_data;
create policy "trip members can update trip data"
on public.trip_data for update to authenticated
using (exists (select 1 from public.trip_members where user_id = auth.uid()))
with check (exists (select 1 from public.trip_members where user_id = auth.uid()));

create or replace function public.set_trip_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_trip_updated_at on public.trip_data;
create trigger set_trip_updated_at before update on public.trip_data
for each row execute function public.set_trip_updated_at();

-- Sitter guide app (separate passphrase-gated route, no per-user Supabase auth).
-- The sitter-ai Edge Function talks to this table with the service role key, which
-- bypasses RLS, so no anon/authenticated policies or grants are added here on purpose.
create table if not exists public.sitter_ai_events (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  kind text not null check (kind in ('fail', 'ask')),
  created_at timestamptz not null default now()
);

create index if not exists sitter_ai_events_identifier_created_idx
on public.sitter_ai_events (identifier, kind, created_at desc);

alter table public.sitter_ai_events enable row level security;
revoke all on table public.sitter_ai_events from anon, authenticated;
