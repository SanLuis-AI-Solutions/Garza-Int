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

-- 2b) Strategy entitlements (time-limited access)
--
-- We key by email (from the signed JWT) to keep admin approval + entitlement granting simple.
-- This is server-side enforced via projects RLS below.
create table if not exists public.user_entitlements (
  email text not null,
  strategy text not null check (strategy in ('DEVELOPER','LANDLORD','FLIPPER')),
  active boolean not null default true,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (email, strategy)
);

create index if not exists user_entitlements_email_idx on public.user_entitlements (email);

alter table public.user_entitlements enable row level security;

-- Seed/Backfill (safe, idempotent):
-- - Ensure the admin is approved.
-- - Grant strategy entitlements for already-approved users if missing.
--
-- NOTE: This uses a default 14-day window for missing entitlements. Future approvals are handled by the Edge Function.
insert into public.approved_emails (email, approved, approved_at)
values ('contact@sanluisai.com', true, now())
on conflict (email)
do update set approved = true;

insert into public.user_entitlements (email, strategy, active, expires_at)
select
  lower(ae.email) as email,
  s.strategy,
  true as active,
  case when lower(ae.email) = 'contact@sanluisai.com' then null else (now() + interval '14 days') end as expires_at
from public.approved_emails ae
cross join (values ('DEVELOPER'), ('LANDLORD'), ('FLIPPER')) as s(strategy)
where ae.approved = true
on conflict (email, strategy)
do nothing;

create or replace function private.has_active_entitlement(project_strategy text)
returns boolean
stable
language sql
as $$
  select exists (
    select 1
    from public.user_entitlements ue
    where lower(ue.email) = private.auth_email()
      and ue.strategy = project_strategy
      and ue.active = true
      and (ue.expires_at is null or ue.expires_at > now())
  );
$$;

-- 2c) Optional: MFA exemptions (short-lived bypass for users who cannot set up TOTP)
create table if not exists public.mfa_exemptions (
  email text primary key,
  active boolean not null default true,
  expires_at timestamptz null,
  reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mfa_exemptions_email_idx on public.mfa_exemptions (email);

alter table public.mfa_exemptions enable row level security;

create or replace function private.has_active_mfa_exemption()
returns boolean
stable
language sql
as $$
  select exists (
    select 1
    from public.mfa_exemptions me
    where lower(me.email) = private.auth_email()
      and me.active = true
      and (me.expires_at is null or me.expires_at > now())
  );
$$;

-- 2d) Optional: user renewal requests from "Access Expired" screen.
create table if not exists public.access_renewal_requests (
  id bigint generated always as identity primary key,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by text null
);

create index if not exists access_renewal_requests_email_idx on public.access_renewal_requests (email);
create index if not exists access_renewal_requests_requested_at_idx on public.access_renewal_requests (requested_at desc);
create unique index if not exists access_renewal_requests_one_pending_per_email
  on public.access_renewal_requests (lower(email))
  where status = 'pending';

alter table public.access_renewal_requests enable row level security;

-- 2d) Admin approvals audit trail (ops traceability)
create table if not exists public.admin_approval_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_email text not null,
  action text not null check (action in ('approve', 'revoke', 'remove', 'renew', 'mfa_bypass_grant', 'mfa_bypass_revoke')),
  target_emails text[] not null default '{}',
  days int null,
  status text not null check (status in ('success', 'error')),
  detail jsonb not null default '{}'::jsonb
);

create index if not exists admin_approval_audit_created_at_idx on public.admin_approval_audit (created_at desc);
create index if not exists admin_approval_audit_admin_email_idx on public.admin_approval_audit (admin_email);
alter table public.admin_approval_audit enable row level security;

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
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_entitlements'
  loop
    execute format('drop policy if exists %I on public.user_entitlements', r.policyname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'mfa_exemptions'
  loop
    execute format('drop policy if exists %I on public.mfa_exemptions', r.policyname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'access_renewal_requests'
  loop
    execute format('drop policy if exists %I on public.access_renewal_requests', r.policyname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'admin_approval_audit'
  loop
    execute format('drop policy if exists %I on public.admin_approval_audit', r.policyname);
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

-- user_entitlements policies:
-- - Users can see ONLY their own entitlements
-- - Admin can list/manage all rows (requires MFA/AAL2 for mutations)

create policy user_entitlements_select_self_or_admin
on public.user_entitlements
for select
to authenticated
using (
  private.is_admin()
  or lower(email) = private.auth_email()
);

create policy user_entitlements_insert_admin
on public.user_entitlements
for insert
to authenticated
with check (
  private.is_admin()
  and private.is_aal2()
);

create policy user_entitlements_update_admin
on public.user_entitlements
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

create policy user_entitlements_delete_admin
on public.user_entitlements
for delete
to authenticated
using (
  private.is_admin()
  and private.is_aal2()
);

-- mfa_exemptions policies:
-- - Users can see ONLY their own exemption row (if any)
-- - Admin can manage all rows (requires MFA/AAL2 for mutations)

create policy mfa_exemptions_select_self_or_admin
on public.mfa_exemptions
for select
to authenticated
using (
  private.is_admin()
  or lower(email) = private.auth_email()
);

create policy mfa_exemptions_insert_admin
on public.mfa_exemptions
for insert
to authenticated
with check (
  private.is_admin()
  and private.is_aal2()
);

create policy mfa_exemptions_update_admin
on public.mfa_exemptions
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

create policy mfa_exemptions_delete_admin
on public.mfa_exemptions
for delete
to authenticated
using (
  private.is_admin()
  and private.is_aal2()
);

-- access_renewal_requests policies:
-- - users can request for their own email.
-- - users can read only their own requests.
-- - admin can read and resolve requests.

create policy access_renewal_requests_select_self_or_admin
on public.access_renewal_requests
for select
to authenticated
using (
  private.is_admin()
  or lower(email) = private.auth_email()
);

create policy access_renewal_requests_insert_self
on public.access_renewal_requests
for insert
to authenticated
with check (
  lower(email) = private.auth_email()
  and status = 'pending'
);

create policy access_renewal_requests_update_admin
on public.access_renewal_requests
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

-- admin_approval_audit policies:
-- - Admin can read all rows.
-- - Non-admin users can only read their own rows (if any).
-- - Admin can insert rows with AAL2.

create policy admin_approval_audit_select_self_or_admin
on public.admin_approval_audit
for select
to authenticated
using (
  private.is_admin()
  or lower(admin_email) = private.auth_email()
);

create policy admin_approval_audit_insert_admin
on public.admin_approval_audit
for insert
to authenticated
with check (
  private.is_admin()
  and private.is_aal2()
);

-- 3) Projects: require approval + MFA (AAL2) + entitlement and ownership
alter table public.projects enable row level security;

create policy projects_select_guarded
on public.projects
for select
to authenticated
using (
  owner_id = auth.uid()
  and private.is_approved_user()
  and (private.is_aal2() or private.has_active_mfa_exemption())
  and private.has_active_entitlement(strategy)
);

create policy projects_insert_guarded
on public.projects
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and private.is_approved_user()
  and (private.is_aal2() or private.has_active_mfa_exemption())
  and private.has_active_entitlement(strategy)
);

create policy projects_update_guarded
on public.projects
for update
to authenticated
using (
  owner_id = auth.uid()
  and private.is_approved_user()
  and (private.is_aal2() or private.has_active_mfa_exemption())
  and private.has_active_entitlement(strategy)
)
with check (
  owner_id = auth.uid()
  and private.is_approved_user()
  and (private.is_aal2() or private.has_active_mfa_exemption())
  and private.has_active_entitlement(strategy)
);

create policy projects_delete_guarded
on public.projects
for delete
to authenticated
using (
  owner_id = auth.uid()
  and private.is_approved_user()
  and (private.is_aal2() or private.has_active_mfa_exemption())
  and private.has_active_entitlement(strategy)
);
