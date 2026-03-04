import { describe, expect, it } from 'vitest';
import { calculateDeveloper } from '../developer';
import { defaultDeveloperInputs } from '../defaults';
import { percentOf } from '../finance';

describe('Developer strategy', () => {
  it('higher LTC increases derived loan amount', () => {
    const base = defaultDeveloperInputs();
    const r0 = calculateDeveloper({ ...base, ltc_limit: 70 });
    const r1 = calculateDeveloper({ ...base, ltc_limit: 80 });
    expect(r1.totals.loanAmount).toBeGreaterThan(r0.totals.loanAmount);
  });

  it('adding hard costs increases total project cost and reduces spread', () => {
    const base = defaultDeveloperInputs();
    const r0 = calculateDeveloper(base);
    const r1 = calculateDeveloper({
      ...base,
      custom: { ...(base.custom ?? {}), hard_costs: [{ id: 'x', name: 'Extra', amount: 25000, cadence: 'ONE_TIME' }] },
    });
    expect(r1.totals.totalProjectCost).toBeGreaterThan(r0.totals.totalProjectCost);
    expect(r1.totals.developerSpread).toBeLessThan(r0.totals.developerSpread);
  });

  it('default inputs produce a positive net profit', () => {
    const r = calculateDeveloper(defaultDeveloperInputs());
    expect(r.totals.netProfit).toBeGreaterThan(0);
    expect(r.totals.profitMargin).toBeGreaterThan(0);
  });

  it('KPIs include ROI on Total Cost, Annualized ROI, and Equity Required', () => {
    const r = calculateDeveloper(defaultDeveloperInputs());
    const labels = r.kpis.map((k) => k.label);
    expect(labels).toContain('ROI on Total Cost');
    expect(labels).toContain('Annualized ROI');
    expect(labels).toContain('Equity Required');
  });

  it('verifies exact numerical output against hand-calculated values', () => {
    const i = defaultDeveloperInputs();
    const r = calculateDeveloper(i);
    const months = i.months_to_build;

    // Hand-calculate
    const contingencyAmount = percentOf(i.site_work + i.construction_budget, i.contingency_percent);
    expect(contingencyAmount).toBeCloseTo(22400, 2); // (40000+240000)*8% = 22400

    const hardCosts = i.site_work + i.construction_budget + contingencyAmount;
    expect(hardCosts).toBeCloseTo(302400, 2);

    const ltcBase = i.land_cost + i.soft_costs + hardCosts; // no custom items
    expect(ltcBase).toBeCloseTo(587400, 2);

    const loanAmount = percentOf(ltcBase, i.ltc_limit);
    expect(r.totals.loanAmount).toBeCloseTo(loanAmount, 2);

    const interestReserve = ((loanAmount * (i.loan_utilization / 100) * (i.interest_rate / 100)) / 12) * months;
    expect(r.totals.interestReserve).toBeCloseTo(interestReserve, 2);

    const originationFee = percentOf(loanAmount, i.origination_fee_points);
    const carryingCosts = i.holding_taxes + i.builders_risk_insurance;
    const totalProjectCost = i.land_cost + i.soft_costs + hardCosts + carryingCosts + interestReserve + originationFee;
    expect(r.totals.totalProjectCost).toBeCloseTo(totalProjectCost, 2);

    const sellCosts = percentOf(i.arv, i.selling_costs_percent);
    const netProfit = i.arv - sellCosts - totalProjectCost;
    expect(r.totals.netProfit).toBeCloseTo(netProfit, 2);

    const equityRequired = Math.max(0, totalProjectCost - loanAmount);
    expect(r.totals.equityRequired).toBeCloseTo(equityRequired, 2);
  });
});
