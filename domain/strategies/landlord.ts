import type { Kpi, LandlordCashFlowRow, LandlordInputs, LandlordResults } from './types';
import { amortRemainingBalance, percentOf, pmt } from './finance';
import type { CostItem } from './types';
import { flattenCostItems, sumCostItems } from './costItems';

export const calculateLandlord = (i: LandlordInputs): LandlordResults => {
  const extraAcq = sumCostItems(i.custom?.acquisition, 0); // acquisition extras are treated as one-time only
  const extraOpexBase = sumCostItems(i.custom?.opex, 12); // annual model: monthly -> *12, annual -> as-is

  const loanAmount = i.purchase_price * (1 - i.down_payment_percent / 100);
  const cashInvested =
    i.purchase_price * (i.down_payment_percent / 100) + i.make_ready_costs + i.closing_costs_buy + extraAcq;

  const monthlyPI = pmt(loanAmount, i.interest_rate, i.amortization_years);
  const debtServiceAnnual = monthlyPI * 12;

  const clampPct = (v: number) => (Number.isFinite(v) ? v : 0);
  const rentGrowth = clampPct(i.rent_growth_percent) / 100;
  const expenseGrowth = clampPct(i.expense_growth_percent) / 100;

  const annualizeCustomOpex = (items: CostItem[] | undefined, year: number) => {
    const growthMult = Math.pow(1 + expenseGrowth, Math.max(0, year - 1));
    let sum = 0;
    for (const it of items ?? []) {
      if (!it || !Number.isFinite(it.amount)) continue;
      switch (it.cadence) {
        case 'MONTHLY':
          sum += it.amount * 12 * growthMult;
          break;
        case 'ANNUAL':
          sum += it.amount * growthMult;
          break;
        case 'ONE_TIME':
        default:
          if (year === 1) sum += it.amount;
          break;
      }
    }
    return sum;
  };

  // Year-1 gross (no growth) — used for the OpEx snapshot display panel.
  const year1GrossAnnual = (i.gross_monthly_rent + i.other_income) * 12;
  const year1Mgmt = percentOf(year1GrossAnnual, i.property_management_percent);
  const year1Maint = percentOf(year1GrossAnnual, i.maintenance_reserve_percent);
  const year1Capex = percentOf(year1GrossAnnual, i.capex_reserve_percent);

  const opexLinesBase = [
    { name: 'Management (% of Gross Rent)', value: year1Mgmt },
    { name: 'Property Taxes', value: i.property_taxes_annual },
    { name: 'Insurance', value: i.landlord_insurance_annual },
    { name: 'HOA', value: i.hoa_fees_monthly * 12 },
    { name: 'Maintenance Reserve (% of Gross Rent)', value: year1Maint },
    { name: 'CapEx Reserve (% of Gross Rent)', value: year1Capex },
    ...flattenCostItems(i.custom?.opex, 12),
  ].filter((x) => Number.isFinite(x.value) && x.value !== 0);

  const cashFlow: LandlordCashFlowRow[] = [];
  for (let year = 1; year <= 30; year++) {
    const growthMult = Math.pow(1 + rentGrowth, Math.max(0, year - 1));
    const grossAnnual = (i.gross_monthly_rent + i.other_income) * 12 * growthMult;
    const vacancyLoss = percentOf(grossAnnual, i.vacancy_rate);
    const effectiveGross = grossAnnual - vacancyLoss;

    const mgmt = percentOf(grossAnnual, i.property_management_percent);
    const maint = percentOf(grossAnnual, i.maintenance_reserve_percent);
    const capex = percentOf(grossAnnual, i.capex_reserve_percent);

    const expenseMult = Math.pow(1 + expenseGrowth, Math.max(0, year - 1));
    const taxes = i.property_taxes_annual * expenseMult;
    const insurance = i.landlord_insurance_annual * expenseMult;
    const hoa = i.hoa_fees_monthly * 12 * expenseMult;
    const extraOpex = annualizeCustomOpex(i.custom?.opex, year);
    const opexTotal = mgmt + taxes + insurance + hoa + maint + capex + extraOpex;

    const noiAnnual = effectiveGross - opexTotal;
    const debt = year <= i.amortization_years ? debtServiceAnnual : 0;
    const cashFlowAnnual = noiAnnual - debt;
    const cashOnCash = cashInvested > 0 ? cashFlowAnnual / cashInvested : 0;
    const dscr = debt > 0 ? noiAnnual / debt : Infinity;

    const propertyValue = i.purchase_price * Math.pow(1 + i.annual_appreciation / 100, year);
    const monthsPaid = year * 12;
    const balance = amortRemainingBalance(loanAmount, i.interest_rate, i.amortization_years, monthsPaid);
    const equity = propertyValue - balance;

    const row: LandlordCashFlowRow = {
      year,
      grossRevenue: grossAnnual,
      effectiveRevenue: effectiveGross,
      opex: opexTotal,
      noi: noiAnnual,
      debtService: debt,
      cashFlow: cashFlowAnnual,
      propertyValue,
      loanBalance: balance,
      equity,
      dscr,
      cashOnCash,
    };
    cashFlow.push(row);
  }

  const year1 = cashFlow[0];
  const capRate = i.purchase_price > 0 ? year1.noi / i.purchase_price : 0;

  const kpis: Kpi[] = [
    { label: 'NOI (Year 1)', value: year1.noi, format: 'currency' },
    { label: 'Cash Flow (Year 1)', value: year1.cashFlow, format: 'currency' },
    { label: 'Cash-on-Cash (Year 1)', value: year1.cashOnCash * 100, format: 'percent' },
    { label: 'Cap Rate', value: capRate * 100, format: 'percent' },
    { label: 'DSCR (Year 1)', value: Number.isFinite(year1.dscr) ? year1.dscr : 999, format: 'number', help: 'NOI / Annual Debt Service.' },
    { label: 'Mortgage P&I / Mo', value: monthlyPI, format: 'currency' },
  ];

  const breakdown = [
    { name: 'Management', value: percentOf((i.gross_monthly_rent + i.other_income) * 12, i.property_management_percent) },
    { name: 'Property Taxes', value: i.property_taxes_annual },
    { name: 'Insurance', value: i.landlord_insurance_annual },
    { name: 'HOA', value: i.hoa_fees_monthly * 12 },
    { name: 'Maintenance', value: percentOf((i.gross_monthly_rent + i.other_income) * 12, i.maintenance_reserve_percent) },
    { name: 'CapEx', value: percentOf((i.gross_monthly_rent + i.other_income) * 12, i.capex_reserve_percent) },
    ...(extraOpexBase ? [{ name: 'Other OpEx', value: extraOpexBase }] : []),
  ];

  return {
    strategy: 'LANDLORD',
    kpis,
    breakdown,
    opexLines: opexLinesBase,
    cashFlow,
    totals: {
      monthlyPI,
      noiAnnual: year1.noi,
      cashFlowAnnual: year1.cashFlow,
      cashOnCash: year1.cashOnCash,
      capRate,
      dscr: year1.dscr,
      cashInvested,
      loanAmount,
    },
  };
};
