import React, { useMemo, useState } from 'react';
import type { LandlordResults } from '../../domain/strategies/types';
import { Download, HelpCircle, X } from 'lucide-react';

const LandlordSpreadsheet: React.FC<{ results: LandlordResults }> = ({ results }) => {
  const [viewLimit, setViewLimit] = useState<number>(10);
  const [showGlossary, setShowGlossary] = useState(false);

  const visible = useMemo(() => results.cashFlow.slice(0, viewLimit), [results.cashFlow, viewLimit]);

  const downloadCSV = () => {
    const headers = [
      'Year',
      'Gross Revenue',
      'Effective Revenue',
      'OpEx',
      'NOI',
      'Debt Service',
      'Cash Flow',
      'Property Value',
      'Loan Balance',
      'Equity',
      'DSCR',
      'Cash-on-Cash %',
    ];

    const rows = visible.map((r) =>
      [
        r.year,
        r.grossRevenue.toFixed(2),
        r.effectiveRevenue.toFixed(2),
        r.opex.toFixed(2),
        r.noi.toFixed(2),
        r.debtService.toFixed(2),
        r.cashFlow.toFixed(2),
        r.propertyValue.toFixed(2),
        r.loanBalance.toFixed(2),
        r.equity.toFixed(2),
        Number.isFinite(r.dscr) ? r.dscr.toFixed(2) : '∞',
        (r.cashOnCash * 100).toFixed(2) + '%',
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `landlord_financials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCashFlow = visible.reduce((s, r) => s + r.cashFlow, 0);

  return (
    <div className="space-y-6 relative max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Financial Detail Spreadsheet</h2>
              <p className="text-slate-500 text-sm mt-1">NOI, DSCR, cash flow, and equity by year.</p>
            </div>
            <button
              onClick={() => setShowGlossary(!showGlossary)}
              className="ml-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-full transition-colors"
              title="Financial Glossary"
            >
              <HelpCircle size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              {[5, 10, 30].map((years) => (
                <button
                  key={years}
                  onClick={() => setViewLimit(years)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    viewLimit === years ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {years}y
                </button>
              ))}
            </div>

            <button
              onClick={downloadCSV}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10">Year</th>
                <th className="px-6 py-4 text-right">Effective Rev</th>
                <th className="px-6 py-4 text-right">OpEx</th>
                <th className="px-6 py-4 text-right">NOI</th>
                <th className="px-6 py-4 text-right">Debt</th>
                <th className="px-6 py-4 text-right font-bold text-indigo-700 bg-indigo-50/50">Cash Flow</th>
                <th className="px-6 py-4 text-right">DSCR</th>
                <th className="px-6 py-4 text-right">CoC</th>
                <th className="px-6 py-4 text-right">Equity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr key={r.year} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 sticky left-0 bg-white">Year {r.year}</td>
                  <td className="px-6 py-4 text-right">${r.effectiveRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-6 py-4 text-right">${r.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-6 py-4 text-right">${r.noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-6 py-4 text-right">${r.debtService.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className={`px-6 py-4 text-right font-bold bg-indigo-50/30 ${r.cashFlow >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                    {r.cashFlow < 0 ? '-' : ''}${Math.abs(r.cashFlow).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-4 text-right">{Number.isFinite(r.dscr) ? r.dscr.toFixed(2) + 'x' : '∞'}</td>
                  <td className="px-6 py-4 text-right">{(r.cashOnCash * 100).toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right">${r.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-800 border-t border-slate-300">
              <tr>
                <td className="px-6 py-4 sticky left-0 bg-slate-100">Total ({viewLimit}y)</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">${totalCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">-</td>
              </tr>
            </tfoot>
          </table>

          {showGlossary && (
            <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl border-l border-slate-200 p-6 overflow-y-auto z-20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-900">Glossary</h3>
                <button onClick={() => setShowGlossary(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="space-y-6 text-xs text-slate-600">
                <div>
                  <div className="font-semibold text-slate-900">NOI</div>
                  Revenue minus operating expenses, before debt service.
                </div>
                <div>
                  <div className="font-semibold text-slate-900">DSCR</div>
                  NOI divided by annual debt service.
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Cash-on-Cash</div>
                  Annual cash flow divided by total cash invested.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandlordSpreadsheet;

