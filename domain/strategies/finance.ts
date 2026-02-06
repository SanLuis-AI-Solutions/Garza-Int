export const percentOf = (amount: number, pct: number) => (amount * pct) / 100;

export const sellingCosts = (arv: number, pct: number) => percentOf(arv, pct);

// Standard amortized payment (monthly).
export const pmt = (principal: number, annualRatePct: number, amortYears: number) => {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

// Remaining balance after `monthsPaid` payments on a standard amortized loan.
export const amortRemainingBalance = (
  principal: number,
  annualRatePct: number,
  amortYears: number,
  monthsPaid: number
) => {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = amortYears * 12;
  if (monthsPaid <= 0) return principal;
  if (monthsPaid >= n) return 0;
  if (r === 0) return principal * (1 - monthsPaid / n);
  return (principal * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsPaid))) / (Math.pow(1 + r, n) - 1);
};

