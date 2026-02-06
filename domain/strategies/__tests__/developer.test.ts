import { describe, expect, it } from 'vitest';
import { calculateDeveloper } from '../developer';
import { defaultDeveloperInputs } from '../defaults';

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
});

