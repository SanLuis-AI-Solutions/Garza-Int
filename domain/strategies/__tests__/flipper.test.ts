import { describe, expect, it } from 'vitest';
import { calculateFlipper } from '../flipper';
import { defaultFlipperInputs } from '../defaults';

describe('Flipper strategy', () => {
  it('longer duration increases interest cost and lowers annualized ROI', () => {
    const base = defaultFlipperInputs();
    const short = calculateFlipper({ ...base, project_duration_months: 4 });
    const long = calculateFlipper({ ...base, project_duration_months: 10 });
    expect(long.totals.interestCost).toBeGreaterThan(short.totals.interestCost);
    expect(long.totals.annualizedRoi).toBeLessThan(short.totals.annualizedRoi);
  });

  it('increasing rehab budget lowers MAO (70% rule)', () => {
    const base = defaultFlipperInputs();
    const low = calculateFlipper({ ...base, rehab_budget: 50000, flip_contingency_percent: 10 });
    const high = calculateFlipper({ ...base, rehab_budget: 90000, flip_contingency_percent: 10 });
    expect(high.totals.mao).toBeLessThan(low.totals.mao);
  });

  it('50% utilization produces less interest than 100%', () => {
    const base = defaultFlipperInputs();
    const half = calculateFlipper({ ...base, rehab_utilization_percent: 50 });
    const full = calculateFlipper({ ...base, rehab_utilization_percent: 100 });
    expect(half.totals.interestCost).toBeLessThan(full.totals.interestCost);
  });

  it('100% utilization matches legacy (full principal) formula', () => {
    const base = defaultFlipperInputs();
    const r = calculateFlipper({ ...base, rehab_utilization_percent: 100 });
    const months = base.project_duration_months;
    const rehabTotal = base.rehab_budget * (1 + base.flip_contingency_percent / 100);
    const loanPrincipal = base.distressed_price + base.wholesale_fee + base.arrears + rehabTotal;
    const expectedInterest = loanPrincipal * (base.interest_rate / 100) * (months / 12);
    expect(r.totals.interestCost).toBeCloseTo(expectedInterest, 6);
  });

  it('verifies exact numerical output with default 50% utilization', () => {
    const base = defaultFlipperInputs();
    const r = calculateFlipper(base);
    const months = 6;
    const rehabTotal = 65000 * 1.12; // 72800
    const purchasePortion = 260000; // distressed_price only (wholesale=0, arrears=0)

    // Interest: purchase at 100%, rehab at 50%
    const interestOnPurchase = 260000 * 0.12 * (6 / 12); // 15600
    const interestOnRehab = 72800 * 0.50 * 0.12 * (6 / 12); // 2184
    const expectedInterest = 15600 + 2184; // 17784
    expect(r.totals.interestCost).toBeCloseTo(expectedInterest, 2);

    // MAO = ARV * 0.7 - rehabTotal
    const expectedMao = 420000 * 0.7 - 72800; // 221200
    expect(r.totals.mao).toBeCloseTo(expectedMao, 2);

    // Net profit should be positive with these defaults
    expect(r.totals.netProfit).toBeGreaterThan(0);
  });

  it('0% utilization means no interest on rehab portion', () => {
    const base = defaultFlipperInputs();
    const r = calculateFlipper({ ...base, rehab_utilization_percent: 0 });
    // Only purchase portion accrues interest
    const expectedInterest = 260000 * 0.12 * (6 / 12); // 15600
    expect(r.totals.interestCost).toBeCloseTo(expectedInterest, 2);
  });
});
