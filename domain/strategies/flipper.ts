import type { FlipperInputs, FlipperResults, Kpi } from './types';
import { percentOf, sellingCosts } from './finance';

export const calculateFlipper = (i: FlipperInputs): FlipperResults => {
  const rehabTotal = i.rehab_budget * (1 + i.flip_contingency_percent / 100);
  const loanPrincipal = i.distressed_price + i.wholesale_fee + i.arrears + rehabTotal;

  const interestCost = loanPrincipal * (i.interest_rate / 100) * (i.project_duration_months / 12);
  const pointsCost = percentOf(loanPrincipal, i.points);
  const drawFeesTotal = i.draw_fees * i.draw_count;

  const taxesProrated = i.property_taxes_annual * (i.project_duration_months / 12);
  const insuranceProrated = i.insurance_annual * (i.project_duration_months / 12);
  const utilitiesTotal = i.utilities_monthly * i.project_duration_months;
  const lawnTotal = i.lawn_maintenance_monthly * i.project_duration_months;
  const sellCosts = sellingCosts(i.arv, i.selling_costs_percent);

  const totalCost =
    i.distressed_price +
    i.wholesale_fee +
    i.arrears +
    rehabTotal +
    pointsCost +
    drawFeesTotal +
    interestCost +
    taxesProrated +
    insuranceProrated +
    utilitiesTotal +
    lawnTotal +
    sellCosts;

  const netProfit = i.arv - totalCost;
  const profitMargin = i.arv > 0 ? netProfit / i.arv : 0;

  const holdingBuckets = interestCost + taxesProrated + insuranceProrated + utilitiesTotal + lawnTotal;
  const days = i.project_duration_months * 30.4375;
  const dailyHoldingCost = days > 0 ? holdingBuckets / days : 0;

  const mao = i.arv * 0.7 - rehabTotal;
  const cashInvested = i.distressed_price + i.wholesale_fee + i.arrears + rehabTotal + pointsCost + drawFeesTotal;
  const roi = cashInvested > 0 ? netProfit / cashInvested : 0;
  const annualizedRoi = roi * (12 / i.project_duration_months);

  const kpis: Kpi[] = [
    { label: 'Net Profit', value: netProfit, format: 'currency' },
    { label: 'Profit Margin', value: profitMargin * 100, format: 'percent' },
    { label: 'MAO (70% Rule)', value: mao, format: 'currency' },
    { label: 'Daily Holding Cost', value: dailyHoldingCost, format: 'currency' },
    { label: 'Annualized ROI', value: annualizedRoi * 100, format: 'percent' },
    { label: 'Total Deal Cost', value: totalCost, format: 'currency' },
  ];

  const breakdown = [
    { name: 'Acquisition', value: i.distressed_price + i.wholesale_fee + i.arrears },
    { name: 'Rehab (incl contingency)', value: rehabTotal },
    { name: 'Financing (interest + points + draws)', value: interestCost + pointsCost + drawFeesTotal },
    { name: 'Carrying (tax/ins/util/lawn)', value: taxesProrated + insuranceProrated + utilitiesTotal + lawnTotal },
    { name: 'Selling Costs', value: sellCosts },
  ];

  const waterfall = [
    { name: 'ARV', value: i.arv },
    { name: 'Selling Costs', value: -sellCosts },
    { name: 'Acquisition', value: -(i.distressed_price + i.wholesale_fee + i.arrears) },
    { name: 'Rehab', value: -rehabTotal },
    { name: 'Financing', value: -(interestCost + pointsCost + drawFeesTotal) },
    { name: 'Carrying', value: -(taxesProrated + insuranceProrated + utilitiesTotal + lawnTotal) },
    { name: 'Net Profit', value: netProfit },
  ];

  return {
    strategy: 'FLIPPER',
    kpis,
    breakdown,
    waterfall,
    totals: {
      projectDurationMonths: i.project_duration_months,
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
