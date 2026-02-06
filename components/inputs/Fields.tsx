import React from 'react';

export const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="gi-card p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold gi-serif">{title}</h3>
        {subtitle && <p className="mt-1 text-sm gi-muted">{subtitle}</p>}
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
    <label className="block text-sm font-medium text-white/90">{label}</label>
    {help && <div className="mt-1 text-xs gi-muted2">{help}</div>}
    <div className="mt-2 gi-inputGroup">
      {prefix && <div className="gi-inputGroup__addon gi-inputGroup__addon--prefix">{prefix}</div>}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="gi-inputGroup__input"
      />
      {suffix && <div className="gi-inputGroup__addon gi-inputGroup__addon--suffix">{suffix}</div>}
    </div>
  </div>
);
