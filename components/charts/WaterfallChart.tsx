import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartTheme } from './theme';

type Step = { name: string; value: number };

type WaterfallRow = {
  name: string;
  base: number;
  delta: number;
  start: number;
  end: number;
  kind: 'total' | 'inc' | 'dec';
};

const fmtMoney = (v: number) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const WaterfallTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.[0]?.payload) return null;
  const row: WaterfallRow = payload[0].payload;
  const change = row.end - row.start;
  return (
    <div
      style={{
        background: chartTheme.tooltipBg,
        border: `1px solid ${chartTheme.tooltipBorder}`,
        borderRadius: 12,
        padding: 12,
        color: 'rgba(234,242,247,0.92)',
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        <div>
          Start: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{fmtMoney(row.start)}</span>
        </div>
        <div>
          Change:{' '}
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
            {change < 0 ? '-' : ''}{fmtMoney(Math.abs(change))}
          </span>
        </div>
        <div>
          End: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{fmtMoney(row.end)}</span>
        </div>
      </div>
    </div>
  );
};

export const WaterfallChart: React.FC<{
  steps: Step[];
  // Assumption used by our strategy calculators: first step is absolute (ARV), last step is a total (Net Profit).
  absoluteFirst?: boolean;
  totalLast?: boolean;
}> = ({ steps, absoluteFirst = true, totalLast = true }) => {
  const data = useMemo(() => {
    if (!steps?.length) return [] as WaterfallRow[];

    const lastIdx = steps.length - 1;
    const rows: WaterfallRow[] = [];
    let running = 0;

    for (let idx = 0; idx < steps.length; idx++) {
      const s = steps[idx];

      if (idx === 0 && absoluteFirst) {
        const start = 0;
        const end = Number(s.value) || 0;
        running = end;
        rows.push({
          name: s.name,
          base: Math.min(start, end),
          delta: Math.abs(end - start),
          start,
          end,
          kind: 'total',
        });
        continue;
      }

      if (idx === lastIdx && totalLast) {
        const start = 0;
        const end = running; // computed truth, ignore provided last.value
        rows.push({
          name: s.name,
          base: Math.min(start, end),
          delta: Math.abs(end - start),
          start,
          end,
          kind: 'total',
        });
        continue;
      }

      const start = running;
      const delta = Number(s.value) || 0;
      const end = start + delta;
      running = end;

      rows.push({
        name: s.name,
        base: Math.min(start, end),
        delta: Math.abs(end - start),
        start,
        end,
        kind: delta >= 0 ? 'inc' : 'dec',
      });
    }

    return rows;
  }, [steps, absoluteFirst, totalLast]);

  const domain = useMemo(() => {
    if (!data.length) return [0, 0] as [number, number];
    let min = 0;
    let max = 0;
    for (const r of data) {
      min = Math.min(min, r.start, r.end);
      max = Math.max(max, r.start, r.end);
    }
    const pad = Math.max(1, (max - min) * 0.08);
    return [min - pad, max + pad] as [number, number];
  }, [data]);

  const colorFor = (r: WaterfallRow) => {
    if (r.kind === 'total') return chartTheme.palette[2]; // blue
    if (r.kind === 'inc') return chartTheme.palette[0]; // green
    return chartTheme.palette[3]; // red
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
        <ReferenceLine y={0} stroke={chartTheme.axis} strokeWidth={1} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.tick, fontSize: 12 }}
          domain={domain as any}
          tickFormatter={(val) => `$${Number(val) / 1000}k`}
        />
        <Tooltip content={<WaterfallTooltip />} />
        {/* invisible base to offset the delta bar */}
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="delta" stackId="w" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {data.map((r, idx) => (
            <Cell key={idx} fill={colorFor(r)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WaterfallChart;
