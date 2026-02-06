-- Garza ROI Dashboard: server-side security (approval + MFA enforcement)
-- Run in Supabase SQL editor for the Garza ROI project by PASTING this file's contents.
--
-- NOTE: Supabase SQL editor does not support commands like `run security.sql` (that will error).
--
-- IMPORTANT:
-- - This enforces approval + AAL2 (MFA) at the database layer via RLS.
-- - Enable Supabase Auth MFA (TOTP) BEFORE running this, otherwise users may be unable to access `projects`.
--
-- Admin email is hardcoded here to match the app: contact@sanluisai.com

-- 1) Private helper schema + helpers
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.auth_email()
returns text
stable
language sql
as $$
  select lower((auth.jwt() ->> 'email')::text);
$$;

create or replace function private.auth_aal()
returns text
stable
language sql
as $$
  select coalesce((auth.jwt() ->> 'aal')::text, 'aal1');
$$;

create or replace function private.is_aal2()
returns boolean
stable
language sql
as $$
  select private.auth_aal() = 'aal2';
$$;

create or replace function private.is_admin()
returns boolean
stable
language sql
as $$
  select private.auth_email() = 'contact@sanluisai.com';
$$;

-- 2) Approval table
create table if not exists public.approved_emails (
  email text primary key,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz null
);

alter table public.approved_emails
  add column if not exists approved boolean not null default false;
alter table public.approved_emails
  add column if not exists created_at timestamptz not null default now();
alter table public.approved_emails
  add column if not exists approved_at timestamptz null;

create index if not exists approved_emails_email_idx on public.approved_emails (email);

alter table public.approved_emails enable row level security;

create or replace function private.is_approved_user()
returns boolean
stable
language sql
as $$
  select exists (
    select 1
    from public.approved_emails ae
    where lower(ae.email) = private.auth_email()
      and ae.approved = true
  );
$$;

-- Reset policies (drop all existing policies on both tables to avoid bypass)
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'approved_emails'
  loop
    execute format('drop policy if exists %I on public.approved_emails', r.policyname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'projects'
  loop
    execute format('drop policy if exists %I on public.projects', r.policyname);
  end loop;
end $$;

-- approved_emails policies:
-- - Users can see and create ONLY their own request row
-- - Admin can list/manage all rows

create policy approved_emails_select_self_or_admin
on public.approved_emails
for select
to authenticated
using (
  private.is_admin()
  or lower(email) = private.auth_email()
);

create policy approved_emails_insert_self_request
on public.approved_emails
for insert
to authenticated
with check (
  lower(email) = private.auth_email()
  and approved = false
);

create policy approved_emails_insert_admin
on public.approved_emails
for insert
to authenticated
with check (
  private.is_admin()
  and private.is_aal2()
);

create policy approved_emails_update_admin
on public.approved_emails
for update
to authenticated
using (
  private.is_admin()
  and private.is_aal2()
)
with check (
  private.is_admin()
  and private.is_aal2()
);

create policy approved_emails_delete_admin
on public.approved_emails
for delete
to authenticated
using (
  private.is_admin()
  and private.is_aal2()
);

-- 3) Projects: require BOTH approval and MFA (AAL2) and ownership
alter table public.projects enable row level security;

create policy projects_select_guarded
on public.projects
for select
to authenticated
using (
  owner_id = auth.uid()
  and private.is_approved_user()
  and private.is_aal2()
);

create policy projects_insert_guarded
on public.projects
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and private.is_approved_user()
  and private.is_aal2()
);

create policy projects_update_guarded
on public.projects
for update
to authenticated
using (
  owner_id = auth.uid()
  and private.is_approved_user()
  and private.is_aal2()
)
with check (
  owner_id = auth.uid()
  and private.is_approved_user()
  and private.is_aal2()
);

create policy projects_delete_guarded
on public.projects
for delete
to authenticated
using (
  owner_id = auth.uid()
  and private.is_approved_user()
  and private.is_aal2()
);
