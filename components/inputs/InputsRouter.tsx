import React from 'react';
import type { InvestmentStrategy, StrategyInputs } from '../../domain/strategies/types';
import DeveloperInputForm from './DeveloperInputForm';
import LandlordInputForm from './LandlordInputForm';
import FlipperInputForm from './FlipperInputForm';

const InputsRouter: React.FC<{
  strategy: InvestmentStrategy;
  inputs: StrategyInputs;
  onChange: (next: StrategyInputs) => void;
}> = ({ strategy, inputs, onChange }) => {
  switch (strategy) {
    case 'DEVELOPER':
      return <DeveloperInputForm inputs={inputs as any} onChange={onChange as any} />;
    case 'LANDLORD':
      return <LandlordInputForm inputs={inputs as any} onChange={onChange as any} />;
    case 'FLIPPER':
      return <FlipperInputForm inputs={inputs as any} onChange={onChange as any} />;
    default:
      return null;
  }
};

export default InputsRouter;

