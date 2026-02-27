import React, { useMemo } from 'react';
import type { AccessInfo } from '../types';

const STRATEGY_LABEL: Record<string, string> = {
  DEVELOPER: 'Ground-Up Development',
  LANDLORD: 'Buy & Hold (Rental)',
  FLIPPER: 'Fix & Flip',
};

const formatDate = (value: string | null) => {
  if (!value) return 'No expiration';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const remainingLabel = (active: boolean, expiresAt: string | null) => {
  if (!active) return 'Expired / inactive';
  if (!expiresAt) return 'Unlimited';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'Expired';
  const days = Math.ceil(ms / 86_400_000);
  return days === 1 ? '1 day left' : `${days} days left`;
};

const statusClass = (active: boolean) => (active ? 'gi-pill gi-pill--ok text-xs' : 'gi-pill gi-pill--warn text-xs');

const AccessOverview: React.FC<{ email: string; access: AccessInfo }> = ({ email, access }) => {
  const rows = useMemo(() => {
    const byStrategy = new Map(access.entitlements.map((x) => [x.strategy, x]));
    return (['DEVELOPER', 'LANDLORD', 'FLIPPER'] as const).map((strategy) => {
      const row = byStrategy.get(strategy);
      if (row) return row;
      return { strategy, active: false, expiresAt: null };
    });
  }, [access.entitlements]);

  const activeCount = rows.filter((x) => x.active).length;
  const nextExpiry = rows
    .map((x) => x.expiresAt)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(0) ?? null;

  return (
    <div className="space-y-4">
      <div className="gi-card p-4 md:p-5">
        <h3 className="text-lg font-semibold gi-serif">Plan & Access</h3>
        <p className="mt-1 text-sm gi-muted">
          Visibility into strategy entitlement status and expiration timing for this account.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="gi-card-flat p-3">
            <div className="text-xs uppercase tracking-wide gi-muted2">Signed In</div>
            <div className="mt-1 text-sm font-mono text-white/90 break-all">{email}</div>
          </div>
          <div className="gi-card-flat p-3">
            <div className="text-xs uppercase tracking-wide gi-muted2">Active Strategies</div>
            <div className="mt-1 text-sm text-white/90">{activeCount} / 3</div>
          </div>
          <div className="gi-card-flat p-3">
            <div className="text-xs uppercase tracking-wide gi-muted2">Next Expiration</div>
            <div className="mt-1 text-sm text-white/90">{formatDate(nextExpiry ?? access.trialEndsAt)}</div>
          </div>
        </div>
      </div>

      <div className="gi-card-flat p-4">
        <h4 className="text-sm font-semibold text-white/90">Strategy Entitlements</h4>
        <div className="mt-3 overflow-x-auto">
          <table className="gi-table text-sm">
            <thead className="gi-thead">
              <tr>
                <th scope="col">Strategy</th>
                <th scope="col">Status</th>
                <th scope="col">Expires At</th>
                <th scope="col">Remaining</th>
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {rows.map((row) => (
                <tr key={row.strategy}>
                  <td>{STRATEGY_LABEL[row.strategy] ?? row.strategy}</td>
                  <td>
                    <span className={statusClass(row.active)}>{row.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="gi-muted">{formatDate(row.expiresAt)}</td>
                  <td className="gi-muted">{remainingLabel(row.active, row.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs gi-muted2">
          Renewal requests are handled by an admin from the Approvals area.
        </p>
      </div>
    </div>
  );
};

export default AccessOverview;
