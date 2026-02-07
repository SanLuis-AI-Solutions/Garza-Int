import type { InvestmentStrategy, StrategyInputs } from './types';
import { defaultDeveloperInputs, defaultFlipperInputs, defaultLandlordInputs } from './defaults';

export type QaMetric = {
  key: string;
  label: string;
  format: 'currency' | 'percent' | 'number';
};

export type QaScenario = {
  id: string;
  name: string;
  strategy: InvestmentStrategy;
  inputs: StrategyInputs;
  metrics: QaMetric[];
  expected: Record<string, number>;
  tolerance: Record<string, number>; // absolute tolerance per metric key
};

const pct = (amount: number, pct: number) => (amount * pct) / 100;

const developerBenchmark = (): QaScenario => {
  const base = defaultDeveloperInputs();
  const inputs = {
    ...base,
    ltc_limit: 75,
    months_to_build: 10,
    custom: {
      ...base.custom,
      acquisition_soft: [{ id: 'a1', name: 'Entitlements', amount: 12000, cadence: 'ONE_TIME' }],
      hard_costs: [{ id: 'h1', name: 'Extra Concrete', amount: 4000, cadence: 'MONTHLY' }],
      financing: [{ id: 'f1', name: 'Doc Prep', amount: 950, cadence: 'ONE_TIME' }],
      carrying: [{ id: 'c1', name: 'Security', amount: 180, cadence: 'MONTHLY' }],
      exit: [{ id: 'e1', name: 'Staging', amount: 2500, cadence: 'ONE_TIME' }],
    },
  } as const;

  const months = 10;
  const contingencyAmount = pct(inputs.site_work + inputs.construction_budget, inputs.contingency_percent);
  const hardCosts = inputs.site_work + inputs.construction_budget + contingencyAmount;
  const customAcqSoft = 12000;
  const customHard = 4000 * months;
  const ltcBase = inputs.land_cost + inputs.soft_costs + customAcqSoft + hardCosts + customHard;
  const loanAmount = pct(ltcBase, inputs.ltc_limit);
  const interestReserve = ((loanAmount * (inputs.loan_utilization / 100) * (inputs.interest_rate / 100)) / 12) * months;
  const originationFee = pct(loanAmount, inputs.origination_fee_points);
  const carryingCosts = inputs.holding_taxes + inputs.builders_risk_insurance;
  const customCarrying = 180 * months;
  const customFinancing = 950;
  const customExit = 2500;

  const totalProjectCost =
    inputs.land_cost +
    inputs.soft_costs +
    customAcqSoft +
    hardCosts +
    customHard +
    carryingCosts +
    customCarrying +
    interestReserve +
    originationFee +
    customFinancing +
    customExit;

  const sellCosts = pct(inputs.arv, inputs.selling_costs_percent);
  const netProfit = inputs.arv - sellCosts - totalProjectCost;
  const profitMargin = inputs.arv > 0 ? netProfit / inputs.arv : 0;

  return {
    id: 'dev-benchmark',
    name: 'Developer Benchmark (with custom lines)',
    strategy: 'DEVELOPER',
    inputs: inputs as any,
    metrics: [
      { key: 'loanAmount', label: 'Loan Amount (LTC)', format: 'currency' },
      { key: 'interestReserve', label: 'Interest Reserve', format: 'currency' },
      { key: 'totalProjectCost', label: 'Total Project Cost', format: 'currency' },
      { key: 'netProfit', label: 'Net Profit', format: 'currency' },
      { key: 'profitMarginPct', label: 'Profit Margin', format: 'percent' },
    ],
    expected: {
      loanAmount,
      interestReserve,
      totalProjectCost,
      netProfit,
      profitMarginPct: profitMargin * 100,
    },
    tolerance: {
      loanAmount: 0.01,
      interestReserve: 0.01,
      totalProjectCost: 0.01,
      netProfit: 0.01,
      profitMarginPct: 0.01,
    },
  };
};

const landlordBenchmark = (): QaScenario => {
  const base = defaultLandlordInputs();
  const inputs = {
    ...base,
    custom: {
      ...base.custom,
      acquisition: [{ id: 'a1', name: 'Survey', amount: 1200, cadence: 'ONE_TIME' }],
      opex: [{ id: 'o1', name: 'Pest Control', amount: 35, cadence: 'MONTHLY' }],
    },
  } as const;

  const grossAnnual = (inputs.gross_monthly_rent + inputs.other_income) * 12;
  const vacancyLoss = pct(grossAnnual, inputs.vacancy_rate);
  const effective = grossAnnual - vacancyLoss;

  const mgmt = pct(grossAnnual, inputs.property_management_percent);
  const maint = pct(grossAnnual, inputs.maintenance_reserve_percent);
  const capex = pct(grossAnnual, inputs.capex_reserve_percent);
  const taxes = inputs.property_taxes_annual;
  const insurance = inputs.landlord_insurance_annual;
  const hoa = inputs.hoa_fees_monthly * 12;
  const extraOpex = 35 * 12;
  const opexTotal = mgmt + taxes + insurance + hoa + maint + capex + extraOpex;

  const noi = effective - opexTotal;

  // We compare cash flow using the calculator's own P&I (PMT). The core regression risk here is NOI and trajectory.
  // The QA page will also display the calculator's year-1 cash flow for sanity.
  return {
    id: 'landlord-benchmark',
    name: 'Landlord Benchmark (with custom OpEx)',
    strategy: 'LANDLORD',
    inputs: inputs as any,
    metrics: [
      { key: 'noiAnnual', label: 'NOI (Year 1)', format: 'currency' },
      { key: 'cashFlowAnnual', label: 'Cash Flow (Year 1)', format: 'currency' },
      { key: 'dscr', label: 'DSCR (Year 1)', format: 'number' },
      { key: 'cashOnCashPct', label: 'Cash-on-Cash (Year 1)', format: 'percent' },
    ],
    expected: {
      noiAnnual: noi,
    },
    tolerance: {
      noiAnnual: 0.01,
      cashFlowAnnual: 0.01,
      dscr: 0.01,
      cashOnCashPct: 0.01,
    },
  };
};

const flipperBenchmark = (): QaScenario => {
  const base = defaultFlipperInputs();
  const inputs = {
    ...base,
    project_duration_months: 6,
    custom: {
      ...base.custom,
      carrying: [{ id: 'c1', name: 'Temp Fence', amount: 90, cadence: 'MONTHLY' }],
    },
  } as const;

  const months = 6;
  const rehabTotal = inputs.rehab_budget * (1 + inputs.flip_contingency_percent / 100);
  const loanPrincipal = inputs.distressed_price + inputs.wholesale_fee + inputs.arrears + rehabTotal;
  const interestCost = loanPrincipal * (inputs.interest_rate / 100) * (months / 12);
  const pointsCost = pct(loanPrincipal, inputs.points);
  const drawFeesTotal = inputs.draw_fees * inputs.draw_count;
  const taxesProrated = inputs.property_taxes_annual * (months / 12);
  const insuranceProrated = inputs.insurance_annual * (months / 12);
  const utilitiesTotal = inputs.utilities_monthly * months;
  const lawnTotal = inputs.lawn_maintenance_monthly * months;
  const sellCosts = pct(inputs.arv, inputs.selling_costs_percent);
  const customCarrying = 90 * months;

  const totalCost =
    inputs.distressed_price +
    inputs.wholesale_fee +
    inputs.arrears +
    rehabTotal +
    pointsCost +
    drawFeesTotal +
    interestCost +
    taxesProrated +
    insuranceProrated +
    utilitiesTotal +
    lawnTotal +
    customCarrying +
    sellCosts;

  const netProfit = inputs.arv - totalCost;

  return {
    id: 'flipper-benchmark',
    name: 'Flipper Benchmark (with custom carrying)',
    strategy: 'FLIPPER',
    inputs: inputs as any,
    metrics: [
      { key: 'loanPrincipal', label: 'Loan Principal (modeled)', format: 'currency' },
      { key: 'interestCost', label: 'Interest Cost', format: 'currency' },
      { key: 'totalCost', label: 'Total Deal Cost', format: 'currency' },
      { key: 'netProfit', label: 'Net Profit', format: 'currency' },
    ],
    expected: {
      loanPrincipal,
      interestCost,
      totalCost,
      netProfit,
    },
    tolerance: {
      loanPrincipal: 0.01,
      interestCost: 0.01,
      totalCost: 0.01,
      netProfit: 0.01,
    },
  };
};

export const getQaScenarios = (): QaScenario[] => [developerBenchmark(), landlordBenchmark(), flipperBenchmark()];

