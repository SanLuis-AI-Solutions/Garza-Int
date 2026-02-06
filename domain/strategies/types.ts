export type InvestmentStrategy = 'DEVELOPER' | 'LANDLORD' | 'FLIPPER';

export type CostCadence = 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';

export type CostItem = {
  id: string;
  name: string;
  amount: number;
  cadence: CostCadence;
};

export type DeveloperInputs = {
  strategy: 'DEVELOPER';
  land_cost: number;
  soft_costs: number;
  site_work: number;
  construction_budget: number;
  contingency_percent: number;
  ltc_limit: number;
  interest_rate: number;
  loan_utilization: number;
  origination_fee_points: number;
  months_to_build: number;
  holding_taxes: number;
  builders_risk_insurance: number;
  arv: number;
  selling_costs_percent: number;
  custom?: {
    acquisition_soft?: CostItem[];
    hard_costs?: CostItem[];
    financing?: CostItem[];
    carrying?: CostItem[];
    exit?: CostItem[];
  };
};

export type LandlordInputs = {
  strategy: 'LANDLORD';
  purchase_price: number;
  make_ready_costs: number;
  closing_costs_buy: number;
  down_payment_percent: number;
  interest_rate: number;
  amortization_years: number;
  gross_monthly_rent: number;
  other_income: number;
  vacancy_rate: number;
  annual_appreciation: number;
  rent_growth_percent: number;
  expense_growth_percent: number;
  property_management_percent: number;
  property_taxes_annual: number;
  landlord_insurance_annual: number;
  hoa_fees_monthly: number;
  maintenance_reserve_percent: number;
  capex_reserve_percent: number;
  custom?: {
    acquisition?: CostItem[];
    opex?: CostItem[];
  };
};

export type FlipperInputs = {
  strategy: 'FLIPPER';
  distressed_price: number;
  wholesale_fee: number;
  arrears: number;
  rehab_budget: number;
  flip_contingency_percent: number;
  interest_rate: number;
  points: number;
  draw_fees: number;
  draw_count: number;
  project_duration_months: number;
  utilities_monthly: number;
  lawn_maintenance_monthly: number;
  property_taxes_annual: number;
  insurance_annual: number;
  arv: number;
  selling_costs_percent: number;
  custom?: {
    acquisition?: CostItem[];
    renovation?: CostItem[];
    financing?: CostItem[];
    carrying?: CostItem[];
    exit?: CostItem[];
  };
};

export type StrategyInputs = DeveloperInputs | LandlordInputs | FlipperInputs;

export type ProjectCurrency = 'USD';

export type ProjectDataPayload = {
  currency: ProjectCurrency;
  schemaVersion: number;
  inputs: StrategyInputs;
};

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  strategy: InvestmentStrategy;
  currency: ProjectCurrency;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  inputs: StrategyInputs;
};

export type KpiFormat = 'currency' | 'percent' | 'number';

export type Kpi = {
  label: string;
  value: number;
  format: KpiFormat;
  help?: string;
};

export type BreakdownItem = { name: string; value: number };

export type DeveloperResults = {
  strategy: 'DEVELOPER';
  kpis: Kpi[];
  breakdown: BreakdownItem[];
  costLines: BreakdownItem[];
  waterfall: { name: string; value: number }[];
  totals: {
    monthsToBuild: number;
    loanAmount: number;
    sellCosts: number;
    totalProjectCost: number;
    developerSpread: number;
    netProfit: number;
    profitMargin: number;
    interestReserve: number;
    roiOnTotalCost: number;
    annualizedRoiOnTotalCost: number;
    equityRequired: number;
  };
};

export type LandlordCashFlowRow = {
  year: number;
  grossRevenue: number;
  effectiveRevenue: number;
  opex: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  dscr: number;
  cashOnCash: number;
};

export type LandlordResults = {
  strategy: 'LANDLORD';
  kpis: Kpi[];
  breakdown: BreakdownItem[];
  opexLines: BreakdownItem[];
  cashFlow: LandlordCashFlowRow[];
  totals: {
    monthlyPI: number;
    noiAnnual: number;
    cashFlowAnnual: number;
    cashOnCash: number;
    capRate: number;
    dscr: number;
    cashInvested: number;
    loanAmount: number;
  };
};

export type FlipperResults = {
  strategy: 'FLIPPER';
  kpis: Kpi[];
  breakdown: BreakdownItem[];
  costLines: BreakdownItem[];
  waterfall: { name: string; value: number }[];
  totals: {
    projectDurationMonths: number;
    loanPrincipal: number;
    rehabTotal: number;
    interestCost: number;
    dailyHoldingCost: number;
    mao: number;
    netProfit: number;
    profitMargin: number;
    annualizedRoi: number;
    cashInvested: number;
    totalCost: number;
  };
};

export type StrategyResults = DeveloperResults | LandlordResults | FlipperResults;
