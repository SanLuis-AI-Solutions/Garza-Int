import React, { useMemo } from 'react';
import type { LandlordResults } from '../../domain/strategies/types';
import KpiGrid from './KpiGrid';
import { chartTheme } from '../charts/theme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const LandlordDashboard: React.FC<{ results: LandlordResults }> = ({ results }) => {
  const cash5 = useMemo(() => results.cashFlow.slice(0, 10), [results.cashFlow]);
  const cashFlowChart = cash5.map((r) => ({
    year: `Yr ${r.year}`,
    noi: r.noi,
    debt: r.debtService,
    cash: r.cashFlow,
  }));

  return (
    <div className="space-y-6">
      <KpiGrid kpis={results.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gi-card p-6">
          <h3 className="text-lg font-bold gi-serif mb-4">Annual Cash Flow (10 Years)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: chartTheme.tick }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.tick, fontSize: 12 }}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  formatter={(v: any) => `$${Number(v).toLocaleString()}`}
                  contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}` }}
                  labelStyle={{ color: 'rgba(234,242,247,0.82)' }}
                />
                <Legend wrapperStyle={{ color: chartTheme.tick }} />
                <Bar dataKey="noi" name="NOI" fill={chartTheme.palette[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="debt" name="Debt Service" fill={chartTheme.palette[3]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cash" name="Cash Flow" fill={chartTheme.palette[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gi-card p-6">
          <h3 className="text-lg font-bold gi-serif mb-4">Equity Growth (30 Years)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results.cashFlow}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis
                  dataKey="year"
                  tickFormatter={(y) => `Yr ${y}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.tick, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.tick, fontSize: 12 }}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  formatter={(v: any) => `$${Number(v).toLocaleString()}`}
                  contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}` }}
                  labelStyle={{ color: 'rgba(234,242,247,0.82)' }}
                />
                <Legend wrapperStyle={{ color: chartTheme.tick }} />
                <Line type="monotone" dataKey="equity" name="Equity" stroke={chartTheme.palette[2]} strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="loanBalance" name="Loan Balance" stroke={chartTheme.palette[3]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="gi-card p-6">
        <h3 className="text-lg font-bold gi-serif mb-4">Operating Expenses Breakdown (Annual)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={results.breakdown} dataKey="value" nameKey="name" outerRadius={110} label>
                {results.breakdown.map((_, idx) => (
                  <Cell key={idx} fill={chartTheme.palette[idx % chartTheme.palette.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any) => `$${Number(v).toLocaleString()}`}
                contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}` }}
                labelStyle={{ color: 'rgba(234,242,247,0.82)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
