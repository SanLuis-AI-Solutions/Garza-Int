import React from 'react';
import { Download } from 'lucide-react';
import type { FlipperResults } from '../../domain/strategies/types';

const FlipperDetail: React.FC<{ results: FlipperResults }> = ({ results }) => {
  const horizons = [1, 5, 10, 30] as const;
  const cycleMonths = Math.max(1, results.totals.projectDurationMonths);
  const scaleForYears = (years: number) => (years * 12) / cycleMonths;

  const downloadMilestonesCSV = () => {
    const headers = [
      'Year',
      'Scale (Deals per year extrapolated)',
      'Net Profit (per deal)',
      'Cumulative Net Profit (extrapolated)',
      'Annualized ROI %',
      'Profit Margin %',
      'Daily Holding Cost',
      'Cash Invested (per deal)',
    ];

    const rows = horizons.map((y) => {
      const scale = scaleForYears(y);
      return [
        y,
        scale.toFixed(2),
        results.totals.netProfit.toFixed(2),
        (results.totals.netProfit * scale).toFixed(2),
        (results.totals.annualizedRoi * 100).toFixed(2),
        (results.totals.profitMargin * 100).toFixed(2),
        results.totals.dailyHoldingCost.toFixed(4),
        results.totals.cashInvested.toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flipper_milestones_1_5_10_30.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rows = [
    { label: 'MAO (70% Rule)', value: results.totals.mao },
    { label: 'Daily Holding Cost', value: results.totals.dailyHoldingCost },
    { label: 'Interest Cost', value: results.totals.interestCost },
    { label: 'Total Deal Cost', value: results.totals.totalCost },
    { label: 'Net Profit', value: results.totals.netProfit },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="gi-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold gi-serif">Milestones (1 / 5 / 10 / 30 Years)</h3>
            <p className="mt-1 text-sm gi-muted">
              Extrapolated if you repeat a similar flip back-to-back. This is not a market forecast.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadMilestonesCSV}
            className="flex items-center gap-2 gi-btn gi-btn-secondary px-4 py-2.5 text-sm font-semibold"
            title="Export milestones CSV"
          >
            <Download size={16} />
            Export Milestones
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="gi-table text-sm">
            <thead className="gi-thead">
              <tr>
                <th>Metric</th>
                {horizons.map((y) => (
                  <th key={y} style={{ textAlign: 'right' }}>
                    {y}y
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {[
                {
                  label: 'Scale (deals)',
                  fmt: (v: number) => v.toFixed(2) + 'x',
                  values: horizons.map((y) => scaleForYears(y)),
                },
                {
                  label: 'Net Profit (per deal)',
                  fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  values: horizons.map(() => results.totals.netProfit),
                },
                {
                  label: 'Cumulative Net Profit (extrapolated)',
                  fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  values: horizons.map((y) => results.totals.netProfit * scaleForYears(y)),
                },
                {
                  label: 'Annualized ROI',
                  fmt: (v: number) => (v * 100).toFixed(2) + '%',
                  values: horizons.map(() => results.totals.annualizedRoi),
                },
                {
                  label: 'Profit Margin (on ARV)',
                  fmt: (v: number) => (v * 100).toFixed(2) + '%',
                  values: horizons.map(() => results.totals.profitMargin),
                },
              ].map((row) => (
                <tr key={row.label} className="gi-trHover">
                  <td className="gi-muted">{row.label}</td>
                  {row.values.map((v, idx) => (
                    <td key={idx} style={{ textAlign: 'right' }} className="font-semibold text-white/95">
                      {row.fmt(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gi-card p-6">
        <h2 className="text-xl font-bold gi-serif">Deal Detail</h2>
        <p className="mt-1 text-sm gi-muted">Key totals and cost drivers for the Flipper view.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.label} className="gi-card-flat p-4">
              <div className="text-sm gi-muted2">{r.label}</div>
              <div className="mt-1 text-lg font-semibold text-white/95">
                ${r.value.toLocaleString(undefined, { maximumFractionDigits: r.label.includes('Daily') ? 2 : 0 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="gi-card p-6">
        <h3 className="text-lg font-bold gi-serif">Cost Breakdown</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="gi-table text-sm">
            <thead className="gi-thead">
              <tr>
                <th>Line</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {results.breakdown.map((b) => (
                <tr key={b.name} className="gi-trHover">
                  <td>{b.name}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    ${b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold text-white/95">Total Deal Cost</td>
                <td style={{ textAlign: 'right' }} className="font-mono font-semibold text-white/95">
                  ${results.totals.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FlipperDetail;
