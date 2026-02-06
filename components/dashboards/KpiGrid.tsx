import React from 'react';
import type { Kpi } from '../../domain/strategies/types';

const formatValue = (k: Kpi) => {
  switch (k.format) {
    case 'currency':
      return `$${k.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case 'percent':
      return `${k.value.toFixed(2)}%`;
    case 'number':
      return k.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
};

const KpiGrid: React.FC<{ kpis: Kpi[] }> = ({ kpis }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {kpis.map((k) => (
      <div key={k.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="text-sm font-medium text-slate-500">{k.label}</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{formatValue(k)}</div>
        {k.help && <div className="mt-2 text-xs text-slate-500">{k.help}</div>}
      </div>
    ))}
  </div>
);

export default KpiGrid;

