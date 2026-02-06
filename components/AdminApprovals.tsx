import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

type ApprovedEmailRow = {
  email: string;
  approved: boolean;
  created_at: string;
  approved_at: string | null;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const AdminApprovals: React.FC<{ adminEmail: string }> = ({ adminEmail }) => {
  const [rows, setRows] = useState<ApprovedEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'all'>('pending');

  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const callAdminApprovals = async (action: 'approve' | 'revoke' | 'remove', emails: string[]) => {
    if (!supabase) return;
    const { data, error: sErr } = await supabase.auth.getSession();
    if (sErr) throw sErr;
    const token = data.session?.access_token;
    if (!token) throw new Error('Missing session token');

    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!baseUrl) throw new Error('Missing VITE_SUPABASE_URL');

    const res = await fetch(`${baseUrl}/functions/v1/admin-approvals`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, emails: emails.map(normalizeEmail) }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (payload as any)?.error ??
        `Approvals request failed (${res.status}). If the edge function is not deployed yet, deploy it as supabase/functions/admin-approvals.`;
      throw new Error(msg);
    }
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
      setRows((data ?? []) as ApprovedEmailRow[]);
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
      await callAdminApprovals(approved ? 'approve' : 'revoke', [email]);
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
      await callAdminApprovals('remove', [email]);
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
      await callAdminApprovals(action, selectedEmails);
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by email…"
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
                  <th>Requested</th>
                  <th>Approved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="gi-tbody">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 gi-muted">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 gi-muted">
                      No matching rows.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
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
                  ))
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
                className="w-full gi-input px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={submitting || !newEmail.trim()}
                onClick={() => upsertApproved(newEmail, true)}
                className="w-full gi-btn gi-btn-primary disabled:opacity-60 font-semibold py-2.5 text-sm"
              >
                Approve Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovals;
