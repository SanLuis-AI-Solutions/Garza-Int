import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

type ApprovedEmailRow = {
  email: string;
  approved: boolean;
  created_at: string;
  approved_at: string | null;
};

const toIso = (d: Date) => d.toISOString();

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
      const payload = {
        email: normalizeEmail(email),
        approved,
        approved_at: approved ? toIso(new Date()) : null,
      };
      const { error: uErr } = await supabase
        .from('approved_emails')
        .upsert(payload, { onConflict: 'email' });
      if (uErr) throw uErr;
      setActionMessage(approved ? `Approved ${payload.email}` : `Revoked ${payload.email}`);
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
      const { error: dErr } = await supabase.from('approved_emails').delete().eq('email', email);
      if (dErr) throw dErr;
      setActionMessage(`Removed ${email}`);
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!supabase) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900">Approvals</h3>
        <p className="mt-2 text-sm text-slate-600">Supabase is not configured.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Approvals</h3>
          <p className="mt-1 text-sm text-slate-600">
            Admin: <span className="font-mono">{adminEmail}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || submitting}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-60"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full md:w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="all">All</option>
            </select>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {actionMessage && (
            <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {actionMessage}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2 pr-4">Approved</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-slate-600">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-slate-600">
                      No matching rows.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.email} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-mono text-slate-900">{r.email}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
                            r.approved
                              ? 'bg-green-50 text-green-800 border-green-200'
                              : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          }`}
                        >
                          {r.approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{formatDateTime(r.created_at)}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDateTime(r.approved_at)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {r.approved ? (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => upsertApproved(r.email, false)}
                              className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => upsertApproved(r.email, true)}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => remove(r.email)}
                            className="px-2.5 py-1.5 rounded-lg text-xs border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
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
          <div className="border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-900">Quick Add</h4>
            <p className="mt-1 text-xs text-slate-600">
              Add an email and approve it immediately. This will create the row if it does not exist.
            </p>

            <div className="mt-3 space-y-3">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                disabled={submitting || !newEmail.trim()}
                onClick={() => upsertApproved(newEmail, true)}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 text-sm"
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

