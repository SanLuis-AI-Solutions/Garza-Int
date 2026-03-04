import type { Project, StrategyResults } from './types';

export type ValidationLevel = 'info' | 'warn' | 'error';

export type ValidationIssue = {
  level: ValidationLevel;
  message: string;
  field?: string;
};

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const pctOutOfRange = (v: number, min = 0, max = 100) => v < min || v > max;

export const validateProject = (project: Project, results: StrategyResults): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  const add = (level: ValidationLevel, message: string, field?: string) => issues.push({ level, message, field });

  // Basic numeric hygiene across strategies
  const inputs = project.inputs as any;
  for (const [k, v] of Object.entries(inputs ?? {})) {
    if (k === 'custom') continue;
    if (typeof v === 'number' && Number.isNaN(v)) add('error', `Input "${k}" is not a number.`, k);
    if (typeof v === 'number' && v < 0) add('warn', `Input "${k}" is negative. Double-check sign and units.`, k);
  }

  switch (results.strategy) {
    case 'DEVELOPER': {
      const i = project.inputs as any;
      if (isFiniteNumber(i.ltc_limit) && pctOutOfRange(i.ltc_limit)) add('warn', 'LTC is usually between 0% and 100%.', 'ltc_limit');
      if (isFiniteNumber(i.loan_utilization) && pctOutOfRange(i.loan_utilization)) add('warn', 'Loan utilization is usually between 0% and 100%.', 'loan_utilization');
      if (results.totals.netProfit < 0) add('error', 'Net Profit is negative. This deal loses money under current assumptions.');
      if (results.totals.profitMargin < 0) add('warn', 'Profit margin is negative. Consider reducing costs or increasing ARV.');
      if (results.totals.equityRequired > 0 && results.totals.loanAmount <= 0) add('warn', 'Loan amount is 0; equity required is effectively the full project cost.');
      if (results.totals.monthsToBuild > 24) add('info', 'Months to build is 24+ months; interest reserve sensitivity will be high.', 'months_to_build');
      break;
    }
    case 'LANDLORD': {
      const i = project.inputs as any;
      if (isFiniteNumber(i.down_payment_percent) && pctOutOfRange(i.down_payment_percent)) add('warn', 'Down payment is usually between 0% and 100%.', 'down_payment_percent');
      if (isFiniteNumber(i.vacancy_rate) && pctOutOfRange(i.vacancy_rate, 0, 50)) add('warn', 'Vacancy rate seems unusual (typical: 0% to 50%).', 'vacancy_rate');

      if (results.totals.cashFlowAnnual < 0) add('warn', 'Year 1 cash flow is negative (you may be feeding the property).');
      if (Number.isFinite(results.totals.dscr) && results.totals.dscr < 1) add('warn', 'DSCR is below 1.00x (NOI does not cover debt service).');
      if (results.totals.cashInvested <= 0) add('error', 'Cash invested is 0 or negative. Check down payment and acquisition costs.');
      break;
    }
    case 'FLIPPER': {
      const i = project.inputs as any;
      if (isFiniteNumber(i.points) && pctOutOfRange(i.points, 0, 10)) add('warn', 'Points are usually between 0% and 10%.', 'points');
      if (isFiniteNumber(i.rehab_utilization_percent) && pctOutOfRange(i.rehab_utilization_percent)) add('warn', 'Rehab draw utilization is usually between 0% and 100%.', 'rehab_utilization_percent');
      if (results.totals.netProfit < 0) add('error', 'Net Profit is negative. This flip loses money under current assumptions.');
      if (results.totals.projectDurationMonths >= 12) add('info', 'Flip duration is 12+ months; annualized ROI will drop quickly as time increases.', 'project_duration_months');
      if (results.totals.dailyHoldingCost > 0 && results.totals.dailyHoldingCost >= 200) add('warn', 'Daily holding cost is very high. Verify interest, taxes, insurance, and utilities inputs.');
      if (results.totals.mao > (project.inputs as any).distressed_price) add('info', 'MAO is above purchase price; deal may be attractive if rehab and exit assumptions hold.');
      break;
    }
    default:
      break;
  }

  return issues;
};

