import React from 'react';
import type { StrategyResults } from '../../domain/strategies/types';
import LandlordSpreadsheet from './LandlordSpreadsheet';
import DeveloperDetail from './DeveloperDetail';
import FlipperDetail from './FlipperDetail';

const DetailRouter: React.FC<{ results: StrategyResults }> = ({ results }) => {
  switch (results.strategy) {
    case 'LANDLORD':
      return <LandlordSpreadsheet results={results as any} />;
    case 'DEVELOPER':
      return <DeveloperDetail results={results as any} />;
    case 'FLIPPER':
      return <FlipperDetail results={results as any} />;
    default:
      return null;
  }
};

export default DetailRouter;

