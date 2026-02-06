import type { CostItem } from './types';

export const sumCostItems = (items: CostItem[] | undefined, months: number) => {
  if (!items || items.length === 0) return 0;
  const m = Math.max(0, months);
  return items.reduce((sum, it) => {
    const amt = Number.isFinite(it.amount) ? it.amount : 0;
    if (m === 0) return sum + amt;
    switch (it.cadence) {
      case 'ONE_TIME':
        return sum + amt;
      case 'MONTHLY':
        return sum + amt * m;
      case 'ANNUAL':
        return sum + amt * (m / 12);
      default:
        return sum + amt;
    }
  }, 0);
};

export const flattenCostItems = (items: CostItem[] | undefined, months: number) => {
  if (!items || items.length === 0) return [];
  const m = Math.max(0, months);
  return items
    .filter((it) => it && typeof it.name === 'string')
    .map((it) => {
      const amt = Number.isFinite(it.amount) ? it.amount : 0;
      const value =
        m === 0 ? amt : it.cadence === 'MONTHLY' ? amt * m : it.cadence === 'ANNUAL' ? amt * (m / 12) : amt;
      return { name: it.name.trim() || 'Other', value };
    })
    .filter((x) => Number.isFinite(x.value) && x.value !== 0);
};
