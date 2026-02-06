import React, { useMemo, useState } from 'react';
import type { LandlordResults } from '../../domain/strategies/types';
import { Download, HelpCircle, X } from 'lucide-react';

const LandlordSpreadsheet: React.FC<{ results: LandlordResults }> = ({ results }) => {
  const [viewLimit, setViewLimit] = useState<number>(10);
  const [showGlossary, setShowGlossary] = useState(false);

  const visible = useMemo(() => results.cashFlow.slice(0, viewLimit), [results.cashFlow, viewLimit]);

  const horizons = [1, 5, 10, 30] as const;
  const atYear = (year: number) => results.cashFlow[Math.min(Math.max(1, year), results.cashFlow.length) - 1];
  const cumulativeCashFlow = (year: number) =>
    results.cashFlow.slice(0, Math.min(Math.max(1, year), results.cashFlow.length)).reduce((s, r) => s + r.cashFlow, 0);

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

  const downloadMilestonesCSV = () => {
    const headers = [
      'Year',
      'Annual Cash Flow',
      'Cumulative Cash Flow',
      'Property Value',
      'Loan Balance',
      'Equity',
      'DSCR',
      'Cash-on-Cash %',
    ];

    const rows = horizons.map((y) => {
      const r = atYear(y);
      return [
        y,
        r.cashFlow.toFixed(2),
        cumulativeCashFlow(y).toFixed(2),
        r.propertyValue.toFixed(2),
        r.loanBalance.toFixed(2),
        r.equity.toFixed(2),
        Number.isFinite(r.dscr) ? r.dscr.toFixed(2) : '∞',
        (r.cashOnCash * 100).toFixed(2) + '%',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `landlord_milestones_1_5_10_30.csv`);
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
              {[1, 5, 10, 30].map((years) => (
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
              onClick={downloadMilestonesCSV}
              className="flex items-center space-x-2 gi-btn gi-btn-secondary px-4 py-2.5 text-sm font-semibold"
              title="Export 1/5/10/30-year milestones"
            >
              <Download size={16} />
              <span>Export Milestones</span>
            </button>

            <button
              onClick={downloadCSV}
              className="flex items-center space-x-2 gi-btn gi-btn-primary px-4 py-2.5 text-sm font-semibold"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold gi-serif">Milestones (1 / 5 / 10 / 30 Years)</h3>
              <p className="mt-1 text-sm gi-muted">
                Quick progress view for cash flow, equity growth, and leverage over time.
              </p>
            </div>
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
                    label: 'Annual Cash Flow',
                    fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    values: horizons.map((y) => atYear(y).cashFlow),
                  },
                  {
                    label: 'Cumulative Cash Flow',
                    fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    values: horizons.map((y) => cumulativeCashFlow(y)),
                  },
                  {
                    label: 'Property Value',
                    fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    values: horizons.map((y) => atYear(y).propertyValue),
                  },
                  {
                    label: 'Loan Balance',
                    fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    values: horizons.map((y) => atYear(y).loanBalance),
                  },
                  {
                    label: 'Equity',
                    fmt: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    values: horizons.map((y) => atYear(y).equity),
                  },
                  {
                    label: 'DSCR',
                    fmt: (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)}x` : '∞'),
                    values: horizons.map((y) => atYear(y).dscr),
                  },
                  {
                    label: 'Cash-on-Cash',
                    fmt: (v: number) => `${(v * 100).toFixed(2)}%`,
                    values: horizons.map((y) => atYear(y).cashOnCash),
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

      <div className="gi-card p-6">
        <h3 className="text-lg font-bold gi-serif">OpEx Lines (Annual)</h3>
        <p className="mt-1 text-sm gi-muted">These feed NOI and Cash Flow calculations.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="gi-table text-sm">
            <thead className="gi-thead">
              <tr>
                <th>Line</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody className="gi-tbody">
              {(results.opexLines ?? results.breakdown).map((b) => (
                <tr key={b.name} className="gi-trHover">
                  <td>{b.name}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    ${b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold text-white/95">Total OpEx</td>
                <td style={{ textAlign: 'right' }} className="font-mono font-semibold text-white/95">
                  ${atYear(1).opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LandlordSpreadsheet;
