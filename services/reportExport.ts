import type { Project, StrategyResults } from '../domain/strategies/types';
import { downloadText, toCsv } from './csv';
import { appEnv, appVersion } from './appMeta';

type RowValue = string | number | boolean;
type SheetRows = RowValue[][];
type ReportSection = { name: string; rows: SheetRows };

const fmtMoney = (v: number) => Number(v).toFixed(2);

const safeSlug = (s: string) =>
  (s || 'project')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);

const normalizeCell = (value: unknown): RowValue => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

const buildKpiRows = (results: StrategyResults): SheetRows => {
  const headers = ['Label', 'Format', 'Value'];
  const rows = results.kpis.map((k) => [k.label, k.format, k.value]);
  return [headers, ...rows];
};

const buildMetaRows = (project: Project): SheetRows => {
  const headers = ['Field', 'Value'];
  const rows = [
    ['exported_at', new Date().toISOString()],
    ['app_env', appEnv()],
    ['app_version', appVersion()],
    ['project_id', project.id],
    ['project_name', project.name],
    ['strategy', project.strategy],
    ['currency', project.currency],
    ['schema_version', project.schemaVersion],
    ['created_at', project.createdAt],
    ['updated_at', project.updatedAt],
  ];
  return [headers, ...rows];
};

const buildInputsRows = (project: Project): SheetRows => {
  const headers = ['Input', 'Value'];
  const entries = Object.entries(project.inputs ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return [headers, ...entries.map(([k, v]) => [k, normalizeCell(v)])];
};

const buildDeveloperSheets = (results: StrategyResults) => {
  const r = results as any;
  const months = Math.max(1, r.totals?.monthsToBuild ?? 1);
  const horizons = [1, 5, 10, 30];
  const scaleForYears = (years: number) => (years * 12) / months;

  const milestones: SheetRows = [
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
  ];

  const costLines: SheetRows = [
    ['Line', 'Amount'],
    ...(r.costLines ?? r.breakdown ?? []).map((b: any) => [b.name, fmtMoney(b.value)]),
    ['Total Project Cost', fmtMoney(r.totals.totalProjectCost)],
  ];

  return { milestones, costLines };
};

const buildFlipperSheets = (results: StrategyResults) => {
  const r = results as any;
  const months = Math.max(1, r.totals?.projectDurationMonths ?? 1);
  const horizons = [1, 5, 10, 30];
  const scaleForYears = (years: number) => (years * 12) / months;

  const milestones: SheetRows = [
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
  ];

  const costLines: SheetRows = [
    ['Line', 'Amount'],
    ...(r.costLines ?? r.breakdown ?? []).map((b: any) => [b.name, fmtMoney(b.value)]),
    ['Total Deal Cost', fmtMoney(r.totals.totalCost)],
  ];

  return { milestones, costLines };
};

const buildLandlordSheets = (results: StrategyResults) => {
  const r = results as any;
  const cashFlow = Array.isArray(r.cashFlow) ? r.cashFlow : [];
  const fallback = {
    year: 0,
    grossRevenue: 0,
    effectiveRevenue: 0,
    opex: 0,
    noi: 0,
    debtService: 0,
    cashFlow: 0,
    propertyValue: 0,
    loanBalance: 0,
    equity: 0,
    dscr: 0,
    cashOnCash: 0,
  };
  const horizons = [1, 5, 10, 30];
  const atYear = (year: number) => cashFlow[Math.min(Math.max(1, year), cashFlow.length) - 1] ?? fallback;
  const cumulativeCashFlow = (year: number) =>
    cashFlow.slice(0, Math.min(Math.max(1, year), cashFlow.length)).reduce((s: number, rr: any) => s + rr.cashFlow, 0);

  const milestones: SheetRows = [
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
  ];

  let running = 0;
  const cashflow: SheetRows = [
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
  ];

  const opexLines: SheetRows = [
    ['Line', 'Amount (Year 1 model)'],
    ...(r.opexLines ?? []).map((b: any) => [b.name, fmtMoney(b.value)]),
  ];

  return { milestones, cashflow, opexLines };
};

const buildKpiCsv = (results: StrategyResults) => toCsv(buildKpiRows(results));

const buildReportSections = (project: Project, results: StrategyResults): ReportSection[] => {
  const sections: ReportSection[] = [
    { name: 'Meta', rows: buildMetaRows(project) },
    { name: 'KPIs', rows: buildKpiRows(results) },
    { name: 'Inputs', rows: buildInputsRows(project) },
  ];

  if (results.strategy === 'DEVELOPER') {
    const d = buildDeveloperSheets(results);
    sections.push({ name: 'Milestones_1_5_10_30', rows: d.milestones });
    sections.push({ name: 'Cost_Lines', rows: d.costLines });
  } else if (results.strategy === 'LANDLORD') {
    const l = buildLandlordSheets(results);
    sections.push({ name: 'Milestones_1_5_10_30', rows: l.milestones });
    sections.push({ name: 'Cashflow_30Y', rows: l.cashflow });
    sections.push({ name: 'Opex_Lines', rows: l.opexLines });
  } else if (results.strategy === 'FLIPPER') {
    const f = buildFlipperSheets(results);
    sections.push({ name: 'Milestones_1_5_10_30', rows: f.milestones });
    sections.push({ name: 'Cost_Lines', rows: f.costLines });
  }

  return sections;
};

export const printProjectReport = (_args: { project: Project; results: StrategyResults }) => {
  window.print();
};

export const downloadProjectReportCsv = (args: { project: Project; results: StrategyResults }) => {
  const { project, results } = args;
  const slug = safeSlug(project.name);
  const base = `${slug || 'project'}_${project.strategy.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`;
  const sections = buildReportSections(project, results);

  const csv = sections
    .map((section) => toCsv([['Section', section.name], ...section.rows]))
    .join('\n\n');

  downloadText({ filename: `${base}.csv`, content: csv, mime: 'text/csv;charset=utf-8' });
};

export const downloadProjectReportWorkbook = async (args: { project: Project; results: StrategyResults }) => {
  const { project, results } = args;
  const slug = safeSlug(project.name);
  const base = `${slug || 'project'}_${project.strategy.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`;
  const sections = buildReportSections(project, results);

  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  for (const section of sections) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(section.rows), section.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, `${base}.xlsx`, { compression: true });
};

export const downloadQuickKpisCsv = (args: { project: Project; results: StrategyResults }) => {
  const base = `${safeSlug(args.project.name)}_${args.project.strategy.toLowerCase()}`;
  downloadText({ filename: `${base}_kpis.csv`, content: buildKpiCsv(args.results), mime: 'text/csv;charset=utf-8' });
};
