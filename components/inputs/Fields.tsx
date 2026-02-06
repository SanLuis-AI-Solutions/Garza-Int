import React from 'react';

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
