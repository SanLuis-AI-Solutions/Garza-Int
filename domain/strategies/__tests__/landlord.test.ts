import { describe, expect, it } from 'vitest';
import { calculateLandlord } from '../landlord';
import { defaultLandlordInputs } from '../defaults';
import { percentOf, pmt } from '../finance';

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

  it('produces exactly 30 years of cash flow', () => {
    const r = calculateLandlord(defaultLandlordInputs());
    expect(r.cashFlow).toHaveLength(30);
    expect(r.cashFlow[0].year).toBe(1);
    expect(r.cashFlow[29].year).toBe(30);
  });

  it('verifies Year 1 exact values against hand calculation', () => {
    const i = defaultLandlordInputs();
    const r = calculateLandlord(i);

    // Loan amount: $450,000 * (1 - 25%) = $337,500
    const loanAmount = 450000 * 0.75;
    expect(r.totals.loanAmount).toBeCloseTo(loanAmount, 2);

    // Cash invested: down payment + make_ready + closing
    const cashInvested = 450000 * 0.25 + 8000 + 9000; // 129500
    expect(r.totals.cashInvested).toBeCloseTo(cashInvested, 2);

    // Gross annual: $3,200 * 12 = $38,400
    const grossAnnual = 3200 * 12;
    expect(r.cashFlow[0].grossRevenue).toBeCloseTo(grossAnnual, 2);

    // Vacancy loss: $38,400 * 6% = $2,304
    const vacancyLoss = percentOf(grossAnnual, 6);
    const effectiveGross = grossAnnual - vacancyLoss;
    expect(r.cashFlow[0].effectiveRevenue).toBeCloseTo(effectiveGross, 2);

    // OpEx
    const mgmt = percentOf(grossAnnual, 9); // 3456
    const taxes = 4500;
    const insurance = 1600;
    const hoa = 0;
    const maint = percentOf(grossAnnual, 7); // 2688
    const capex = percentOf(grossAnnual, 6); // 2304
    const totalOpex = mgmt + taxes + insurance + hoa + maint + capex;
    expect(r.cashFlow[0].opex).toBeCloseTo(totalOpex, 2);

    // NOI = Effective Gross - OpEx
    const noi = effectiveGross - totalOpex;
    expect(r.cashFlow[0].noi).toBeCloseTo(noi, 2);
    expect(r.totals.noiAnnual).toBeCloseTo(noi, 2);

    // Cap Rate = NOI / Purchase Price
    const capRate = noi / 450000;
    expect(r.totals.capRate).toBeCloseTo(capRate, 6);

    // Monthly PI
    const monthlyPI = pmt(337500, 6.75, 30);
    expect(r.totals.monthlyPI).toBeCloseTo(monthlyPI, 2);

    // Cash Flow = NOI - Debt Service
    const debtService = monthlyPI * 12;
    const cashFlow = noi - debtService;
    expect(r.cashFlow[0].cashFlow).toBeCloseTo(cashFlow, 2);

    // Cash-on-Cash = Cash Flow / Cash Invested
    const coc = cashFlow / cashInvested;
    expect(r.cashFlow[0].cashOnCash).toBeCloseTo(coc, 6);
  });

  it('property value and equity grow over time with appreciation', () => {
    const i = defaultLandlordInputs();
    const r = calculateLandlord(i);

    // Year 1 property value: $450,000 * (1.03)^1
    const y1Value = 450000 * Math.pow(1.03, 1);
    expect(r.cashFlow[0].propertyValue).toBeCloseTo(y1Value, 2);

    // Year 10 property value: $450,000 * (1.03)^10
    const y10Value = 450000 * Math.pow(1.03, 10);
    expect(r.cashFlow[9].propertyValue).toBeCloseTo(y10Value, 2);

    // Equity should increase over time (appreciation + amortization)
    expect(r.cashFlow[9].equity).toBeGreaterThan(r.cashFlow[0].equity);
    expect(r.cashFlow[29].equity).toBeGreaterThan(r.cashFlow[9].equity);
  });

  it('DSCR is NOI / Debt Service', () => {
    const r = calculateLandlord(defaultLandlordInputs());
    const y1 = r.cashFlow[0];
    const expectedDscr = y1.noi / y1.debtService;
    expect(y1.dscr).toBeCloseTo(expectedDscr, 6);
  });
});
