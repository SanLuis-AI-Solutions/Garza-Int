import type { Project, StrategyResults } from '../domain/strategies/types';
import { downloadText, toCsv } from './csv';

const fmtMoney = (v: number) => Number(v).toFixed(2);

const safeSlug = (s: string) =>
  (s || 'project')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);

const buildKpiCsv = (results: StrategyResults) => {
  const headers = ['Label', 'Format', 'Value'];
  const rows = results.kpis.map((k) => [k.label, k.format, k.value]);
  return toCsv([headers, ...rows]);
};

const buildMetaCsv = (project: Project) => {
  const headers = ['Field', 'Value'];
  const rows = [
    ['exported_at', new Date().toISOString()],
    ['project_id', project.id],
    ['project_name', project.name],
    ['strategy', project.strategy],
    ['currency', project.currency],
    ['schema_version', project.schemaVersion],
    ['created_at', project.createdAt],
    ['updated_at', project.updatedAt],
  ];
  return toCsv([headers, ...rows]);
};

const buildDeveloper = (project: Project, results: StrategyResults) => {
  const r = results as any;
  const months = Math.max(1, r.totals?.monthsToBuild ?? 1);
  const horizons = [1, 5, 10, 30];
  const scaleForYears = (years: number) => (years * 12) / months;
  const milestones = toCsv([
    [
      'Year',
      'Scale (Deals per year extrapolated)',
      'Net Profit (per deal)',
      'Cumulative Net Profit (extrapolated)',
      'Total Project Cost (per deal)',
      'Annualized ROI (on total cost) %',
      'Profit Margin %',
    ],
    ...horizons.map((y) => [
      y,
      scaleForYears(y).toFixed(2),
      fmtMoney(r.totals.netProfit),
      fmtMoney(r.totals.netProfit * scaleForYears(y)),
      fmtMoney(r.totals.totalProjectCost),
      (r.totals.annualizedRoiOnTotalCost * 100).toFixed(2),
      (r.totals.profitMargin * 100).toFixed(2),
    ]),
  ]);

  const costLines = toCsv([
    ['Line', 'Amount'],
    ...(r.costLines ?? r.breakdown ?? []).map((b: any) => [b.name, fmtMoney(b.value)]),
    ['Total Project Cost', fmtMoney(r.totals.totalProjectCost)],
  ]);

  return {
    milestones,
    costLines,
  };
};

const buildFlipper = (project: Project, results: StrategyResults) => {
  const r = results as any;
  const months = Math.max(1, r.totals?.projectDurationMonths ?? 1);
  const horizons = [1, 5, 10, 30];
  const scaleForYears = (years: number) => (years * 12) / months;
  const milestones = toCsv([
    [
      'Year',
      'Scale (Deals per year extrapolated)',
      'Net Profit (per deal)',
      'Cumulative Net Profit (extrapolated)',
      'Annualized ROI %',
      'Profit Margin %',
      'Daily Holding Cost',
      'Cash Invested (per deal)',
    ],
    ...horizons.map((y) => [
      y,
      scaleForYears(y).toFixed(2),
      fmtMoney(r.totals.netProfit),
      fmtMoney(r.totals.netProfit * scaleForYears(y)),
      (r.totals.annualizedRoi * 100).toFixed(2),
      (r.totals.profitMargin * 100).toFixed(2),
      fmtMoney(r.totals.dailyHoldingCost),
      fmtMoney(r.totals.cashInvested),
    ]),
  ]);

  const costLines = toCsv([
    ['Line', 'Amount'],
    ...(r.costLines ?? r.breakdown ?? []).map((b: any) => [b.name, fmtMoney(b.value)]),
    ['Total Deal Cost', fmtMoney(r.totals.totalCost)],
  ]);

  return {
    milestones,
    costLines,
  };
};

const buildLandlord = (project: Project, results: StrategyResults) => {
  const r = results as any;
  const cashFlow = r.cashFlow ?? [];
  const horizons = [1, 5, 10, 30];
  const atYear = (year: number) => cashFlow[Math.min(Math.max(1, year), cashFlow.length) - 1];
  const cumulativeCashFlow = (year: number) =>
    cashFlow.slice(0, Math.min(Math.max(1, year), cashFlow.length)).reduce((s: number, rr: any) => s + rr.cashFlow, 0);

  const milestones = toCsv([
    ['Year', 'Annual Cash Flow', 'Cumulative Cash Flow', 'Property Value', 'Loan Balance', 'Equity', 'DSCR', 'Cash-on-Cash %'],
    ...horizons.map((y) => {
      const row = atYear(y);
      return [
        y,
        fmtMoney(row.cashFlow),
        fmtMoney(cumulativeCashFlow(y)),
        fmtMoney(row.propertyValue),
        fmtMoney(row.loanBalance),
        fmtMoney(row.equity),
        Number.isFinite(row.dscr) ? row.dscr.toFixed(2) : '∞',
        (row.cashOnCash * 100).toFixed(2) + '%',
      ];
    }),
  ]);

  let running = 0;
  const cashflowCsv = toCsv([
    [
      'Year',
      'Gross Revenue',
      'Effective Revenue',
      'OpEx',
      'NOI',
      'Debt Service',
      'Cash Flow',
      'Cumulative Cash Flow',
      'Property Value',
      'Loan Balance',
      'Equity',
      'DSCR',
      'Cash-on-Cash %',
    ],
    ...cashFlow.map((row: any) => {
      running += row.cashFlow;
      return [
        row.year,
        fmtMoney(row.grossRevenue),
        fmtMoney(row.effectiveRevenue),
        fmtMoney(row.opex),
        fmtMoney(row.noi),
        fmtMoney(row.debtService),
        fmtMoney(row.cashFlow),
        fmtMoney(running),
        fmtMoney(row.propertyValue),
        fmtMoney(row.loanBalance),
        fmtMoney(row.equity),
        Number.isFinite(row.dscr) ? row.dscr.toFixed(2) : '∞',
        (row.cashOnCash * 100).toFixed(2) + '%',
      ];
    }),
  ]);

  const opexLines = toCsv([
    ['Line', 'Amount (Year 1 model)'],
    ...(r.opexLines ?? []).map((b: any) => [b.name, fmtMoney(b.value)]),
  ]);

  return { milestones, cashflowCsv, opexLines };
};

const buildPrintHtml = (project: Project, results: StrategyResults) => {
  const title = `${project.name} (${project.strategy})`;
  const kpiRows = results.kpis
    .map((k) => `<tr><td>${k.label}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${k.value}</td><td>${k.format}</td></tr>`)
    .join('');

  const strategyBlock = (() => {
    if (results.strategy === 'LANDLORD') {
      const rows = (results as any).cashFlow
        .slice(0, 30)
        .map(
          (r: any) =>
            `<tr><td>${r.year}</td><td style="text-align:right">${fmtMoney(r.cashFlow)}</td><td style="text-align:right">${fmtMoney(r.equity)}</td><td style="text-align:right">${fmtMoney(r.propertyValue)}</td></tr>`
        )
        .join('');
      return `
        <h2>Landlord Cash Flow (30y)</h2>
        <table>
          <thead><tr><th>Year</th><th style="text-align:right">Cash Flow</th><th style="text-align:right">Equity</th><th style="text-align:right">Value</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }
    const lines = ((results as any).costLines ?? (results as any).breakdown ?? [])
      .map((b: any) => `<tr><td>${b.name}</td><td style="text-align:right">${fmtMoney(b.value)}</td></tr>`)
      .join('');
    return `
      <h2>Cost Lines</h2>
      <table>
        <thead><tr><th>Line</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${lines}</tbody>
      </table>
    `;
  })();

  // Keep HTML self-contained; user can Print -> Save as PDF.
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        :root { color-scheme: light; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif; margin: 28px; color: #0b1620; }
        h1 { margin: 0 0 6px 0; font-size: 20px; }
        .muted { color: #445462; font-size: 12px; margin-bottom: 18px; }
        h2 { margin: 20px 0 8px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #d8e0e7; padding: 8px 10px; }
        th { background: #f4f7fa; text-align: left; }
        @media print {
          body { margin: 10mm; }
          h2 { break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="muted">Exported ${new Date().toLocaleString()}</div>

      <h2>KPIs</h2>
      <table>
        <thead><tr><th>Label</th><th style="text-align:right">Value</th><th>Format</th></tr></thead>
        <tbody>${kpiRows}</tbody>
      </table>

      ${strategyBlock}
    </body>
  </html>`;
};

export const printProjectReport = (args: { project: Project; results: StrategyResults }) => {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    alert('Popup blocked. Allow popups to print/save a PDF report.');
    return;
  }
  w.document.open();
  w.document.write(buildPrintHtml(args.project, args.results));
  w.document.close();
  // Let layout settle then show print dialog.
  setTimeout(() => w.print(), 250);
};

export const downloadProjectReportZip = async (args: { project: Project; results: StrategyResults }) => {
  const { project, results } = args;
  const slug = safeSlug(project.name);
  const base = `${slug || 'project'}_${project.strategy.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`;

  const files: Record<string, string> = {
    'meta.csv': buildMetaCsv(project),
    'kpis.csv': buildKpiCsv(results),
    'project.json': JSON.stringify({ ...project, resultsStrategy: results.strategy }, null, 2),
    'inputs.json': JSON.stringify(project.inputs, null, 2),
  };

  if (results.strategy === 'DEVELOPER') {
    const d = buildDeveloper(project, results);
    files['milestones_1_5_10_30.csv'] = d.milestones;
    files['cost_lines.csv'] = d.costLines;
  } else if (results.strategy === 'LANDLORD') {
    const l = buildLandlord(project, results);
    files['milestones_1_5_10_30.csv'] = l.milestones;
    files['cashflow_30y.csv'] = l.cashflowCsv;
    files['opex_lines.csv'] = l.opexLines;
  } else if (results.strategy === 'FLIPPER') {
    const f = buildFlipper(project, results);
    files['milestones_1_5_10_30.csv'] = f.milestones;
    files['cost_lines.csv'] = f.costLines;
  }

  // Build a zip on-demand to avoid adding weight to initial bundle.
  const { zipSync, strToU8 } = await import('fflate');
  const zipped = zipSync(
    Object.fromEntries(Object.entries(files).map(([name, content]) => [`${base}/${name}`, strToU8(content)])),
    { level: 6 }
  );

  const blob = new Blob([zipped], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${base}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadQuickKpisCsv = (args: { project: Project; results: StrategyResults }) => {
  const base = `${safeSlug(args.project.name)}_${args.project.strategy.toLowerCase()}`;
  downloadText({ filename: `${base}_kpis.csv`, content: buildKpiCsv(args.results), mime: 'text/csv;charset=utf-8' });
};

