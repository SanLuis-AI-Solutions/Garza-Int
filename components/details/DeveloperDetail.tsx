import React from 'react';
import { Download } from 'lucide-react';
import type { DeveloperResults } from '../../domain/strategies/types';

const DeveloperDetail: React.FC<{ results: DeveloperResults }> = ({ results }) => {
  const horizons = [1, 5, 10, 30] as const;
  const cycleMonths = Math.max(1, results.totals.monthsToBuild);
  const scaleForYears = (years: number) => (years * 12) / cycleMonths;

  const downloadMilestonesCSV = () => {
    const headers = [
      'Year',
      'Scale (Deals per year extrapolated)',
      'Net Profit (per deal)',
      'Cumulative Net Profit (extrapolated)',
      'Total Project Cost (per deal)',
      'Annualized ROI (on total cost) %',
      'Profit Margin %',
    ];

    const rows = horizons.map((y) => {
      const scale = scaleForYears(y);
      return [
        y,
        scale.toFixed(2),
        results.totals.netProfit.toFixed(2),
        (results.totals.netProfit * scale).toFixed(2),
        results.totals.totalProjectCost.toFixed(2),
        (results.totals.annualizedRoiOnTotalCost * 100).toFixed(2),
        (results.totals.profitMargin * 100).toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `developer_milestones_1_5_10_30.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rows = [
    { label: 'Loan Amount (derived LTC)', value: results.totals.loanAmount },
    { label: 'Interest Reserve', value: results.totals.interestReserve },
    { label: 'Total Project Cost', value: results.totals.totalProjectCost },
    { label: 'Equity Required (est.)', value: results.totals.equityRequired },
    { label: 'Selling Costs', value: results.totals.sellCosts },
    { label: 'Developer Spread', value: results.totals.developerSpread },
    { label: 'Net Profit', value: results.totals.netProfit },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="gi-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold gi-serif">Milestones (1 / 5 / 10 / 30 Years)</h3>
            <p className="mt-1 text-sm gi-muted">
              Extrapolated if you repeat a similar project back-to-back. This is not a market forecast.
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
                  label: 'Annualized ROI (on total cost)',
                  fmt: (v: number) => (v * 100).toFixed(2) + '%',
                  values: horizons.map(() => results.totals.annualizedRoiOnTotalCost),
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
        <p className="mt-1 text-sm gi-muted">Key totals and breakdown used in the Developer view.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.label} className="gi-card-flat p-4">
              <div className="text-sm gi-muted2">{r.label}</div>
              <div className="mt-1 text-lg font-semibold text-white/95">
                ${r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="gi-card p-6">
        <h3 className="text-lg font-bold gi-serif">Cost Lines</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="gi-table text-sm">
            <thead className="gi-thead">
              <tr>
                <th>Line</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {(results.costLines ?? results.breakdown).map((b) => (
                <tr key={b.name} className="gi-trHover">
                  <td>{b.name}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    ${b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold text-white/95">Total Project Cost</td>
                <td style={{ textAlign: 'right' }} className="font-mono font-semibold text-white/95">
                  ${results.totals.totalProjectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDetail;
