import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const DEFAULT_NOTIFY_TO = 'contact@sanluisai.com';
const DEFAULT_NOTIFY_FROM = 'onboarding@resend.dev';

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

const normalizeEmail = (value: string) => value.trim().toLowerCase();

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

const parseRecipients = (raw: string | undefined | null) =>
  (raw ?? '')
    .split(',')
    .map((x) => normalizeEmail(x))
    .filter(Boolean);

serve(async (req) => {
  const origin = getOrigin(req);
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, cors);
  }

  const bearer = getBearer(req);
  if (!bearer) {
    return json(401, { error: 'Missing bearer token' }, cors);
  }
  const claims = decodeJwtPayload(bearer);
  const requesterEmail = normalizeEmail(String((claims?.email as string | undefined) ?? ''));

  const body = await req.json().catch(() => null);
  const requestedEmail = normalizeEmail(String(body?.email ?? ''));
  const requestedAt =
    typeof body?.requested_at === 'string' && body.requested_at.trim()
      ? body.requested_at
      : new Date().toISOString();

  if (!requestedEmail || !requestedEmail.includes('@')) {
    return json(400, { error: 'Invalid email' }, cors);
  }

  const adminEmail = normalizeEmail(DEFAULT_NOTIFY_TO);
  if (requesterEmail && requesterEmail !== requestedEmail && requesterEmail !== adminEmail) {
    return json(403, { error: 'Requester does not match target email' }, cors);
  }

  const resendApiKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const notifyTo = parseRecipients(Deno.env.get('RENEWAL_NOTIFY_TO_EMAILS'));
  const fromEmail = (Deno.env.get('RENEWAL_NOTIFY_FROM_EMAIL') ?? DEFAULT_NOTIFY_FROM).trim();
  const recipients = notifyTo.length ? notifyTo : [DEFAULT_NOTIFY_TO];

  if (!resendApiKey) {
    return json(200, { ok: false, skipped: true, reason: 'RESEND_API_KEY not configured' }, cors);
  }

  const subject = `Renewal Request Submitted: ${requestedEmail}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.45;">
      <h2 style="margin: 0 0 12px;">Garza Dashboard Renewal Request</h2>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${requestedEmail}</p>
      <p style="margin: 0 0 8px;"><strong>Requested at:</strong> ${new Date(requestedAt).toLocaleString('en-US')}</p>
      <p style="margin: 0;">Open the Approvals tab to approve and renew access.</p>
    </div>
  `;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject,
      html,
      reply_to: [requestedEmail],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json(502, { error: 'Failed to send renewal notification', detail }, cors);
  }

  return json(200, { ok: true, notified: recipients }, cors);
});

