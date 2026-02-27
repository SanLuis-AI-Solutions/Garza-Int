#!/usr/bin/env node

const baseUrl = process.env.CANARY_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.CANARY_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const windowMinutes = Number.parseInt(process.env.ADMIN_APPROVALS_ALERT_WINDOW_MINUTES ?? '30', 10);
const maxTotalErrors = Number.parseInt(process.env.ADMIN_APPROVALS_ALERT_MAX_TOTAL ?? '2', 10);
const maxAuthErrors = Number.parseInt(process.env.ADMIN_APPROVALS_ALERT_MAX_401 ?? '1', 10);
const maxServerErrors = Number.parseInt(process.env.ADMIN_APPROVALS_ALERT_MAX_500 ?? '1', 10);

if (!baseUrl) throw new Error('Missing CANARY_SUPABASE_URL (or SUPABASE_URL).');
if (!serviceRoleKey) throw new Error('Missing CANARY_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
if (!Number.isFinite(windowMinutes) || windowMinutes < 1) throw new Error('Invalid alert window.');

const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

const query = new URLSearchParams({
  select: 'created_at,admin_email,action,status,detail',
  action: 'neq.diagnostics',
  status: 'eq.error',
  created_at: `gte.${windowStart}`,
  order: 'created_at.desc',
  limit: '500',
});

const res = await fetch(`${baseUrl}/rest/v1/admin_approval_audit?${query.toString()}`, { headers });
const text = await res.text();
const data = text ? JSON.parse(text) : null;

if (!res.ok) {
  throw new Error(`Supabase REST ${res.status}: ${JSON.stringify(data)}`);
}

const rows = Array.isArray(data) ? data : [];
const authRegex = /\b401\b|invalid jwt|mfa required|admin only|forbidden|aal2|re-auth/i;
const serverRegex = /\b500\b|runtime|exception|timeout|internal/i;

let authErrors = 0;
let serverErrors = 0;

for (const row of rows) {
  const detailText = JSON.stringify(row?.detail ?? {});
  if (authRegex.test(detailText)) authErrors += 1;
  if (serverRegex.test(detailText)) serverErrors += 1;
}

const summary = {
  ok: rows.length <= maxTotalErrors && authErrors <= maxAuthErrors && serverErrors <= maxServerErrors,
  window_start: windowStart,
  window_minutes: windowMinutes,
  total_errors: rows.length,
  auth_errors_401: authErrors,
  server_errors_500: serverErrors,
  thresholds: {
    max_total_errors: maxTotalErrors,
    max_auth_errors_401: maxAuthErrors,
    max_server_errors_500: maxServerErrors,
  },
};

console.log(JSON.stringify(summary, null, 2));

if (!summary.ok) {
  throw new Error('admin-approvals error threshold exceeded');
}
