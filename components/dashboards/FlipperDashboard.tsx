import React from 'react';
import type { FlipperResults } from '../../domain/strategies/types';
import KpiGrid from './KpiGrid';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { chartTheme } from '../charts/theme';
import WaterfallChart from '../charts/WaterfallChart';

const FlipperDashboard: React.FC<{ results: FlipperResults }> = ({ results }) => {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={results.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gi-card p-6">
          <h3 className="text-lg font-bold gi-serif mb-4">Project Cost Breakdown</h3>
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
          <h3 className="text-lg font-bold gi-serif mb-4">Profit Waterfall</h3>
          <div className="h-80">
            <WaterfallChart steps={results.waterfall} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipperDashboard;
