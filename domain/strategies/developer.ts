import type { DeveloperInputs, DeveloperResults, Kpi } from './types';
import { percentOf, sellingCosts } from './finance';
import { flattenCostItems, sumCostItems } from './costItems';

export const calculateDeveloper = (i: DeveloperInputs): DeveloperResults => {
  const months = Math.max(1, i.months_to_build);

  const customAcqSoft = sumCostItems(i.custom?.acquisition_soft, months);
  const customHard = sumCostItems(i.custom?.hard_costs, months);
  const customFinancing = sumCostItems(i.custom?.financing, months);
  const customCarrying = sumCostItems(i.custom?.carrying, months);
  const customExit = sumCostItems(i.custom?.exit, months);

  const contingencyAmount = percentOf(i.site_work + i.construction_budget, i.contingency_percent);
  const hardCosts = i.site_work + i.construction_budget + contingencyAmount;
  // Custom acquisition/soft + hard costs are included in LTC base (but custom carrying/financing/exit are not).
  const ltcBase = i.land_cost + i.soft_costs + customAcqSoft + hardCosts + customHard;
  const loanAmount = percentOf(ltcBase, i.ltc_limit);
  const interestReserve = ((loanAmount * (i.loan_utilization / 100) * (i.interest_rate / 100)) / 12) * months;
  const originationFee = percentOf(loanAmount, i.origination_fee_points);
  const carryingCosts = i.holding_taxes + i.builders_risk_insurance;
  const totalProjectCost =
    i.land_cost +
    i.soft_costs +
    customAcqSoft +
    hardCosts +
    customHard +
    carryingCosts +
    customCarrying +
    interestReserve +
    originationFee +
    customFinancing +
    customExit;

  const sellCosts = sellingCosts(i.arv, i.selling_costs_percent);
  const developerSpread = i.arv - totalProjectCost;
  const netProfit = i.arv - sellCosts - totalProjectCost;
  const profitMargin = i.arv > 0 ? netProfit / i.arv : 0;
  const roiOnTotalCost = totalProjectCost > 0 ? netProfit / totalProjectCost : 0;
  const annualizedRoiOnTotalCost = roiOnTotalCost * (12 / months);
  const equityRequired = Math.max(0, totalProjectCost - loanAmount);

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
    ...(customAcqSoft ? [{ name: 'Other (Acquisition/Soft)', value: customAcqSoft }] : []),
    { name: 'Site Work', value: i.site_work },
    { name: 'Construction', value: i.construction_budget },
    { name: 'Contingency', value: contingencyAmount },
    ...(customHard ? [{ name: 'Other (Hard Costs)', value: customHard }] : []),
    { name: 'Carrying', value: carryingCosts },
    ...(customCarrying ? [{ name: 'Other (Carrying)', value: customCarrying }] : []),
    { name: 'Interest Reserve', value: interestReserve },
    { name: 'Origination', value: originationFee },
    ...(customFinancing ? [{ name: 'Other (Financing)', value: customFinancing }] : []),
    ...(customExit ? [{ name: 'Other (Exit)', value: customExit }] : []),
  ];

  const costLines = [
    { name: 'Land', value: i.land_cost },
    { name: 'Soft Costs', value: i.soft_costs },
    ...flattenCostItems(i.custom?.acquisition_soft, months),
    { name: 'Site Work', value: i.site_work },
    { name: 'Construction', value: i.construction_budget },
    { name: 'Contingency', value: contingencyAmount },
    ...flattenCostItems(i.custom?.hard_costs, months),
    { name: 'Holding Taxes', value: i.holding_taxes },
    { name: "Builder's Risk Insurance", value: i.builders_risk_insurance },
    ...flattenCostItems(i.custom?.carrying, months),
    { name: 'Interest Reserve', value: interestReserve },
    { name: 'Origination Fee', value: originationFee },
    ...flattenCostItems(i.custom?.financing, months),
    ...flattenCostItems(i.custom?.exit, months),
  ].filter((x) => Number.isFinite(x.value) && x.value !== 0);

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
    costLines,
    waterfall,
    totals: {
      monthsToBuild: months,
      loanAmount,
      sellCosts,
      totalProjectCost,
      developerSpread,
      netProfit,
      profitMargin,
      interestReserve,
      roiOnTotalCost,
      annualizedRoiOnTotalCost,
      equityRequired,
    },
  };
};
