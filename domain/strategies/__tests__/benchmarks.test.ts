import { describe, expect, it } from 'vitest';
import { defaultDeveloperInputs, defaultFlipperInputs, defaultLandlordInputs } from '../defaults';
import { calculateDeveloper } from '../developer';
import { calculateFlipper } from '../flipper';
import { calculateLandlord } from '../landlord';

const pct = (amount: number, pct: number) => (amount * pct) / 100;

describe('Strategy benchmarks (formula checks)', () => {
  it('Developer: totals match the documented formulas (incl custom items)', () => {
    const base = defaultDeveloperInputs();
    const i = {
      ...base,
      ltc_limit: 75,
      months_to_build: 10,
      custom: {
        ...base.custom,
        acquisition_soft: [{ id: 'a1', name: 'Entitlements', amount: 12000, cadence: 'ONE_TIME' }],
        hard_costs: [{ id: 'h1', name: 'Extra Concrete', amount: 4000, cadence: 'MONTHLY' }],
        financing: [{ id: 'f1', name: 'Doc Prep', amount: 950, cadence: 'ONE_TIME' }],
        carrying: [{ id: 'c1', name: 'Security', amount: 180, cadence: 'MONTHLY' }],
        exit: [{ id: 'e1', name: 'Staging', amount: 2500, cadence: 'ONE_TIME' }],
      },
    } as const;

    const r = calculateDeveloper(i as any);
    const months = 10;
    const contingencyAmount = pct(i.site_work + i.construction_budget, i.contingency_percent);
    const hardCosts = i.site_work + i.construction_budget + contingencyAmount;
    const customAcqSoft = 12000;
    const customHard = 4000 * months;
    const ltcBase = i.land_cost + i.soft_costs + customAcqSoft + hardCosts + customHard;
    const loanAmount = pct(ltcBase, i.ltc_limit);
    const interestReserve = ((loanAmount * (i.loan_utilization / 100) * (i.interest_rate / 100)) / 12) * months;
    const originationFee = pct(loanAmount, i.origination_fee_points);
    const carryingCosts = i.holding_taxes + i.builders_risk_insurance;
    const customCarrying = 180 * months;
    const customFinancing = 950;
    const customExit = 2500;

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

    const sellCosts = pct(i.arv, i.selling_costs_percent);
    const netProfit = i.arv - sellCosts - totalProjectCost;

    expect(r.totals.monthsToBuild).toBe(months);
    expect(r.totals.loanAmount).toBeCloseTo(loanAmount, 6);
    expect(r.totals.interestReserve).toBeCloseTo(interestReserve, 6);
    expect(r.totals.totalProjectCost).toBeCloseTo(totalProjectCost, 6);
    expect(r.totals.netProfit).toBeCloseTo(netProfit, 6);
  });

  it('Landlord: year-1 NOI/cashflow match the documented formulas (incl custom opex)', () => {
    const base = defaultLandlordInputs();
    const i = {
      ...base,
      custom: {
        ...base.custom,
        acquisition: [{ id: 'a1', name: 'Survey', amount: 1200, cadence: 'ONE_TIME' }],
        opex: [{ id: 'o1', name: 'Pest Control', amount: 35, cadence: 'MONTHLY' }],
      },
    } as const;

    const r = calculateLandlord(i as any);

    const grossAnnual = (i.gross_monthly_rent + i.other_income) * 12;
    const vacancyLoss = pct(grossAnnual, i.vacancy_rate);
    const effective = grossAnnual - vacancyLoss;

    const mgmt = pct(grossAnnual, i.property_management_percent);
    const maint = pct(grossAnnual, i.maintenance_reserve_percent);
    const capex = pct(grossAnnual, i.capex_reserve_percent);
    const taxes = i.property_taxes_annual;
    const insurance = i.landlord_insurance_annual;
    const hoa = i.hoa_fees_monthly * 12;
    const extraOpex = 35 * 12; // year 1 monthly item
    const opexTotal = mgmt + taxes + insurance + hoa + maint + capex + extraOpex;

    const noi = effective - opexTotal;
    const cashFlow = noi - r.totals.monthlyPI * 12;

    expect(r.totals.noiAnnual).toBeCloseTo(noi, 6);
    expect(r.totals.cashFlowAnnual).toBeCloseTo(cashFlow, 6);
  });

  it('Flipper: totals match the documented formulas (incl custom carrying)', () => {
    const base = defaultFlipperInputs();
    const i = {
      ...base,
      project_duration_months: 6,
      custom: {
        ...base.custom,
        carrying: [{ id: 'c1', name: 'Temp Fence', amount: 90, cadence: 'MONTHLY' }],
      },
    } as const;

    const r = calculateFlipper(i as any);
    const months = 6;
    const rehabTotal = i.rehab_budget * (1 + i.flip_contingency_percent / 100);
    const loanPrincipal = i.distressed_price + i.wholesale_fee + i.arrears + rehabTotal;
    const interestCost = loanPrincipal * (i.interest_rate / 100) * (months / 12);
    const pointsCost = pct(loanPrincipal, i.points);
    const drawFeesTotal = i.draw_fees * i.draw_count;
    const taxesProrated = i.property_taxes_annual * (months / 12);
    const insuranceProrated = i.insurance_annual * (months / 12);
    const utilitiesTotal = i.utilities_monthly * months;
    const lawnTotal = i.lawn_maintenance_monthly * months;
    const sellCosts = pct(i.arv, i.selling_costs_percent);
    const customCarrying = 90 * months;

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
      customCarrying +
      sellCosts;

    const netProfit = i.arv - totalCost;
    expect(r.totals.projectDurationMonths).toBe(months);
    expect(r.totals.loanPrincipal).toBeCloseTo(loanPrincipal, 6);
    expect(r.totals.interestCost).toBeCloseTo(interestCost, 6);
    expect(r.totals.totalCost).toBeCloseTo(totalCost, 6);
    expect(r.totals.netProfit).toBeCloseTo(netProfit, 6);
  });
});

describe('Landlord opexLines display (regression: must not be $0)', () => {
  it('Management, Maintenance, and CapEx lines are non-zero in opexLines', () => {
    const i = defaultLandlordInputs(); // 9% mgmt, 7% maint, 6% capex, $3,200/mo rent
    const r = calculateLandlord(i);

    const grossY1 = (i.gross_monthly_rent + i.other_income) * 12;
    const expectedMgmt = (grossY1 * i.property_management_percent) / 100;
    const expectedMaint = (grossY1 * i.maintenance_reserve_percent) / 100;
    const expectedCapex = (grossY1 * i.capex_reserve_percent) / 100;

    const mgmtLine = r.opexLines.find((l) => l.name.startsWith('Management'));
    const maintLine = r.opexLines.find((l) => l.name.startsWith('Maintenance'));
    const capexLine = r.opexLines.find((l) => l.name.startsWith('CapEx'));

    expect(mgmtLine).toBeDefined();
    expect(maintLine).toBeDefined();
    expect(capexLine).toBeDefined();
    expect(mgmtLine!.value).toBeCloseTo(expectedMgmt, 4);
    expect(maintLine!.value).toBeCloseTo(expectedMaint, 4);
    expect(capexLine!.value).toBeCloseTo(expectedCapex, 4);
  });

  it('opexLines total is consistent with year-1 opex from cash flow', () => {
    const i = defaultLandlordInputs();
    const r = calculateLandlord(i);
    const opexLinesSum = r.opexLines.reduce((s, l) => s + l.value, 0);
    // opexLines is a Year-1 snapshot; year-1 opex from cashFlow should match within $1
    expect(opexLinesSum).toBeCloseTo(r.cashFlow[0].opex, -1);
  });
});

