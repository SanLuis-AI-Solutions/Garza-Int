import React from 'react';
import type { StrategyResults } from '../../domain/strategies/types';
import DeveloperDashboard from './DeveloperDashboard';
import LandlordDashboard from './LandlordDashboard';
import FlipperDashboard from './FlipperDashboard';

const DashboardRouter: React.FC<{ results: StrategyResults }> = ({ results }) => {
  switch (results.strategy) {
    case 'DEVELOPER':
      return <DeveloperDashboard results={results as any} />;
    case 'LANDLORD':
      return <LandlordDashboard results={results as any} />;
    case 'FLIPPER':
      return <FlipperDashboard results={results as any} />;
    default:
      return null;
  }
};

export default DashboardRouter;

