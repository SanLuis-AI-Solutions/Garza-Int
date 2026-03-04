import type { InvestmentStrategy } from './domain/strategies/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type AccessEntitlement = {
  strategy: InvestmentStrategy;
  active: boolean;
  expiresAt: string | null;
};

export type AccessInfo = {
  allowedStrategies: InvestmentStrategy[];
  trialEndsAt: string | null;
  entitlements: AccessEntitlement[];
};

export enum AppTab {
  DASHBOARD = 'dashboard',
  ACCESS = 'access',
  INPUTS = 'inputs',
  SPREADSHEET = 'spreadsheet',
  VISUALIZER = 'visualizer',
  MARKET = 'market',
  ADMIN = 'admin',
  QA = 'qa',
  CHAT = 'chat'
}
