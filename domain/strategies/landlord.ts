import type { Kpi, LandlordCashFlowRow, LandlordInputs, LandlordResults } from './types';
import { amortRemainingBalance, percentOf, pmt } from './finance';

export const calculateLandlord = (i: LandlordInputs): LandlordResults => {
  const loanAmount = i.purchase_price * (1 - i.down_payment_percent / 100);
  const cashInvested = i.purchase_price * (i.down_payment_percent / 100) + i.make_ready_costs + i.closing_costs_buy;

  const monthlyPI = pmt(loanAmount, i.interest_rate, i.amortization_years);
  const debtServiceAnnual = monthlyPI * 12;

  const grossAnnual = (i.gross_monthly_rent + i.other_income) * 12;
  const vacancyLoss = percentOf(grossAnnual, i.vacancy_rate);
  const effectiveGross = grossAnnual - vacancyLoss;

  const mgmt = percentOf(grossAnnual, i.property_management_percent);
  const hoa = i.hoa_fees_monthly * 12;
  const maint = percentOf(grossAnnual, i.maintenance_reserve_percent);
  const capex = percentOf(grossAnnual, i.capex_reserve_percent);
  const opexTotal =
    mgmt + i.property_taxes_annual + i.landlord_insurance_annual + hoa + maint + capex;

  const noiAnnual = effectiveGross - opexTotal;
  const cashFlowAnnual = noiAnnual - debtServiceAnnual;

  const capRate = i.purchase_price > 0 ? noiAnnual / i.purchase_price : 0;
  const cashOnCash = cashInvested > 0 ? cashFlowAnnual / cashInvested : 0;
  const dscr = debtServiceAnnual > 0 ? noiAnnual / debtServiceAnnual : Infinity;

  const breakdown = [
    { name: 'Management', value: mgmt },
    { name: 'Property Taxes', value: i.property_taxes_annual },
    { name: 'Insurance', value: i.landlord_insurance_annual },
    { name: 'HOA', value: hoa },
    { name: 'Maintenance', value: maint },
    { name: 'CapEx', value: capex },
  ];

  const cashFlow: LandlordCashFlowRow[] = [];
  for (let year = 1; year <= 30; year++) {
    const propertyValue = i.purchase_price * Math.pow(1 + i.annual_appreciation / 100, year);
    const monthsPaid = year * 12;
    const balance = amortRemainingBalance(loanAmount, i.interest_rate, i.amortization_years, monthsPaid);
    const equity = propertyValue - balance;

    // Keep the revenue/opex flat for now (no rent inflation inputs in the spec),
    // but the structure supports adding it later.
    const row: LandlordCashFlowRow = {
      year,
      grossRevenue: grossAnnual,
      effectiveRevenue: effectiveGross,
      opex: opexTotal,
      noi: noiAnnual,
      debtService: year <= i.amortization_years ? debtServiceAnnual : 0,
      cashFlow: year <= i.amortization_years ? cashFlowAnnual : noiAnnual,
      propertyValue,
      loanBalance: balance,
      equity,
      dscr,
      cashOnCash,
    };
    cashFlow.push(row);
  }

  const kpis: Kpi[] = [
    { label: 'NOI (Annual)', value: noiAnnual, format: 'currency' },
    { label: 'Cash Flow (Annual)', value: cashFlowAnnual, format: 'currency' },
    { label: 'Cash-on-Cash', value: cashOnCash * 100, format: 'percent' },
    { label: 'Cap Rate', value: capRate * 100, format: 'percent' },
    { label: 'DSCR', value: Number.isFinite(dscr) ? dscr : 999, format: 'number', help: 'NOI / Annual Debt Service.' },
    { label: 'Mortgage P&I / Mo', value: monthlyPI, format: 'currency' },
  ];

  return {
    strategy: 'LANDLORD',
    kpis,
    breakdown,
    cashFlow,
    totals: {
      monthlyPI,
      noiAnnual,
      cashFlowAnnual,
      cashOnCash,
      capRate,
      dscr,
      cashInvested,
      loanAmount,
    },
  };
};

