import type { DeveloperInputs, DeveloperResults, Kpi } from './types';
import { percentOf, sellingCosts } from './finance';

export const calculateDeveloper = (i: DeveloperInputs): DeveloperResults => {
  const contingencyAmount = percentOf(i.site_work + i.construction_budget, i.contingency_percent);
  const hardCosts = i.site_work + i.construction_budget + contingencyAmount;
  const ltcBase = i.land_cost + i.soft_costs + hardCosts;
  const loanAmount = percentOf(ltcBase, i.ltc_limit);
  const interestReserve = ((loanAmount * (i.loan_utilization / 100) * (i.interest_rate / 100)) / 12) * i.months_to_build;
  const originationFee = percentOf(loanAmount, i.origination_fee_points);
  const carryingCosts = i.holding_taxes + i.builders_risk_insurance;
  const totalProjectCost = i.land_cost + i.soft_costs + hardCosts + carryingCosts + interestReserve + originationFee;

  const sellCosts = sellingCosts(i.arv, i.selling_costs_percent);
  const developerSpread = i.arv - totalProjectCost;
  const netProfit = i.arv - sellCosts - totalProjectCost;
  const profitMargin = i.arv > 0 ? netProfit / i.arv : 0;
  const roiOnTotalCost = totalProjectCost > 0 ? netProfit / totalProjectCost : 0;
  const annualizedRoiOnTotalCost = roiOnTotalCost * (12 / Math.max(1, i.months_to_build));

  const kpis: Kpi[] = [
    { label: 'Total Project Cost', value: totalProjectCost, format: 'currency' },
    { label: 'Construction Loan (LTC)', value: loanAmount, format: 'currency', help: 'Derived from LTC% on Land + Soft + Hard (incl contingency).' },
    { label: 'Interest Reserve', value: interestReserve, format: 'currency', help: 'Avg drawn funds * rate * months.' },
    { label: 'Developer Spread', value: developerSpread, format: 'currency', help: 'ARV - Total Project Cost (pre-selling).' },
    { label: 'Net Profit', value: netProfit, format: 'currency', help: 'ARV - Selling Costs - Total Project Cost.' },
    { label: 'Profit Margin', value: profitMargin * 100, format: 'percent' },
  ];

  const breakdown = [
    { name: 'Land', value: i.land_cost },
    { name: 'Soft Costs', value: i.soft_costs },
    { name: 'Site Work', value: i.site_work },
    { name: 'Construction', value: i.construction_budget },
    { name: 'Contingency', value: contingencyAmount },
    { name: 'Carrying', value: carryingCosts },
    { name: 'Interest Reserve', value: interestReserve },
    { name: 'Origination', value: originationFee },
  ];

  const waterfall = [
    { name: 'ARV', value: i.arv },
    { name: 'Selling Costs', value: -sellCosts },
    { name: 'Total Project Cost', value: -totalProjectCost },
    { name: 'Net Profit', value: netProfit },
  ];

  return {
    strategy: 'DEVELOPER',
    kpis,
    breakdown,
    waterfall,
    totals: {
      monthsToBuild: i.months_to_build,
      loanAmount,
      sellCosts,
      totalProjectCost,
      developerSpread,
      netProfit,
      profitMargin,
      interestReserve,
      roiOnTotalCost,
      annualizedRoiOnTotalCost,
    },
  };
};
