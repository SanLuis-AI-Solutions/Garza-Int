// Supabase Edge Function: admin-only approvals management
//
// Purpose:
// - Remove direct client-side writes to `public.approved_emails`.
// - Enforce "admin + MFA" at the edge before mutating approval state.
//
// Notes:
// - If `SUPABASE_SERVICE_ROLE_KEY` is set as a function secret, mutations use it.
// - Otherwise, we fall back to using the caller JWT (RLS still enforces admin + AAL2).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ADMIN_EMAIL = 'contact@sanluisai.com';
const STRATEGIES = ['DEVELOPER', 'LANDLORD', 'FLIPPER'] as const;
const DEFAULT_TRIAL_DAYS = 14;

type Action = 'approve' | 'revoke' | 'remove' | 'renew' | 'mfa_bypass_grant' | 'mfa_bypass_revoke';

const json = (status: number, body: unknown, extraHeaders?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(extraHeaders ?? {}),
    },
  });

const getOrigin = (req: Request) => req.headers.get('origin') ?? '*';

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  Vary: 'Origin',
});

const getBearer = (req: Request) => {
  const raw = req.headers.get('authorization') ?? '';
  if (!raw.toLowerCase().startsWith('bearer ')) return null;
  return raw.slice(7).trim();
};

const decodeJwtPayload = (jwt: string): Record<string, unknown> | null => {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const parseTrialDays = () => {
  const raw = (Deno.env.get('TRIAL_DAYS') ?? '').trim();
  const n = Number.parseInt(raw || String(DEFAULT_TRIAL_DAYS), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TRIAL_DAYS;
  return Math.max(1, Math.min(365, n));
};

const looksLikeMissingRelation = (err: any) => {
  const msg = String(err?.message ?? '');
  return msg.includes('relation') && msg.includes('user_entitlements') && msg.includes('does not exist');
};

const looksLikeMissingMfaRelation = (err: any) => {
  const msg = String(err?.message ?? '');
  return msg.includes('relation') && msg.includes('mfa_exemptions') && msg.includes('does not exist');
};

const looksLikeMissingAuditRelation = (err: any) => {
  const msg = String(err?.message ?? '').toLowerCase();
  const code = String(err?.code ?? '').toLowerCase();
  return (
    msg.includes('admin_approval_audit') &&
    (msg.includes('relation') && msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('could not find the table') ||
      code === 'pgrst205')
  );
};

const logEvent = (event: string, payload: Record<string, unknown>) => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...payload,
    })
  );
};

serve(async (req) => {
  const origin = getOrigin(req);
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, cors);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) {
    return json(500, { error: 'Server not configured' }, cors);
  }

  const jwt = getBearer(req);
  if (!jwt) {
    return json(401, { error: 'Missing bearer token' }, cors);
  }

  const claims = decodeJwtPayload(jwt);
  const emailFromJwt = normalizeEmail(String((claims?.email as string | undefined) ?? ''));
  const aal = String((claims?.aal as string | undefined) ?? 'aal1');

  if (emailFromJwt !== normalizeEmail(ADMIN_EMAIL)) {
    return json(403, { error: 'Admin only' }, cors);
  }
  if (aal !== 'aal2') {
    return json(403, { error: 'MFA required' }, cors);
  }

  // Verify token is valid and matches the admin email.
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'Invalid token' }, cors);
  }
  const emailFromUser = normalizeEmail(userData.user.email ?? '');
  if (emailFromUser !== normalizeEmail(ADMIN_EMAIL)) {
    return json(403, { error: 'Admin only' }, cors);
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '') as Action;
  const daysRaw = body?.days;
  const days = daysRaw !== undefined ? Number.parseInt(String(daysRaw), 10) : null;
  const one = body?.email !== undefined ? [String(body?.email)] : [];
  const many = Array.isArray(body?.emails) ? body.emails.map((x: any) => String(x)) : [];
  const emails = [...one, ...many].map(normalizeEmail).filter((e) => e && e.includes('@'));
  const uniqEmails = Array.from(new Set(emails));
  logEvent('admin_approvals_request', {
    action,
    emails_count: uniqEmails.length,
    admin_email: emailFromUser,
    has_days: days !== null,
  });

  if (!uniqEmails.length) return json(400, { error: 'Invalid email(s)' }, cors);
  if (!['approve', 'revoke', 'remove', 'renew', 'mfa_bypass_grant', 'mfa_bypass_revoke'].includes(action)) {
    return json(400, { error: 'Invalid action' }, cors);
  }
  if (uniqEmails.includes(normalizeEmail(ADMIN_EMAIL)) && action !== 'approve') {
    return json(400, { error: 'Cannot revoke/remove the admin email' }, cors);
  }
  if (action === 'renew' || action === 'mfa_bypass_grant') {
    if (days !== null && (!Number.isFinite(days) || days < 1 || days > 365)) {
      return json(400, { error: 'Invalid days (expected 1..365)' }, cors);
    }
  }

  // Supabase reserves SUPABASE_* env vars for platform-managed values.
  // Use a non-reserved secret name for the service role key.
  const serviceRole = Deno.env.get('SERVICE_ROLE_KEY');
  const dbClient = serviceRole
    ? createClient(url, serviceRole, { auth: { persistSession: false } })
    : // Fallback keeps RLS in play (admin + AAL2 required by policy).
      createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false },
      });

  const writeAudit = async (status: 'success' | 'error', detail: Record<string, unknown> = {}) => {
    try {
      const { error: auditErr } = await dbClient.from('admin_approval_audit').insert({
        admin_email: emailFromUser,
        action,
        target_emails: uniqEmails,
        days,
        status,
        detail,
      });
      if (auditErr && !looksLikeMissingAuditRelation(auditErr)) {
        logEvent('admin_approvals_audit_write_error', { action, status, error: auditErr.message });
      }
    } catch (auditWriteErr: any) {
      logEvent('admin_approvals_audit_write_exception', {
        action,
        status,
        error: auditWriteErr?.message ?? 'unknown',
      });
    }
  };

  if (action === 'remove') {
    const { error } = await dbClient.from('approved_emails').delete().in('email', uniqEmails);
    if (error) {
      await writeAudit('error', { stage: 'approved_emails_delete', error: error.message });
      logEvent('admin_approvals_error', { action, stage: 'approved_emails_delete', error: error.message });
      return json(500, { error: error.message }, cors);
    }

    // Best-effort cleanup. If the table hasn't been deployed yet, ignore.
    const { error: entErr } = await dbClient.from('user_entitlements').delete().in('email', uniqEmails);
    if (entErr && !looksLikeMissingRelation(entErr)) {
      await writeAudit('error', { stage: 'user_entitlements_delete', error: entErr.message });
      logEvent('admin_approvals_error', { action, stage: 'user_entitlements_delete', error: entErr.message });
      return json(500, { error: entErr.message }, cors);
    }

    // Best-effort cleanup for MFA exemptions.
    const { error: mfaErr } = await dbClient.from('mfa_exemptions').delete().in('email', uniqEmails);
    if (mfaErr && !looksLikeMissingMfaRelation(mfaErr)) {
      await writeAudit('error', { stage: 'mfa_exemptions_delete', error: mfaErr.message });
      logEvent('admin_approvals_error', { action, stage: 'mfa_exemptions_delete', error: mfaErr.message });
      return json(500, { error: mfaErr.message }, cors);
    }
    await writeAudit('success', { stage: 'remove_completed', count: uniqEmails.length });
    logEvent('admin_approvals_success', { action, count: uniqEmails.length });
    return json(200, { ok: true, count: uniqEmails.length }, cors);
  }

  if (action === 'approve' || action === 'revoke') {
    const approved = action === 'approve';
    const approvedAt = approved ? new Date().toISOString() : null;
    const payload = uniqEmails.map((email) => ({ email, approved, approved_at: approvedAt }));

    const { error } = await dbClient.from('approved_emails').upsert(payload, { onConflict: 'email' });
    if (error) {
      await writeAudit('error', { stage: 'approved_emails_upsert', error: error.message });
      logEvent('admin_approvals_error', { action, stage: 'approved_emails_upsert', error: error.message });
      return json(500, { error: error.message }, cors);
    }
  } else if (action === 'renew') {
    // Renew is only valid for already-approved emails.
    const { data: approvals, error: apprErr } = await dbClient
      .from('approved_emails')
      .select('email,approved')
      .in('email', uniqEmails);
    if (apprErr) {
      await writeAudit('error', { stage: 'renew_precheck_select', error: apprErr.message });
      logEvent('admin_approvals_error', { action, stage: 'renew_precheck_select', error: apprErr.message });
      return json(500, { error: apprErr.message }, cors);
    }
    const approvalsArr = (approvals ?? []) as any[];
    const missing = uniqEmails.filter((e) => !approvalsArr.some((r) => normalizeEmail(String(r.email)) === e));
    const unapproved = approvalsArr.filter((r) => !r.approved).map((r) => normalizeEmail(String(r.email)));
    if (missing.length || unapproved.length) {
      await writeAudit('error', { stage: 'renew_precheck_validation', missing, unapproved });
      logEvent('admin_approvals_error', { action, stage: 'renew_precheck_validation', missing, unapproved });
      return json(400, { error: 'All emails must be approved before renew', missing, unapproved }, cors);
    }
  }

  // When an email is approved, grant time-limited access to ALL 3 strategies.
  // This is enforced server-side by RLS on `public.projects`.
  //
  // Also handle revoke/remove so the server stays consistent even if someone tampers with the frontend.
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    if (action === 'approve' || action === 'renew') {
      const trialDays = action === 'renew' ? (days ?? parseTrialDays()) : parseTrialDays();
      const expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      const entitlements = uniqEmails.flatMap((email) => {
        const isAdminEmail = normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL);
        return STRATEGIES.map((strategy) => ({
          email,
          strategy,
          active: true,
          expires_at: isAdminEmail ? null : expiresAt,
          updated_at: nowIso,
        }));
      });

      const { error: entErr } = await dbClient
        .from('user_entitlements')
        .upsert(entitlements, { onConflict: 'email,strategy' });
      if (entErr && !looksLikeMissingRelation(entErr)) {
        await writeAudit('error', { stage: 'entitlements_upsert_approve_or_renew', error: entErr.message });
        logEvent('admin_approvals_error', {
          action,
          stage: 'entitlements_upsert_approve_or_renew',
          error: entErr.message,
        });
        return json(500, { error: entErr.message }, cors);
      }
    } else if (action === 'revoke') {
      const entitlements = uniqEmails.flatMap((email) =>
        STRATEGIES.map((strategy) => ({
          email,
          strategy,
          active: false,
          expires_at: nowIso,
          updated_at: nowIso,
        }))
      );
      const { error: entErr } = await dbClient
        .from('user_entitlements')
        .upsert(entitlements, { onConflict: 'email,strategy' });
      if (entErr && !looksLikeMissingRelation(entErr)) {
        await writeAudit('error', { stage: 'entitlements_upsert_revoke', error: entErr.message });
        logEvent('admin_approvals_error', { action, stage: 'entitlements_upsert_revoke', error: entErr.message });
        return json(500, { error: entErr.message }, cors);
      }

      // If access is revoked, remove any MFA bypass as well (defense in depth).
      const { error: mfaErr } = await dbClient.from('mfa_exemptions').delete().in('email', uniqEmails);
      if (mfaErr && !looksLikeMissingMfaRelation(mfaErr)) {
        await writeAudit('error', { stage: 'mfa_exemptions_delete_revoke', error: mfaErr.message });
        logEvent('admin_approvals_error', { action, stage: 'mfa_exemptions_delete_revoke', error: mfaErr.message });
        return json(500, { error: mfaErr.message }, cors);
      }
    } else if (action === 'mfa_bypass_grant' || action === 'mfa_bypass_revoke') {
      // MFA bypass is only valid for already-approved users.
      const { data: approvals, error: apprErr } = await dbClient
        .from('approved_emails')
        .select('email,approved')
        .in('email', uniqEmails);
      if (apprErr) {
        await writeAudit('error', { stage: 'mfa_precheck_select', error: apprErr.message });
        logEvent('admin_approvals_error', { action, stage: 'mfa_precheck_select', error: apprErr.message });
        return json(500, { error: apprErr.message }, cors);
      }
      const approvalsArr = (approvals ?? []) as any[];
      const missing = uniqEmails.filter((e) => !approvalsArr.some((r) => normalizeEmail(String(r.email)) === e));
      const unapproved = approvalsArr.filter((r) => !r.approved).map((r) => normalizeEmail(String(r.email)));
      if (missing.length || unapproved.length) {
        await writeAudit('error', { stage: 'mfa_precheck_validation', missing, unapproved });
        logEvent('admin_approvals_error', { action, stage: 'mfa_precheck_validation', missing, unapproved });
        return json(400, { error: 'All emails must be approved before MFA bypass', missing, unapproved }, cors);
      }

      if (action === 'mfa_bypass_revoke') {
        const { error: mfaErr } = await dbClient.from('mfa_exemptions').delete().in('email', uniqEmails);
        if (mfaErr && !looksLikeMissingMfaRelation(mfaErr)) {
          await writeAudit('error', { stage: 'mfa_exemptions_delete_bypass_revoke', error: mfaErr.message });
          logEvent('admin_approvals_error', {
            action,
            stage: 'mfa_exemptions_delete_bypass_revoke',
            error: mfaErr.message,
          });
          return json(500, { error: mfaErr.message }, cors);
        }
      } else {
        const bypassDays = days ?? 7;
        const expiresAt = new Date(now.getTime() + bypassDays * 24 * 60 * 60 * 1000).toISOString();
        const payload = uniqEmails.map((email) => ({
          email,
          active: true,
          expires_at: expiresAt,
          updated_at: nowIso,
        }));
        const { error: mfaErr } = await dbClient.from('mfa_exemptions').upsert(payload, { onConflict: 'email' });
        if (mfaErr && !looksLikeMissingMfaRelation(mfaErr)) {
          await writeAudit('error', { stage: 'mfa_exemptions_upsert_bypass_grant', error: mfaErr.message });
          logEvent('admin_approvals_error', {
            action,
            stage: 'mfa_exemptions_upsert_bypass_grant',
            error: mfaErr.message,
          });
          return json(500, { error: mfaErr.message }, cors);
        }
      }
    }
  } catch (e: any) {
    await writeAudit('error', { stage: 'exception', error: e?.message ?? 'Entitlement update failed' });
    logEvent('admin_approvals_error', { action, stage: 'exception', error: e?.message ?? 'Entitlement update failed' });
    if (!looksLikeMissingRelation(e) && !looksLikeMissingMfaRelation(e)) {
      return json(500, { error: e?.message ?? 'Entitlement update failed' }, cors);
    }
  }
  await writeAudit('success', { stage: 'completed', count: uniqEmails.length });
  logEvent('admin_approvals_success', { action, count: uniqEmails.length });
  return json(200, { ok: true, count: uniqEmails.length }, cors);
});
