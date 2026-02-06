import React from 'react';
import type { DeveloperResults } from '../../domain/strategies/types';
import KpiGrid from './KpiGrid';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { chartTheme } from '../charts/theme';

const DeveloperDashboard: React.FC<{ results: DeveloperResults }> = ({ results }) => {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={results.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gi-card p-6">
          <h3 className="text-lg font-bold gi-serif mb-4">Cost Breakdown</h3>
          <div className="h-80">
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

        <div className="gi-card p-6">
          <h3 className="text-lg font-bold gi-serif mb-4">Profit Waterfall (Simplified)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results.waterfall}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
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
                <Bar dataKey="value" fill={chartTheme.accentBar} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs gi-muted2">
            Note: This is a simplified waterfall view for quick scanning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
