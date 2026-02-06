import React, { useId, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CostCadence, CostItem } from '../../domain/strategies/types';

export const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="gi-card p-6">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
      <div className="lg:col-span-4">
        <h3 className="text-lg font-bold gi-serif">{title}</h3>
        {subtitle && <p className="mt-1 text-sm gi-muted">{subtitle}</p>}
      </div>
      <div className="lg:col-span-8">
        {children}
      </div>
    </div>
  </div>
);

export const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  help?: string;
  name?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, prefix, suffix, help, name, autoComplete, min, max, step }) => {
  const reactId = useId();
  const inputId = `nf_${reactId}`;
  const helpId = help ? `${inputId}_help` : undefined;

  const derivedName = (name ?? label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return (
    <div>
      <label className="block text-sm font-medium text-white/90" htmlFor={inputId}>
        {label}
      </label>
      {help && (
        <div id={helpId} className="mt-1 text-xs gi-muted2">
          {help}
        </div>
      )}
      <div className="mt-2 gi-inputGroup">
        {prefix && <div className="gi-inputGroup__addon gi-inputGroup__addon--prefix">{prefix}</div>}
        <input
          id={inputId}
          name={derivedName}
          autoComplete={autoComplete}
          inputMode="decimal"
          type="number"
          min={min}
          max={max}
          step={step}
          aria-describedby={helpId}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="gi-inputGroup__input"
        />
        {suffix && <div className="gi-inputGroup__addon gi-inputGroup__addon--suffix">{suffix}</div>}
      </div>
    </div>
  );
};

const makeId = () =>
  (globalThis.crypto as any)?.randomUUID?.() ?? `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const CostItemsEditor: React.FC<{
  label?: string;
  help?: string;
  items: CostItem[] | undefined;
  onChange: (next: CostItem[]) => void;
  cadenceMode?: 'all' | 'one_time_only';
  monthsForProration?: number;
}> = ({ label = 'Additional line items', help, items, onChange, cadenceMode = 'all', monthsForProration }) => {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const cadenceHint =
    cadenceMode === 'all' && monthsForProration && monthsForProration > 0
      ? `ONE_TIME adds once. MONTHLY is multiplied by ${monthsForProration} months. ANNUAL is prorated by ${monthsForProration}/12.`
      : cadenceMode === 'all'
      ? 'ONE_TIME adds once. MONTHLY is multiplied by months. ANNUAL is prorated by months/12.'
      : 'These are treated as one-time costs (upfront).';

  const updateAt = (idx: number, patch: Partial<CostItem>) => {
    const next = safeItems.map((it, i) =>
      i === idx ? { ...it, ...patch, ...(cadenceMode === 'one_time_only' ? { cadence: 'ONE_TIME' } : {}) } : it
    );
    onChange(next);
  };

  const add = () => {
    onChange([
      ...safeItems,
      {
        id: makeId(),
        name: '',
        amount: 0,
        cadence: 'ONE_TIME',
      },
    ]);
  };

  const remove = (id: string) => onChange(safeItems.filter((x) => x.id !== id));

  return (
    <div className="mt-6 pt-5 border-t border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white/95">{label}</div>
          <div className="mt-1 text-xs gi-muted2">{help ?? cadenceHint}</div>
        </div>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-2 gi-btn gi-btn-secondary px-3 py-2 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      </div>

      {safeItems.length === 0 ? (
        <div className="mt-3 text-sm gi-muted">No additional items.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {safeItems.map((it, idx) => (
            <div key={it.id} className="gi-card-flat p-3">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-6">
                  <label
                    className="block text-xs font-semibold gi-muted2 uppercase tracking-wide"
                    htmlFor={`ci_${it.id}_name`}
                  >
                    Name
                  </label>
                  <input
                    id={`ci_${it.id}_name`}
                    type="text"
                    value={it.name ?? ''}
                    onChange={(e) => updateAt(idx, { name: e.target.value })}
                    className="mt-2 gi-input px-3 py-2 text-sm w-full"
                    placeholder="e.g., Survey, Legal, Utilities, Staging"
                  />
                </div>

                {cadenceMode === 'all' ? (
                  <div className="lg:col-span-3">
                    <label
                      className="block text-xs font-semibold gi-muted2 uppercase tracking-wide"
                      htmlFor={`ci_${it.id}_cadence`}
                    >
                      Cadence
                    </label>
                    <select
                      id={`ci_${it.id}_cadence`}
                      value={(it.cadence ?? 'ONE_TIME') as CostCadence}
                      onChange={(e) => updateAt(idx, { cadence: e.target.value as CostCadence })}
                      className="mt-2 gi-input px-3 py-2 text-sm w-full"
                    >
                      <option value="ONE_TIME">One-time</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="ANNUAL">Annual</option>
                    </select>
                  </div>
                ) : (
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-semibold gi-muted2 uppercase tracking-wide">Cadence</label>
                    <div className="mt-2 gi-input px-3 py-2 text-sm w-full gi-muted">One-time</div>
                  </div>
                )}

                <div className="lg:col-span-2">
                  <label
                    className="block text-xs font-semibold gi-muted2 uppercase tracking-wide"
                    htmlFor={`ci_${it.id}_amount`}
                  >
                    Amount
                  </label>
                  <div className="mt-2 gi-inputGroup">
                    <div className="gi-inputGroup__addon gi-inputGroup__addon--prefix">$</div>
                    <input
                      id={`ci_${it.id}_amount`}
                      type="number"
                      inputMode="decimal"
                      value={Number.isFinite(it.amount) ? it.amount : 0}
                      onChange={(e) => updateAt(idx, { amount: parseFloat(e.target.value) || 0 })}
                      className="gi-inputGroup__input"
                    />
                  </div>
                </div>

                <div className="lg:col-span-1 flex lg:justify-end">
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    className="gi-btn gi-btn-ghost gi-iconBtn"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
