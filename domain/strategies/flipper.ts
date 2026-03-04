import type { FlipperInputs, FlipperResults, Kpi } from './types';
import { percentOf, sellingCosts } from './finance';
import { flattenCostItems, sumCostItems } from './costItems';

export const calculateFlipper = (i: FlipperInputs): FlipperResults => {
  const months = Math.max(1, i.project_duration_months);

  const customAcq = sumCostItems(i.custom?.acquisition, 0); // treat as one-time only
  const customRenov = sumCostItems(i.custom?.renovation, 0); // treat as one-time only
  const customFinancing = sumCostItems(i.custom?.financing, 0); // treat as one-time only
  const customCarrying = sumCostItems(i.custom?.carrying, months);
  const customExit = sumCostItems(i.custom?.exit, 0); // treat as one-time only

  const rehabTotal = i.rehab_budget * (1 + i.flip_contingency_percent / 100);
  const loanPrincipal = i.distressed_price + i.wholesale_fee + i.arrears + rehabTotal;

  const purchasePortion = i.distressed_price + i.wholesale_fee + i.arrears;
  const rehabUtilization = ((i.rehab_utilization_percent ?? 100) / 100);
  const interestOnPurchase = purchasePortion * (i.interest_rate / 100) * (months / 12);
  const interestOnRehab = rehabTotal * rehabUtilization * (i.interest_rate / 100) * (months / 12);
  const interestCost = interestOnPurchase + interestOnRehab;
  const pointsCost = percentOf(loanPrincipal, i.points);
  const drawFeesTotal = i.draw_fees * i.draw_count;

  const taxesProrated = i.property_taxes_annual * (months / 12);
  const insuranceProrated = i.insurance_annual * (months / 12);
  const utilitiesTotal = i.utilities_monthly * months;
  const lawnTotal = i.lawn_maintenance_monthly * months;
  const sellCosts = sellingCosts(i.arv, i.selling_costs_percent);

  const totalCost =
    i.distressed_price +
    i.wholesale_fee +
    i.arrears +
    customAcq +
    rehabTotal +
    customRenov +
    pointsCost +
    drawFeesTotal +
    interestCost +
    customFinancing +
    taxesProrated +
    insuranceProrated +
    utilitiesTotal +
    lawnTotal +
    customCarrying +
    sellCosts +
    customExit;

  const netProfit = i.arv - totalCost;
  const profitMargin = i.arv > 0 ? netProfit / i.arv : 0;

  const holdingBuckets = interestCost + taxesProrated + insuranceProrated + utilitiesTotal + lawnTotal + customCarrying;
  const days = months * 30.4375;
  const dailyHoldingCost = days > 0 ? holdingBuckets / days : 0;

  const mao = i.arv * 0.7 - rehabTotal;
  const cashInvested =
    i.distressed_price +
    i.wholesale_fee +
    i.arrears +
    customAcq +
    rehabTotal +
    customRenov +
    pointsCost +
    drawFeesTotal +
    customFinancing +
    customExit;
  const roi = cashInvested > 0 ? netProfit / cashInvested : 0;
  const annualizedRoi = roi * (12 / months);

  const kpis: Kpi[] = [
    { label: 'Net Profit', value: netProfit, format: 'currency' },
    { label: 'Profit Margin', value: profitMargin * 100, format: 'percent' },
    { label: 'MAO (70% Rule)', value: mao, format: 'currency' },
    { label: 'Daily Holding Cost', value: dailyHoldingCost, format: 'currency' },
    { label: 'Annualized ROI', value: annualizedRoi * 100, format: 'percent' },
    { label: 'Total Deal Cost', value: totalCost, format: 'currency' },
  ];

  const breakdown = [
    { name: 'Acquisition', value: i.distressed_price + i.wholesale_fee + i.arrears + customAcq },
    { name: 'Rehab (incl contingency)', value: rehabTotal + customRenov },
    { name: 'Financing (interest + points + draws)', value: interestCost + pointsCost + drawFeesTotal + customFinancing },
    { name: 'Carrying (tax/ins/util/lawn)', value: taxesProrated + insuranceProrated + utilitiesTotal + lawnTotal + customCarrying },
    { name: 'Selling Costs', value: sellCosts },
    ...(customExit ? [{ name: 'Other (Exit)', value: customExit }] : []),
  ];

  const costLines = [
    { name: 'Distressed Purchase Price', value: i.distressed_price },
    { name: 'Wholesale Fee', value: i.wholesale_fee },
    { name: 'Arrears (Taxes/Liens)', value: i.arrears },
    ...flattenCostItems(i.custom?.acquisition, 0),
    { name: 'Rehab Budget', value: i.rehab_budget },
    { name: 'Flip Contingency', value: rehabTotal - i.rehab_budget },
    ...flattenCostItems(i.custom?.renovation, 0),
    { name: 'Points', value: pointsCost },
    { name: 'Draw Fees', value: drawFeesTotal },
    { name: 'Interest', value: interestCost },
    ...flattenCostItems(i.custom?.financing, 0),
    { name: 'Property Taxes (prorated)', value: taxesProrated },
    { name: 'Insurance (prorated)', value: insuranceProrated },
    { name: 'Utilities', value: utilitiesTotal },
    { name: 'Lawn / Maintenance', value: lawnTotal },
    ...flattenCostItems(i.custom?.carrying, months),
    { name: 'Selling Costs', value: sellCosts },
    ...flattenCostItems(i.custom?.exit, 0),
  ].filter((x) => Number.isFinite(x.value) && x.value !== 0);

  const waterfall = [
    { name: 'ARV', value: i.arv },
    { name: 'Selling Costs', value: -sellCosts },
    { name: 'Acquisition', value: -(i.distressed_price + i.wholesale_fee + i.arrears + customAcq) },
    { name: 'Rehab', value: -(rehabTotal + customRenov) },
    { name: 'Financing', value: -(interestCost + pointsCost + drawFeesTotal + customFinancing) },
    { name: 'Carrying', value: -(taxesProrated + insuranceProrated + utilitiesTotal + lawnTotal + customCarrying) },
    ...(customExit ? [{ name: 'Other Exit', value: -customExit }] : []),
    { name: 'Net Profit', value: netProfit },
  ];

  return {
    strategy: 'FLIPPER',
    kpis,
    breakdown,
    costLines,
    waterfall,
    totals: {
      projectDurationMonths: months,
      loanPrincipal,
      rehabTotal,
      interestCost,
      dailyHoldingCost,
      mao,
      netProfit,
      profitMargin,
      annualizedRoi,
      cashInvested,
      totalCost,
    },
  };
};
