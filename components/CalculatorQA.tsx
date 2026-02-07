import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateProject } from '../domain/strategies';
import type { QaScenario } from '../domain/strategies/qaScenarios';
import { getQaScenarios } from '../domain/strategies/qaScenarios';

const fmt = (format: 'currency' | 'percent' | 'number', value: number) => {
  if (!Number.isFinite(value)) return '—';
  switch (format) {
    case 'currency':
      return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'percent':
      return value.toFixed(2) + '%';
    case 'number':
    default:
      return value.toFixed(2);
  }
};

const getActualMetric = (scenario: QaScenario, results: any, key: string): number | null => {
  switch (scenario.strategy) {
    case 'DEVELOPER': {
      const t = results.totals;
      if (key === 'profitMarginPct') return t.profitMargin * 100;
      return t[key] ?? null;
    }
    case 'LANDLORD': {
      const t = results.totals;
      if (key === 'cashOnCashPct') return t.cashOnCash * 100;
      return t[key] ?? null;
    }
    case 'FLIPPER': {
      const t = results.totals;
      return t[key] ?? null;
    }
    default:
      return null;
  }
};

const ScenarioCard: React.FC<{ scenario: QaScenario }> = ({ scenario }) => {
  const [showInputs, setShowInputs] = useState(false);
  const results = useMemo(() => calculateProject(scenario.strategy, scenario.inputs as any), [scenario]);

  const rows = scenario.metrics.map((m) => {
    const expected = scenario.expected[m.key];
    const actual = getActualMetric(scenario, results as any, m.key);
    const tol = scenario.tolerance[m.key] ?? 0.01;
    const ok = actual !== null && Number.isFinite(expected) ? Math.abs((actual as number) - expected) <= tol : false;
    return { ...m, expected, actual, tol, ok };
  });

  // Landlord benchmark includes only NOI as a computed expectation; the rest is still shown/pass-checked as long as expected exists.
  const passCount = rows.filter((r) => (scenario.expected[r.key] === undefined ? true : r.ok)).length;
  const totalCount = rows.length;
  const isPass = passCount === totalCount;

  return (
    <div className="gi-card p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isPass ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <h3 className="text-lg font-bold gi-serif">{scenario.name}</h3>
          </div>
          <p className="mt-1 text-sm gi-muted">
            Strategy: <span className="font-semibold text-white/90">{scenario.strategy}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInputs((v) => !v)}
          className="gi-btn gi-btn-secondary px-3 py-2 text-sm font-semibold self-start"
          aria-expanded={showInputs}
        >
          <span className="inline-flex items-center gap-2">
            {showInputs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showInputs ? 'Hide' : 'Show'} inputs
          </span>
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="gi-table text-sm">
          <thead className="gi-thead">
            <tr>
              <th>Metric</th>
              <th style={{ textAlign: 'right' }}>Expected</th>
              <th style={{ textAlign: 'right' }}>Actual</th>
              <th style={{ textAlign: 'right' }}>Delta</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody className="gi-tbody">
            {rows.map((r) => {
              const hasExpected = scenario.expected[r.key] !== undefined;
              const delta = hasExpected && r.actual !== null ? (r.actual as number) - r.expected : null;
              const ok = !hasExpected ? true : r.ok;
              return (
                <tr key={r.key} className="gi-trHover">
                  <td className="gi-muted">{r.label}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    {hasExpected ? fmt(r.format, r.expected) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    {r.actual === null ? '—' : fmt(r.format, r.actual)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    {delta === null ? '—' : fmt(r.format === 'percent' ? 'percent' : 'number', r.format === 'percent' ? delta : delta)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`gi-pill text-xs ${ok ? 'gi-pill--ok' : 'gi-pill--warn'}`}>
                      {ok ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showInputs && (
        <pre className="mt-4 gi-card-flat p-4 text-xs overflow-x-auto">
          {JSON.stringify(scenario.inputs, null, 2)}
        </pre>
      )}
    </div>
  );
};

const CalculatorQA: React.FC = () => {
  const scenarios = useMemo(() => getQaScenarios(), []);
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="gi-card p-6">
        <h2 className="text-xl font-bold gi-serif">Calculator QA</h2>
        <p className="mt-1 text-sm gi-muted">
          Admin-only regression checks for core formulas. If any scenario fails, do not ship calculator changes until the mismatch is explained.
        </p>
      </div>

      {scenarios.map((s) => (
        <ScenarioCard key={s.id} scenario={s} />
      ))}
    </div>
  );
};

export default CalculatorQA;

