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

type Action = 'approve' | 'revoke' | 'remove';

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
  const one = body?.email !== undefined ? [String(body?.email)] : [];
  const many = Array.isArray(body?.emails) ? body.emails.map((x: any) => String(x)) : [];
  const emails = [...one, ...many].map(normalizeEmail).filter((e) => e && e.includes('@'));
  const uniqEmails = Array.from(new Set(emails));

  if (!uniqEmails.length) return json(400, { error: 'Invalid email(s)' }, cors);
  if (!['approve', 'revoke', 'remove'].includes(action)) {
    return json(400, { error: 'Invalid action' }, cors);
  }
  if (uniqEmails.includes(normalizeEmail(ADMIN_EMAIL)) && action !== 'approve') {
    return json(400, { error: 'Cannot revoke/remove the admin email' }, cors);
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

  if (action === 'remove') {
    const { error } = await dbClient.from('approved_emails').delete().in('email', uniqEmails);
    if (error) return json(500, { error: error.message }, cors);

    // Best-effort cleanup. If the table hasn't been deployed yet, ignore.
    const { error: entErr } = await dbClient.from('user_entitlements').delete().in('email', uniqEmails);
    if (entErr && !looksLikeMissingRelation(entErr)) {
      return json(500, { error: entErr.message }, cors);
    }
    return json(200, { ok: true, count: uniqEmails.length }, cors);
  }

  const approved = action === 'approve';
  const approvedAt = approved ? new Date().toISOString() : null;
  const payload = uniqEmails.map((email) => ({ email, approved, approved_at: approvedAt }));

  const { error } = await dbClient.from('approved_emails').upsert(payload, { onConflict: 'email' });
  if (error) return json(500, { error: error.message }, cors);

  // When an email is approved, grant time-limited access to ALL 3 strategies.
  // This is enforced server-side by RLS on `public.projects`.
  //
  // Also handle revoke/remove so the server stays consistent even if someone tampers with the frontend.
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    if (action === 'approve') {
      const trialDays = parseTrialDays();
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
        return json(500, { error: entErr.message }, cors);
      }
    }
  } catch (e: any) {
    if (!looksLikeMissingRelation(e)) {
      return json(500, { error: e?.message ?? 'Entitlement update failed' }, cors);
    }
  }
  return json(200, { ok: true, count: uniqEmails.length }, cors);
});
