import React, { useMemo, useState } from 'react';
import type { Project, StrategyResults } from '../domain/strategies/types';
import { validateProject } from '../domain/strategies/validate';
import { AlertTriangle, Info, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const levelMeta = (level: 'info' | 'warn' | 'error') => {
  switch (level) {
    case 'error':
      return { label: 'Needs Attention', border: 'border-red-500/35', bg: 'bg-red-500/10', icon: XCircle };
    case 'warn':
      return { label: 'Check Inputs', border: 'border-amber-400/30', bg: 'bg-amber-400/10', icon: AlertTriangle };
    case 'info':
    default:
      return { label: 'Notes', border: 'border-sky-400/25', bg: 'bg-sky-400/10', icon: Info };
  }
};

const ValidationBanner: React.FC<{ project: Project; results: StrategyResults }> = ({ project, results }) => {
  const [expanded, setExpanded] = useState(false);

  const issues = useMemo(() => validateProject(project, results), [project, results]);
  if (!issues.length) return null;

  const hasError = issues.some((x) => x.level === 'error');
  const hasWarn = issues.some((x) => x.level === 'warn');
  const level: 'error' | 'warn' | 'info' = hasError ? 'error' : hasWarn ? 'warn' : 'info';
  const meta = levelMeta(level);
  const Icon = meta.icon;

  const summary =
    level === 'error'
      ? `${issues.length} issue${issues.length === 1 ? '' : 's'} may block accuracy`
      : level === 'warn'
      ? `${issues.length} item${issues.length === 1 ? '' : 's'} to double-check`
      : `${issues.length} note${issues.length === 1 ? '' : 's'}`;

  return (
    <div className={`gi-card px-4 py-3 mb-6 border ${meta.border} ${meta.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white/95">{meta.label}</div>
              <div className="text-xs gi-muted mt-0.5">{summary}</div>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="gi-btn gi-btn-secondary px-3 py-1.5 text-xs font-semibold self-start sm:self-auto"
              aria-expanded={expanded}
            >
              <span className="inline-flex items-center gap-2">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? 'Hide' : 'Show'} details
              </span>
            </button>
          </div>

          {expanded && (
            <ul className="mt-3 space-y-2 text-sm">
              {issues.map((x, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                  <div>
                    <div className="text-white/90">{x.message}</div>
                    {x.field && <div className="text-xs gi-muted mt-0.5">Field: <span className="font-mono">{x.field}</span></div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationBanner;

