export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface ProjectData {
  projectName: string;
  totalSqFt: number;
  landCosts: {
    purchasePrice: number;
    taxes: number;
    permits: number;
  };
  constructionCosts: {
    materials: number;
    labor: number;
    contractorFees: number;
    contingency: number;
    custom: ExpenseItem[];
  };
  financing: {
    loanAmount: number;
    interestRate: number;
    loanTermYears: number;
  };
  revenue: {
    estimatedResaleValue: number;
    rentalIncomeMonthly: number;
    appreciationRate: number;
  };
  operatingExpenses: {
    propertyTaxesYearly: number;
    insuranceYearly: number;
    maintenanceYearly: number;
    vacancyRate: number; // Percentage 0-100
    custom: ExpenseItem[];
  };
}

export interface CalculationResults {
  totalInvestment: number;
  totalConstructionCost: number;
  monthlyLoanPayment: number;
  totalRevenue5Years: number;
  totalOperatingExpenses5Years: number;
  netProfit5Years: number;
  roi5Years: number;
  cashFlow: {
    year: number;
    revenue: number;
    expenses: number;
    debtService: number;
    netCashFlow: number;
    equity: number;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  INPUTS = 'inputs',
  SPREADSHEET = 'spreadsheet',
  VISUALIZER = 'visualizer',
  MARKET = 'market',
  ADMIN = 'admin',
  QA = 'qa',
  CHAT = 'chat'
}
