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
      <div className="gi-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold gi-serif">Financial Detail Spreadsheet</h2>
              <p className="gi-muted text-sm mt-1">NOI, DSCR, cash flow, and equity by year.</p>
            </div>
            <button
              onClick={() => setShowGlossary(!showGlossary)}
              className="ml-2 gi-btn gi-btn-secondary gi-iconBtn"
              title="Financial Glossary"
              aria-label="Toggle glossary"
            >
              <HelpCircle size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="gi-seg w-full sm:w-auto">
              {[5, 10, 30].map((years) => (
                <button
                  key={years}
                  onClick={() => setViewLimit(years)}
                  className={`gi-segBtn ${viewLimit === years ? 'gi-segBtn--active' : ''}`}
                >
                  {years}y
                </button>
              ))}
            </div>

            <button
              onClick={downloadCSV}
              className="flex items-center space-x-2 gi-btn gi-btn-primary px-4 py-2.5 text-sm font-semibold"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          <table className="gi-table text-sm">
            <thead className="gi-thead">
              <tr>
                <th className="gi-stickyLeft" style={{ zIndex: 10 }}>Year</th>
                <th style={{ textAlign: 'right' }}>Effective Rev</th>
                <th style={{ textAlign: 'right' }}>OpEx</th>
                <th style={{ textAlign: 'right' }}>NOI</th>
                <th style={{ textAlign: 'right' }}>Debt</th>
                <th style={{ textAlign: 'right' }}>Cash Flow</th>
                <th style={{ textAlign: 'right' }}>DSCR</th>
                <th style={{ textAlign: 'right' }}>CoC</th>
                <th style={{ textAlign: 'right' }}>Equity</th>
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {visible.map((r) => (
                <tr key={r.year} className="gi-trHover">
                  <td className="gi-stickyLeft font-semibold" style={{ zIndex: 5 }}>Year {r.year}</td>
                  <td style={{ textAlign: 'right' }}>${r.effectiveRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ textAlign: 'right' }}>${r.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ textAlign: 'right' }}>${r.noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ textAlign: 'right' }}>${r.debtService.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ textAlign: 'right' }} className={`font-semibold ${r.cashFlow >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                    {r.cashFlow < 0 ? '-' : ''}${Math.abs(r.cashFlow).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ textAlign: 'right' }} className="gi-muted">{Number.isFinite(r.dscr) ? r.dscr.toFixed(2) + 'x' : '∞'}</td>
                  <td style={{ textAlign: 'right' }} className="gi-muted">{(r.cashOnCash * 100).toFixed(2)}%</td>
                  <td style={{ textAlign: 'right' }}>${r.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="gi-stickyLeft font-semibold" style={{ zIndex: 5 }}>Total ({viewLimit}y)</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
                <td style={{ textAlign: 'right' }} className="font-semibold">${totalCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
                <td style={{ textAlign: 'right' }} className="gi-muted">-</td>
              </tr>
            </tfoot>
          </table>

          {showGlossary && (
            <div className="absolute top-0 right-0 w-80 h-full gi-card p-6 overflow-y-auto z-20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg gi-serif">Glossary</h3>
                <button
                  onClick={() => setShowGlossary(false)}
                  aria-label="Close glossary"
                  className="gi-btn gi-btn-ghost gi-iconBtn"
                >
                  <X />
                </button>
              </div>
              <div className="space-y-6 text-xs text-white/85 leading-relaxed">
                <div>
                  <div className="font-semibold text-white/95">NOI</div>
                  Revenue minus operating expenses, before debt service.
                </div>
                <div>
                  <div className="font-semibold text-white/95">DSCR</div>
                  NOI divided by annual debt service.
                </div>
                <div>
                  <div className="font-semibold text-white/95">Cash-on-Cash</div>
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
