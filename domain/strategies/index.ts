import type { InvestmentStrategy, StrategyInputs, StrategyResults } from './types';
import { calculateDeveloper } from './developer';
import { calculateLandlord } from './landlord';
import { calculateFlipper } from './flipper';

export const calculateProject = (strategy: InvestmentStrategy, inputs: StrategyInputs): StrategyResults => {
  switch (strategy) {
    case 'DEVELOPER':
      return calculateDeveloper(inputs as any);
    case 'LANDLORD':
      return calculateLandlord(inputs as any);
    case 'FLIPPER':
      return calculateFlipper(inputs as any);
    default:
      // Exhaustive guard
      throw new Error(`Unsupported strategy: ${strategy}`);
  }
};

