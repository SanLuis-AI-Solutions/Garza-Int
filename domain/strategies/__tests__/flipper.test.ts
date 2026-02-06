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
});

