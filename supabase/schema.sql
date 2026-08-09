-- AutoServis cross-device sync schema
-- Run this in the Supabase SQL Editor.

-- Key-value store shared across all devices.
create table if not exists public.app_data (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- Optimistic concurrency: bump a version column on each write.
alter table public.app_data
  add column if not exists version bigint not null default 1;

-- Trigger to increment version on every update.
create or replace function public.app_data_bump_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists trg_app_data_bump_version on public.app_data;
create trigger trg_app_data_bump_version
  before update on public.app_data
  for each row
  execute function public.app_data_bump_version();

-- Enable realtime for the table so other devices update live.
alter publication supabase_realtime add table public.app_data;

-- RLS: allow authenticated and anon users to read/write app data.
-- NOTE: For a single-shop app this is acceptable. For multi-tenant you would
-- restrict by a `shop_id` column. Keep anon enabled so the deployed front-end
-- (using the anon key) can read/write without a login flow.
alter table public.app_data enable row level security;

drop policy if exists "app_data all access" on public.app_data;
create policy "app_data all access"
  on public.app_data
  for all
  using (true)
  with check (true);
