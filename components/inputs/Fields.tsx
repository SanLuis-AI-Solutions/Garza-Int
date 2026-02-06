import React from 'react';

export const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-6">{children}</div>
  </div>
);

export const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  help?: string;
}> = ({ label, value, onChange, prefix, suffix, help }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    {help && <div className="mt-1 text-xs text-slate-500">{help}</div>}
    <div className="mt-2 flex items-stretch rounded-lg border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
      {prefix && <div className="px-3 flex items-center text-sm text-slate-500 bg-slate-50 border-r border-slate-200">{prefix}</div>}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-3 py-2.5 text-sm outline-none"
      />
      {suffix && <div className="px-3 flex items-center text-sm text-slate-500 bg-slate-50 border-l border-slate-200">{suffix}</div>}
    </div>
  </div>
);

