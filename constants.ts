import { ProjectData } from './types';

export const INITIAL_DATA: ProjectData = {
  projectName: 'My Development Project',
  totalSqFt: 2500,
  landCosts: {
    purchasePrice: 250000,
    taxes: 5000,
    permits: 2500,
  },
  constructionCosts: {
    materials: 120000,
    labor: 80000,
    contractorFees: 25000,
    contingency: 15000,
    custom: []
  },
  financing: {
    loanAmount: 300000,
    interestRate: 6.5,
    loanTermYears: 30,
  },
  revenue: {
    estimatedResaleValue: 650000,
    rentalIncomeMonthly: 3200,
    appreciationRate: 3.5,
  },
  operatingExpenses: {
    propertyTaxesYearly: 4500,
    insuranceYearly: 1200,
    maintenanceYearly: 2400,
    vacancyRate: 5,
    custom: []
  }
};