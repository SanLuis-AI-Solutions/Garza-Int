import { describe, expect, it } from 'vitest';
import { calculateLandlord } from '../landlord';
import { defaultLandlordInputs } from '../defaults';

describe('Landlord strategy', () => {
  it('higher vacancy reduces year-1 cash flow', () => {
    const base = defaultLandlordInputs();
    const r0 = calculateLandlord({ ...base, vacancy_rate: 5 });
    const r1 = calculateLandlord({ ...base, vacancy_rate: 15 });
    expect(r1.totals.cashFlowAnnual).toBeLessThan(r0.totals.cashFlowAnnual);
  });

  it('rent growth increases later-year cash flow vs no growth', () => {
    const base = defaultLandlordInputs();
    const noGrowth = calculateLandlord({ ...base, rent_growth_percent: 0 });
    const growth = calculateLandlord({ ...base, rent_growth_percent: 4 });
    const y10No = noGrowth.cashFlow[9].cashFlow;
    const y10Yes = growth.cashFlow[9].cashFlow;
    expect(y10Yes).toBeGreaterThan(y10No);
  });

  it('expense inflation reduces later-year cash flow vs no inflation', () => {
    const base = defaultLandlordInputs();
    const noInfl = calculateLandlord({ ...base, expense_growth_percent: 0 });
    const infl = calculateLandlord({ ...base, expense_growth_percent: 5 });
    const y10No = noInfl.cashFlow[9].cashFlow;
    const y10Yes = infl.cashFlow[9].cashFlow;
    expect(y10Yes).toBeLessThan(y10No);
  });
});

