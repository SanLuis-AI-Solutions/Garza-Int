import { describe, expect, it } from 'vitest';
import { amortRemainingBalance, percentOf, pmt } from '../finance';

describe('percentOf', () => {
  it('calculates basic percentages', () => {
    expect(percentOf(200000, 7)).toBe(14000);
    expect(percentOf(100, 50)).toBe(50);
    expect(percentOf(0, 10)).toBe(0);
  });
});

describe('pmt (monthly payment)', () => {
  it('returns 0 for zero or negative principal', () => {
    expect(pmt(0, 6, 30)).toBe(0);
    expect(pmt(-100, 6, 30)).toBe(0);
  });

  it('handles 0% interest rate', () => {
    // $120,000 / (10 years * 12 months) = $1,000/mo
    expect(pmt(120000, 0, 10)).toBeCloseTo(1000, 2);
  });

  it('matches known mortgage calculator output for $337,500 at 6.75% over 30 years', () => {
    // Verified against bankrate.com mortgage calculator
    const monthly = pmt(337500, 6.75, 30);
    expect(monthly).toBeCloseTo(2188.58, 0);
  });

  it('matches known output for $200,000 at 5% over 15 years', () => {
    const monthly = pmt(200000, 5, 15);
    expect(monthly).toBeCloseTo(1581.59, 0);
  });
});

describe('amortRemainingBalance', () => {
  it('returns principal when 0 months paid', () => {
    expect(amortRemainingBalance(300000, 6, 30, 0)).toBe(300000);
  });

  it('returns 0 when fully paid off', () => {
    expect(amortRemainingBalance(300000, 6, 30, 360)).toBe(0);
  });

  it('returns 0 for zero principal', () => {
    expect(amortRemainingBalance(0, 6, 30, 12)).toBe(0);
  });

  it('handles 0% interest rate', () => {
    // Linear paydown: $300,000 - ($300,000 * 120/360) = $200,000
    expect(amortRemainingBalance(300000, 0, 30, 120)).toBeCloseTo(200000, 2);
  });

  it('balance decreases over time', () => {
    const b1 = amortRemainingBalance(300000, 6, 30, 60);
    const b2 = amortRemainingBalance(300000, 6, 30, 120);
    const b3 = amortRemainingBalance(300000, 6, 30, 240);
    expect(b2).toBeLessThan(b1);
    expect(b3).toBeLessThan(b2);
    expect(b3).toBeGreaterThan(0);
  });
});
