#!/usr/bin/env node

const baseUrl = process.env.CANARY_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.CANARY_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const renewEmail = (process.env.CANARY_RENEW_EMAIL ?? process.env.E2E_RENEW_EMAIL ?? '').trim().toLowerCase();
const startedAtRaw = process.env.RENEW_STARTED_AT ?? '';
const renewDays = Number.parseInt(process.env.CANARY_RENEW_DAYS ?? process.env.E2E_RENEW_DAYS ?? '1', 10);

if (!baseUrl) throw new Error('Missing CANARY_SUPABASE_URL (or SUPABASE_URL).');
if (!serviceRoleKey) throw new Error('Missing CANARY_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
if (!renewEmail) throw new Error('Missing CANARY_RENEW_EMAIL (or E2E_RENEW_EMAIL).');
if (!startedAtRaw) throw new Error('Missing RENEW_STARTED_AT.');
if (!Number.isFinite(renewDays) || renewDays < 1) throw new Error('Invalid renew days.');

const startedAt = new Date(startedAtRaw);
if (Number.isNaN(startedAt.getTime())) throw new Error(`Invalid RENEW_STARTED_AT: ${startedAtRaw}`);

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

const fetchJson = async (path) => {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`Supabase REST ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

const query = (table, params) => `/rest/v1/${table}?${new URLSearchParams(params).toString()}`;

const entitlements = await fetchJson(
  query('user_entitlements', {
    select: 'email,strategy,active,expires_at',
    email: `eq.${renewEmail}`,
    active: 'eq.true',
    order: 'strategy.asc',
  })
);

if (!Array.isArray(entitlements) || entitlements.length === 0) {
  throw new Error(`No active entitlements found for ${renewEmail}.`);
}

const strategies = new Set(entitlements.map((row) => row.strategy));
for (const expected of ['DEVELOPER', 'LANDLORD', 'FLIPPER']) {
  if (!strategies.has(expected)) {
    throw new Error(`Missing strategy ${expected} for ${renewEmail}.`);
  }
}

const expiryMs = entitlements
  .map((row) => (row.expires_at ? new Date(row.expires_at).getTime() : Number.NaN))
  .filter((value) => Number.isFinite(value))
  .sort((a, b) => b - a)[0];

if (!Number.isFinite(expiryMs)) {
  throw new Error(`No valid entitlement expiry found for ${renewEmail}.`);
}

const minExpectedExpiryMs = startedAt.getTime() + Math.max(renewDays - 0.1, 0.1) * 24 * 60 * 60 * 1000;
if (expiryMs < minExpectedExpiryMs) {
  throw new Error(
    `Expiry check failed for ${renewEmail}. Found ${new Date(expiryMs).toISOString()}, expected >= ${new Date(minExpectedExpiryMs).toISOString()}.`
  );
}

const audits = await fetchJson(
  query('admin_approval_audit', {
    select: 'created_at,admin_email,action,status,target_emails,days,detail',
    action: 'eq.renew',
    status: 'eq.success',
    created_at: `gte.${startedAt.toISOString()}`,
    order: 'created_at.desc',
    limit: '100',
  })
);

const matchingAudit = Array.isArray(audits)
  ? audits.find((row) => Array.isArray(row.target_emails) && row.target_emails.some((e) => String(e).toLowerCase() === renewEmail))
  : null;

if (!matchingAudit) {
  throw new Error(`No successful renew audit row found for ${renewEmail} since ${startedAt.toISOString()}.`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      email: renewEmail,
      expiry_iso: new Date(expiryMs).toISOString(),
      audit_created_at: matchingAudit.created_at,
      audit_admin: matchingAudit.admin_email,
    },
    null,
    2
  )
);
