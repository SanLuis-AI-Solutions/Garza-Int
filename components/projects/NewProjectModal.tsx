import React, { useMemo, useState } from 'react';
import type { InvestmentStrategy } from '../../domain/strategies/types';

const STRATEGIES: { id: InvestmentStrategy; label: string; subtitle: string }[] = [
  { id: 'DEVELOPER', label: 'Ground-Up Development', subtitle: 'Equity creation, draws, margin' },
  { id: 'LANDLORD', label: 'Buy & Hold (Rental)', subtitle: 'Cash flow, cap rate, long-term wealth' },
  { id: 'FLIPPER', label: 'Fix & Flip', subtitle: 'Velocity, holding costs, MAO' },
];

const NewProjectModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (args: { name: string; strategy: InvestmentStrategy }) => Promise<void>;
}> = ({ open, onClose, onCreate }) => {
  const [strategy, setStrategy] = useState<InvestmentStrategy>('LANDLORD');
  const [name, setName] = useState('New Project');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">New Project</h2>
          <p className="mt-1 text-sm text-slate-600">Choose your investment strategy, then name your project.</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Strategy</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrategy(s.id)}
                  className={`text-left rounded-xl border px-4 py-4 transition-colors ${
                    strategy === s.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{s.label}</div>
                  <div className="mt-1 text-xs text-slate-600">{s.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 4-Plex Ground-Up in Austin"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3 justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return;
              setSubmitting(true);
              try {
                await onCreate({ name: name.trim(), strategy });
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold"
          >
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;

