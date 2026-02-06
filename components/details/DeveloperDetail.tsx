import React from 'react';
import type { DeveloperResults } from '../../domain/strategies/types';

const DeveloperDetail: React.FC<{ results: DeveloperResults }> = ({ results }) => {
  const rows = [
    { label: 'Loan Amount (derived LTC)', value: results.totals.loanAmount },
    { label: 'Interest Reserve', value: results.totals.interestReserve },
    { label: 'Total Project Cost', value: results.totals.totalProjectCost },
    { label: 'Developer Spread', value: results.totals.developerSpread },
    { label: 'Net Profit', value: results.totals.netProfit },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
              {results.breakdown.map((b) => (
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
