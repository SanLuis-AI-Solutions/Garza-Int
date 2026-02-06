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
      <div className="relative w-full max-w-2xl gi-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold gi-serif">New Project</h2>
          <p className="mt-1 text-sm gi-muted">Choose your investment strategy, then name your project.</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-sm font-semibold text-white/90 mb-3">Strategy</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrategy(s.id)}
                  className={`text-left px-4 py-4 gi-choice ${strategy === s.id ? 'gi-choice--active' : ''}`}
                >
                  <div className="font-semibold text-white/95">{s.label}</div>
                  <div className="mt-1 text-xs gi-muted2">{s.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full gi-input px-3 py-2.5 text-sm"
              placeholder="e.g. 4-Plex Ground-Up in Austin"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3 justify-end bg-black/10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 gi-btn gi-btn-ghost disabled:opacity-60 text-sm font-medium"
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
            className="px-4 py-2.5 gi-btn gi-btn-primary disabled:opacity-60 text-sm font-semibold"
          >
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
