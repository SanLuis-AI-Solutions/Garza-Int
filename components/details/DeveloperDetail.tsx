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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Deal Detail</h2>
        <p className="mt-1 text-sm text-slate-600">Key totals and breakdown used in the Developer view.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.label} className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-500">{r.label}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                ${r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900">Cost Lines</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Line</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {results.breakdown.map((b) => (
                <tr key={b.name} className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-800">{b.name}</td>
                  <td className="py-3 text-right font-mono text-slate-900">
                    ${b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900">Total Project Cost</td>
                <td className="py-3 text-right font-mono font-semibold text-slate-900">
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

