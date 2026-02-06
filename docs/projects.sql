-- Garza ROI Dashboard: per-user projects table (multi-strategy)
-- Run in Supabase SQL editor (or via migrations) for the Garza ROI project.
-- NOTE: If you are using email-approval + MFA enforcement, prefer running `docs/security.sql`
-- which will recreate projects policies with stronger guards.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  strategy text not null check (strategy in ('DEVELOPER','LANDLORD','FLIPPER')),
  data jsonb not null,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Basic per-user policies (no approval/MFA enforcement).
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
for delete to authenticated
using (owner_id = auth.uid());
