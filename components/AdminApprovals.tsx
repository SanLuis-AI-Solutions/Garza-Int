import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { logUiError, logUiEvent } from '../services/observability';

type ApprovedEmailRow = {
  email: string;
  approved: boolean;
  created_at: string;
  approved_at: string | null;
};

type EntitlementRow = {
  email: string;
  strategy: 'DEVELOPER' | 'LANDLORD' | 'FLIPPER';
  active: boolean;
  expires_at: string | null;
};

type MfaExemptionRow = {
  email: string;
  active: boolean;
  expires_at: string | null;
};

type ApprovalAuditRow = {
  created_at: string;
  admin_email: string;
  action: string;
  status: string;
  target_emails: string[] | null;
  days: number | null;
  detail: Record<string, unknown> | null;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isMissingTableError = (err: any, table: string) => {
  const msg = String(err?.message ?? '').toLowerCase();
  return (
    msg.includes(table.toLowerCase()) &&
    (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find the table'))
  );
};

const AdminApprovals: React.FC<{ adminEmail: string }> = ({ adminEmail }) => {
  const [rows, setRows] = useState<ApprovedEmailRow[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, EntitlementRow[]>>({});
  const [mfaExemptions, setMfaExemptions] = useState<Record<string, MfaExemptionRow | null>>({});
  const [auditRows, setAuditRows] = useState<ApprovalAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'all'>('pending');

  const [newEmail, setNewEmail] = useState('');
  const [renewDays, setRenewDays] = useState(14);
  const [mfaBypassDays, setMfaBypassDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reauthRequired, setReauthRequired] = useState(false);
  const [auditAvailable, setAuditAvailable] = useState(true);

  const ensureAdminSessionReady = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const expected = normalizeEmail(adminEmail);

    let { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session) {
        setReauthRequired(true);
        throw new Error('Session not found. Sign out, sign in, and complete MFA, then retry.');
      }
      data = refreshed;
    }

    const session = data.session;
    const email = normalizeEmail(session.user.email ?? '');
    if (email !== expected) {
      throw new Error(`Admin-only action. Sign in as ${expected}.`);
    }

    const expiresAtSeconds = session.expires_at ?? 0;
    const expiresSoon = expiresAtSeconds * 1000 - Date.now() < 90_000;
    if (expiresSoon) {
      await supabase.auth.refreshSession().catch(() => null);
    }
  };

  const callAdminApprovals = async (args: {
    action: 'approve' | 'revoke' | 'remove' | 'renew' | 'mfa_bypass_grant' | 'mfa_bypass_revoke';
    emails: string[];
    days?: number;
  }) => {
    if (!supabase) return;
    await ensureAdminSessionReady();
    const invokeApprovals = async () => {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-approvals', {
        body: { action: args.action, emails: args.emails.map(normalizeEmail), days: args.days },
      });
      const payload = (data ?? null) as Record<string, unknown> | null;
      const context = (invokeErr as any)?.context as Response | undefined;
      const statusFromContext = typeof context?.status === 'number' ? context.status : null;
      const statusFromMessage = /invalid jwt/i.test(String(invokeErr?.message ?? '')) ? 401 : null;
      const status = statusFromContext ?? statusFromMessage;
      const contextPayload = context ? await context.clone().json().catch(() => null) : null;
      return { payload, invokeErr, contextPayload, status };
    };

    let attempt = await invokeApprovals();
    if (attempt.invokeErr && attempt.status === 401) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr) {
        attempt = await invokeApprovals();
      }
    }

    const { payload, invokeErr, status, contextPayload } = attempt;

    if (!invokeErr) {
      const bodyErr = payload?.error ?? contextPayload?.error;
      if (typeof bodyErr === 'string' && bodyErr.trim()) throw new Error(bodyErr);
      const bodyMsg = payload?.message ?? contextPayload?.message;
      if (typeof bodyMsg === 'string' && bodyMsg.trim()) throw new Error(bodyMsg);
      setReauthRequired(false);
      logUiEvent('admin_approvals_action_success', {
        action: args.action,
        emails_count: args.emails.length,
      });
      return;
    }

    const payloadError = contextPayload?.error ?? contextPayload?.message ?? payload?.error ?? payload?.message;
    const baseMessage =
      typeof payloadError === 'string' && payloadError.trim()
        ? payloadError
        : invokeErr.message || `Approvals request failed${status ? ` (${status})` : ''}.`;

    if (status === 401) {
      setReauthRequired(true);
      logUiError('admin_approvals_401', invokeErr, { action: args.action, emails_count: args.emails.length });
      throw new Error(`${baseMessage} Session may be expired. Sign out, sign back in, and complete MFA, then retry.`);
    }
    if (status === 403) {
      setReauthRequired(true);
      logUiError('admin_approvals_403', invokeErr, { action: args.action, emails_count: args.emails.length });
      throw new Error(`${baseMessage} Admin + MFA access is required for this action.`);
    }
    logUiError('admin_approvals_error', invokeErr, { action: args.action, emails_count: args.emails.length });
    throw new Error(baseMessage);
  };

  const refresh = async () => {
    if (!supabase) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from('approved_emails')
        .select('email,approved,created_at,approved_at')
        .order('created_at', { ascending: false });

      if (qErr) throw qErr;
      const nextRows = (data ?? []) as ApprovedEmailRow[];
      setRows(nextRows);
      setReauthRequired(false);

      const emails = Array.from(new Set(nextRows.map((r) => normalizeEmail(r.email)))).filter(Boolean);
      if (emails.length) {
        const { data: entData, error: entErr } = await supabase
          .from('user_entitlements')
          .select('email,strategy,active,expires_at')
          .in('email', emails);
        if (entErr) {
          if (isMissingTableError(entErr, 'user_entitlements')) {
            setEntitlements({});
          } else {
            throw entErr;
          }
        }

        if (!entErr) {
          const grouped: Record<string, EntitlementRow[]> = {};
          for (const r of (entData ?? []) as EntitlementRow[]) {
            const e = normalizeEmail(r.email);
            if (!grouped[e]) grouped[e] = [];
            grouped[e].push({ ...r, email: e });
          }
          setEntitlements(grouped);
        }

        // Optional: MFA exemptions (used for short-lived access when users can't set up TOTP).
        const { data: mfaData, error: mfaErr } = await supabase
          .from('mfa_exemptions')
          .select('email,active,expires_at')
          .in('email', emails);
        if (mfaErr) {
          if (isMissingTableError(mfaErr, 'mfa_exemptions')) {
            setMfaExemptions({});
          } else {
            throw mfaErr;
          }
        }
        if (!mfaErr) {
          const grouped: Record<string, MfaExemptionRow | null> = {};
          for (const r of (mfaData ?? []) as MfaExemptionRow[]) {
            grouped[normalizeEmail(r.email)] = { ...r, email: normalizeEmail(r.email) };
          }
          // Ensure known emails exist as keys (so UI logic is stable).
          for (const e of emails) {
            if (!(e in grouped)) grouped[e] = null;
          }
          setMfaExemptions(grouped);
        }

        const { data: auditData, error: auditErr } = await supabase
          .from('admin_approval_audit')
          .select('created_at,admin_email,action,status,target_emails,days,detail')
          .order('created_at', { ascending: false })
          .limit(25);
        if (auditErr) {
          if (isMissingTableError(auditErr, 'admin_approval_audit')) {
            setAuditAvailable(false);
            setAuditRows([]);
          } else {
            throw auditErr;
          }
        } else {
          setAuditAvailable(true);
          setAuditRows((auditData ?? []) as ApprovalAuditRow[]);
        }
      } else {
        setEntitlements({});
        setMfaExemptions({});
        setAuditRows([]);
      }
      setSelected({});
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesText = !f || r.email.toLowerCase().includes(f);
      const matchesStatus =
        status === 'all' ? true : status === 'approved' ? r.approved === true : r.approved === false;
      return matchesText && matchesStatus;
    });
  }, [rows, filter, status]);

  const upsertApproved = async (email: string, approved: boolean) => {
    if (!supabase) return;
    setActionMessage(null);
    setSubmitting(true);
    try {
      await callAdminApprovals({ action: approved ? 'approve' : 'revoke', emails: [email] });
      setActionMessage(approved ? `Approved ${normalizeEmail(email)}` : `Revoked ${normalizeEmail(email)}`);
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (email: string) => {
    if (!supabase) return;
    setActionMessage(null);
    setSubmitting(true);
    try {
      await callAdminApprovals({ action: 'remove', emails: [email] });
      setActionMessage(`Removed ${normalizeEmail(email)}`);
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!supabase) {
    return (
      <div className="gi-card p-6">
        <h3 className="text-lg font-semibold gi-serif">Approvals</h3>
        <p className="mt-2 text-sm gi-muted">Supabase is not configured.</p>
      </div>
    );
  }

  const selectedEmails = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const toggleAllVisible = (checked: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    for (const r of filtered) next[r.email] = checked;
    setSelected(next);
  };

  const downloadPendingCSV = () => {
    const pending = rows.filter((r) => !r.approved);
    const headers = ['Email', 'Requested At'];
    const lines = pending.map((r) => [r.email, r.created_at].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...lines].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pending_approvals.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bulk = async (action: 'approve' | 'revoke' | 'remove') => {
    if (!selectedEmails.length) return;
    if (action === 'remove') {
      const ok = window.confirm(`Remove ${selectedEmails.length} email(s)? This deletes the rows.`);
      if (!ok) return;
    }

    setActionMessage(null);
    setSubmitting(true);
    try {
      await callAdminApprovals({ action, emails: selectedEmails });
      setActionMessage(
        action === 'approve'
          ? `Approved ${selectedEmails.length} email(s)`
          : action === 'revoke'
          ? `Revoked ${selectedEmails.length} email(s)`
          : `Removed ${selectedEmails.length} email(s)`
      );
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Bulk action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renew = async (emails: string[]) => {
    if (!supabase) return;
    if (!emails.length) return;
    setActionMessage(null);
    setSubmitting(true);
    try {
      await callAdminApprovals({ action: 'renew', emails, days: renewDays });
      setActionMessage(`Renewed access for ${emails.length} email(s) (+${renewDays} days)`);
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Renew failed');
    } finally {
      setSubmitting(false);
    }
  };

  const mfaBypassSummary = (email: string) => {
    const row = mfaExemptions[normalizeEmail(email)] ?? null;
    if (!row) return { active: false, expiresAt: null as string | null };
    const now = Date.now();
    const active = row.active && (!row.expires_at || new Date(row.expires_at).getTime() > now);
    return { active, expiresAt: row.expires_at };
  };

  const grantMfaBypass = async (emails: string[]) => {
    if (!supabase) return;
    if (!emails.length) return;
    setActionMessage(null);
    setSubmitting(true);
    try {
      await callAdminApprovals({ action: 'mfa_bypass_grant', emails, days: mfaBypassDays });
      setActionMessage(`Granted MFA bypass for ${emails.length} email(s) (+${mfaBypassDays} days)`);
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'MFA bypass grant failed');
    } finally {
      setSubmitting(false);
    }
  };

  const revokeMfaBypass = async (emails: string[]) => {
    if (!supabase) return;
    if (!emails.length) return;
    setActionMessage(null);
    setSubmitting(true);
    try {
      await callAdminApprovals({ action: 'mfa_bypass_revoke', emails });
      setActionMessage(`Revoked MFA bypass for ${emails.length} email(s)`);
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'MFA bypass revoke failed');
    } finally {
      setSubmitting(false);
    }
  };

  const entitlementSummary = (email: string) => {
    const list = entitlements[normalizeEmail(email)] ?? [];
    const now = Date.now();
    const active = list.filter((r) => r.active && (!r.expires_at || new Date(r.expires_at).getTime() > now));
    const unlimited = active.some((r) => r.expires_at === null);
    const maxExpiry =
      active
        .map((r) => r.expires_at)
        .filter((x): x is string => Boolean(x))
        .sort()
        .at(-1) ?? null;
    return { active, unlimited, maxExpiry };
  };

  return (
    <div className="gi-card p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold gi-serif">Approvals</h3>
          <p className="mt-1 text-sm gi-muted">
            Admin: <span className="font-mono">{adminEmail}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || submitting}
          className="px-3 py-2 gi-btn gi-btn-secondary text-sm disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {reauthRequired && (
        <div className="mt-4 gi-card border border-amber-400/35 text-amber-100 rounded-xl px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm">
            Admin session needs re-authentication (MFA) before approval mutations can continue.
          </div>
          <button
            type="button"
            className="px-3 py-2 gi-btn gi-btn-secondary text-xs font-semibold"
            onClick={async () => {
              if (!supabase) return;
              await supabase.auth.signOut();
            }}
          >
            Re-authenticate
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by email…"
              data-testid="approval-search"
              className="w-full gi-input px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full md:w-48 gi-input px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="all">All</option>
            </select>
            <button
              type="button"
              onClick={downloadPendingCSV}
              disabled={loading || submitting}
              className="w-full md:w-auto px-3 py-2 gi-btn gi-btn-secondary text-sm disabled:opacity-60"
              title="Export a CSV of all pending emails"
            >
              Export Pending CSV
            </button>
          </div>

          {selectedEmails.length > 0 && (
            <div className="mt-4 gi-card-flat p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm gi-muted">
                Selected: <span className="font-semibold text-white/90">{selectedEmails.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => bulk('approve')}
                  className="px-3 py-2 gi-btn gi-btn-primary text-xs disabled:opacity-60 font-semibold"
                >
                  Approve Selected
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => bulk('revoke')}
                  className="px-3 py-2 gi-btn gi-btn-secondary text-xs disabled:opacity-60 font-semibold"
                >
                  Revoke Selected
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => bulk('remove')}
                  className="px-3 py-2 gi-btn gi-btn-danger text-xs disabled:opacity-60 font-semibold"
                >
                  Remove Selected
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => renew(selectedEmails)}
                  className="px-3 py-2 gi-btn gi-btn-secondary text-xs disabled:opacity-60 font-semibold"
                  title="Extend access window for approved users"
                >
                  Renew (+{renewDays}d)
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => grantMfaBypass(selectedEmails)}
                  className="px-3 py-2 gi-btn gi-btn-secondary text-xs disabled:opacity-60 font-semibold"
                  title="Temporary bypass for users who cannot set up MFA"
                >
                  MFA Bypass (+{mfaBypassDays}d)
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => revokeMfaBypass(selectedEmails)}
                  className="px-3 py-2 gi-btn gi-btn-ghost text-xs disabled:opacity-60 font-semibold"
                  title="Remove the temporary MFA bypass"
                >
                  Revoke MFA Bypass
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm gi-card border border-red-500/30 text-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          {actionMessage && (
            <div className="mt-4 text-sm gi-card border border-green-500/30 text-green-100 rounded-xl px-3 py-2">
              {actionMessage}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="gi-table text-sm">
              <thead className="gi-thead">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible"
                      checked={filtered.length > 0 && filtered.every((r) => selected[r.email])}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
                  </th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Access</th>
                  <th>Requested</th>
                  <th>Approved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="gi-tbody">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 gi-muted">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 gi-muted">
                      No matching rows.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const access = entitlementSummary(r.email);
                    const mfa = mfaBypassSummary(r.email);
                    return (
                      <tr key={r.email} className="gi-trHover">
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.email}`}
                          checked={Boolean(selected[r.email])}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [r.email]: e.target.checked }))}
                        />
                      </td>
                      <td className="font-mono text-white/90">{r.email}</td>
                      <td>
                        <span
                          className={`gi-pill text-xs ${r.approved ? 'gi-pill--ok' : 'gi-pill--warn'}`}
                        >
                          {r.approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="gi-muted">
                        {access.unlimited
                          ? 'Unlimited'
                          : access.active.length === 0
                          ? 'Expired / None'
                          : `Active until ${formatDateTime(access.maxExpiry)}`}
                        {mfa.active && (
                          <div className="mt-1 text-[11px] text-white/60">
                            MFA bypass until {formatDateTime(mfa.expiresAt)}
                          </div>
                        )}
                      </td>
                      <td className="gi-muted">{formatDateTime(r.created_at)}</td>
                      <td className="gi-muted">{formatDateTime(r.approved_at)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {r.approved ? (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => upsertApproved(r.email, false)}
                              className="px-2.5 py-1.5 gi-btn gi-btn-secondary text-xs disabled:opacity-60"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => upsertApproved(r.email, true)}
                              className="px-2.5 py-1.5 gi-btn gi-btn-primary text-xs disabled:opacity-60"
                            >
                              Approve
                            </button>
                          )}
                          {r.approved && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => renew([r.email])}
                              data-testid={`renew-${r.email}`}
                              className="px-2.5 py-1.5 gi-btn gi-btn-secondary text-xs disabled:opacity-60"
                              title="Extend access window"
                            >
                              Renew (+{renewDays}d)
                            </button>
                          )}
                          {r.approved && !mfa.active && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => grantMfaBypass([r.email])}
                              className="px-2.5 py-1.5 gi-btn gi-btn-secondary text-xs disabled:opacity-60"
                              title="Temporary bypass for users who cannot set up MFA"
                            >
                              MFA Bypass (+{mfaBypassDays}d)
                            </button>
                          )}
                          {r.approved && mfa.active && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => revokeMfaBypass([r.email])}
                              className="px-2.5 py-1.5 gi-btn gi-btn-ghost text-xs disabled:opacity-60"
                              title="Remove the temporary MFA bypass"
                            >
                              Revoke MFA Bypass
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => remove(r.email)}
                            className="px-2.5 py-1.5 gi-btn gi-btn-danger text-xs disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="gi-card-flat p-4">
            <h4 className="text-sm font-semibold text-white/90">Quick Add</h4>
            <p className="mt-1 text-xs gi-muted">
              Add an email and approve it immediately. This will create the row if it does not exist.
            </p>

            <div className="mt-3 space-y-3">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@company.com"
                data-testid="quick-add-email"
                className="w-full gi-input px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-3">
                <label className="text-xs gi-muted whitespace-nowrap">Renew days</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={renewDays}
                  data-testid="quick-add-renew-days"
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value || '14', 10);
                    setRenewDays(Math.max(1, Math.min(365, Number.isFinite(n) ? n : 14)));
                  }}
                  className="w-full gi-input px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs gi-muted whitespace-nowrap">MFA bypass days</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={mfaBypassDays}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value || '7', 10);
                    setMfaBypassDays(Math.max(1, Math.min(30, Number.isFinite(n) ? n : 7)));
                  }}
                  className="w-full gi-input px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={submitting || !newEmail.trim()}
                onClick={() => upsertApproved(newEmail, true)}
                data-testid="quick-add-approve"
                className="w-full gi-btn gi-btn-primary disabled:opacity-60 font-semibold py-2.5 text-sm"
              >
                Approve Email
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 gi-card-flat p-4">
        <h4 className="text-sm font-semibold text-white/90">Recent Admin Actions</h4>
        <p className="mt-1 text-xs gi-muted">Latest approvals mutations recorded for traceability.</p>
        {!auditAvailable && (
          <p className="mt-2 text-xs gi-muted2">
            Audit log table is not deployed yet in this environment.
          </p>
        )}
        <div className="mt-3 overflow-x-auto">
          <table className="gi-table text-xs">
            <thead className="gi-thead">
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Emails</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {auditRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gi-muted">No audit entries found.</td>
                </tr>
              ) : (
                auditRows.map((row) => (
                  <tr key={`${row.created_at}-${row.action}-${row.status}`} className="gi-trHover">
                    <td className="gi-muted">{formatDateTime(row.created_at)}</td>
                    <td className="font-mono">{row.admin_email}</td>
                    <td>{row.action}</td>
                    <td className="gi-muted">
                      {Array.isArray(row.target_emails) ? row.target_emails.join(', ') : '—'}
                    </td>
                    <td>
                      <span className={`gi-pill text-xs ${row.status === 'success' ? 'gi-pill--ok' : 'gi-pill--warn'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovals;
