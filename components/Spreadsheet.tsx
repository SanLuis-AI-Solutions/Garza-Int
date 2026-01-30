import React, { useState } from 'react';
import { CalculationResults, ProjectData } from '../types';
import { Download, ChevronDown, Clock, Percent, DollarSign, Activity, HelpCircle, X } from 'lucide-react';

interface SpreadsheetProps {
  data: ProjectData;
  results: CalculationResults;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ data, results }) => {
  const [viewLimit, setViewLimit] = useState<number>(10); // Default to 10 years
  const [showGlossary, setShowGlossary] = useState(false);

  const initialCashInvestment = results.totalInvestment - data.financing.loanAmount;

  const downloadCSV = () => {
    // Header
    const headers = ['Year', 'Gross Revenue', 'Operating Expenses', 'Debt Service', 'Net Cash Flow', 'Property Value', 'Equity', 'DSCR', 'Cash-on-Cash %', 'Cumulative Wealth'];
    
    // Rows
    const rows = results.cashFlow.map(row => {
      const netOperatingIncome = row.revenue - row.expenses;
      const dscr = row.debtService > 0 ? (netOperatingIncome / row.debtService).toFixed(2) : '∞';
      const coc = initialCashInvestment > 0 ? ((row.netCashFlow / initialCashInvestment) * 100).toFixed(2) : '0';
      const wealth = (row.equity + (results.cashFlow.slice(0, row.year).reduce((sum, r) => sum + r.netCashFlow, 0))).toFixed(0);

      return [
        row.year,
        row.revenue.toFixed(2),
        row.expenses.toFixed(2),
        row.debtService.toFixed(2),
        row.netCashFlow.toFixed(2),
        (data.revenue.estimatedResaleValue * Math.pow(1 + data.revenue.appreciationRate / 100, row.year)).toFixed(0),
        row.equity.toFixed(0),
        dscr,
        coc + '%',
        wealth
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${data.projectName.replace(/\s+/g, '_')}_financials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleData = results.cashFlow.slice(0, viewLimit);
  const totalNetCashFlow = visibleData.reduce((a, b) => a + b.netCashFlow, 0);
  const totalRevenue = visibleData.reduce((a, b) => a + b.revenue, 0);

  return (
    <div className="space-y-6 relative">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header / Controls */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
          <div className="flex items-center gap-3">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Financial Detail Spreadsheet</h2>
                <p className="text-slate-500 text-sm mt-1">Detailed breakdown including DSCR and Cash-on-Cash returns.</p>
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
              {[5, 10, 30].map(years => (
                <button
                  key={years}
                  onClick={() => setViewLimit(years)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewLimit === years ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
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
        
        {/* Table */}
        <div className="overflow-x-auto relative">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Year</th>
                <th className="px-6 py-4 text-right">Gross Revenue</th>
                <th className="px-6 py-4 text-right">Op. Expenses</th>
                <th className="px-6 py-4 text-right">Debt Service</th>
                <th className="px-6 py-4 text-right font-bold text-indigo-700 bg-indigo-50/50">Net Cash Flow</th>
                <th className="px-6 py-4 text-right text-slate-500">DSCR</th>
                <th className="px-6 py-4 text-right text-slate-500">Cash-on-Cash</th>
                <th className="px-6 py-4 text-right">Est. Value</th>
                <th className="px-6 py-4 text-right">Equity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleData.map((row) => {
                const netOperatingIncome = row.revenue - row.expenses;
                // Debt Service Coverage Ratio: NOI / Debt Service
                const dscr = row.debtService > 0 ? netOperatingIncome / row.debtService : Infinity;
                
                // Cash on Cash Return: Net Cash Flow / Initial Cash Invested
                const coc = initialCashInvestment > 0 ? (row.netCashFlow / initialCashInvestment) * 100 : 0;
                
                // Projected Value
                const projValue = data.revenue.estimatedResaleValue * Math.pow(1 + data.revenue.appreciationRate / 100, row.year);

                return (
                  <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Year {row.year}</td>
                    <td className="px-6 py-4 text-right text-slate-600">${row.revenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className="px-6 py-4 text-right text-slate-500">${row.expenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className="px-6 py-4 text-right text-slate-500">${row.debtService.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className={`px-6 py-4 text-right font-bold bg-indigo-50/30 ${row.netCashFlow >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {row.netCashFlow < 0 ? '-' : ''}${Math.abs(row.netCashFlow).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${dscr < 1.2 ? 'text-orange-500' : 'text-green-600'}`}>
                        {dscr === Infinity ? '∞' : dscr.toFixed(2)}x
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${coc < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                        {coc.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      ${projValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">${row.equity.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-800 border-t border-slate-300">
               <tr>
                 <td className="px-6 py-4 sticky left-0 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total ({viewLimit}y)</td>
                 <td className="px-6 py-4 text-right">${totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                 <td className="px-6 py-4 text-right">-</td>
                 <td className="px-6 py-4 text-right">-</td>
                 <td className={`px-6 py-4 text-right ${totalNetCashFlow >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                    ${totalNetCashFlow.toLocaleString(undefined, {maximumFractionDigits: 0})}
                 </td>
                 <td className="px-6 py-4 text-right text-xs text-slate-500 font-normal italic">Avg DSCR</td>
                 <td className="px-6 py-4 text-right text-xs text-slate-500 font-normal italic">Avg CoC</td>
                 <td className="px-6 py-4 text-right">-</td>
                 <td className="px-6 py-4 text-right">-</td>
               </tr>
            </tfoot>
          </table>
          
          {/* Glossary Panel */}
          {showGlossary && (
            <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl border-l border-slate-200 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 z-20">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-lg text-slate-900">Financial Glossary</h3>
                   <button onClick={() => setShowGlossary(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               <div className="space-y-6">
                   <div>
                       <h4 className="font-semibold text-indigo-700 text-sm">Net Operating Income (NOI)</h4>
                       <p className="text-xs text-slate-600 mt-1">Revenue minus operating expenses, before paying the mortgage. This is the pure profit the building generates.</p>
                   </div>
                   <div>
                       <h4 className="font-semibold text-indigo-700 text-sm">DSCR (Debt Service Coverage Ratio)</h4>
                       <p className="text-xs text-slate-600 mt-1">NOI divided by Annual Debt Service. Lenders usually require 1.20x or higher. <br/> <span className="italic text-slate-400">1.0x means you break even.</span></p>
                   </div>
                   <div>
                       <h4 className="font-semibold text-indigo-700 text-sm">Cash-on-Cash Return</h4>
                       <p className="text-xs text-slate-600 mt-1">Annual Net Cash Flow divided by the Initial Cash Investment (Down payment + Closing costs). It shows the velocity of your money.</p>
                   </div>
                   <div>
                       <h4 className="font-semibold text-indigo-700 text-sm">Equity</h4>
                       <p className="text-xs text-slate-600 mt-1">Market Value minus Remaining Loan Balance. Equity grows via appreciation (market goes up) and amortization (loan paydown).</p>
                   </div>
               </div>
            </div>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><DollarSign size={20}/></div>
                 <h3 className="font-semibold text-blue-900">Total Net Profit</h3>
              </div>
              <p className="text-3xl font-bold text-blue-700">${totalNetCashFlow.toLocaleString()}</p>
              <p className="text-sm text-blue-600/80 mt-1">Cumulative cash flow over {viewLimit} years</p>
          </div>
          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-green-100 rounded-lg text-green-600"><Activity size={20}/></div>
                 <h3 className="font-semibold text-green-900">Exit Equity</h3>
              </div>
              <p className="text-3xl font-bold text-green-700">${visibleData[visibleData.length-1].equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-green-600/80 mt-1">Projected equity at Year {viewLimit}</p>
          </div>
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Percent size={20}/></div>
                 <h3 className="font-semibold text-indigo-900">Initial Investment</h3>
              </div>
              <p className="text-3xl font-bold text-indigo-700">${initialCashInvestment.toLocaleString()}</p>
              <p className="text-sm text-indigo-600/80 mt-1">Cash required to close</p>
          </div>
      </div>
    </div>
  );
};

export default Spreadsheet;