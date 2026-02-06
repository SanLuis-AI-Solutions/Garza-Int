import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, PenTool, Table, Image as ImageIcon, Globe, Key, LogOut, UserCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { ProjectData, CalculationResults, AppTab } from './types';
import { INITIAL_DATA } from './constants';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import Spreadsheet from './components/Spreadsheet';
import Visualizer from './components/Visualizer';
import MarketAnalysis from './components/MarketAnalysis';
import AIChat from './components/AIChat';
import AdminApprovals from './components/AdminApprovals';
import { supabase } from './services/supabaseClient';

type DashboardAppProps = {
  session: Session;
};

const ADMIN_EMAIL = 'contact@sanluisai.com';

const DashboardApp: React.FC<DashboardAppProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [data, setData] = useState<ProjectData>(INITIAL_DATA);
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const isAdmin = (session.user.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Check API Key Selection for Paid Features (Veo/High-Quality Image)
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setApiKeySelected(true);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  // Calculation Logic
  const results: CalculationResults = useMemo(() => {
    // 1. Total Land
    const landTotal = data.landCosts.purchasePrice + data.landCosts.taxes + data.landCosts.permits;

    // 2. Total Construction
    const customConstruction = data.constructionCosts.custom.reduce((sum, item) => sum + item.amount, 0);
    const constructionTotal =
      data.constructionCosts.materials +
      data.constructionCosts.labor +
      data.constructionCosts.contractorFees +
      data.constructionCosts.contingency +
      customConstruction;

    // 3. Total Investment (Total Project Cost)
    const totalInvestment = landTotal + constructionTotal;

    // 4. Debt Service (PMT formula)
    const r = data.financing.interestRate / 100 / 12;
    const n = data.financing.loanTermYears * 12;
    const monthlyPayment =
      data.financing.loanAmount > 0
        ? (data.financing.loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        : 0;
    const annualDebtService = monthlyPayment * 12;

    // 5. Cash Flow Loop (Extended to 30 Years for Spreadsheet)
    const cashFlow = [];

    // Inflation / Appreciation Assumptions
    const RENT_INFLATION = 0.02; // 2% annual rent increase
    const EXPENSE_INFLATION = 0.02; // 2% annual expense increase

    for (let year = 1; year <= 30; year++) {
      // Appreciation
      const propertyValue = data.revenue.estimatedResaleValue * Math.pow(1 + data.revenue.appreciationRate / 100, year);

      // Inflate Rent
      const monthlyRent = data.revenue.rentalIncomeMonthly * Math.pow(1 + RENT_INFLATION, year - 1);
      const grossRevenue = monthlyRent * 12;

      // Vacancy Loss
      const vacancyLoss = grossRevenue * (data.operatingExpenses.vacancyRate / 100);
      const effectiveRevenue = grossRevenue - vacancyLoss;

      // Expenses
      const customOpEx = data.operatingExpenses.custom.reduce((sum, item) => sum + item.amount, 0);
      const opExBase =
        data.operatingExpenses.propertyTaxesYearly +
        data.operatingExpenses.insuranceYearly +
        data.operatingExpenses.maintenanceYearly +
        customOpEx;

      // Inflate Expenses
      const opEx = opExBase * Math.pow(1 + EXPENSE_INFLATION, year - 1);

      const netOperatingIncome = effectiveRevenue - opEx;

      // Stop debt service if loan term is exceeded
      const currentDebtService = year <= data.financing.loanTermYears ? annualDebtService : 0;

      const netCashFlow = netOperatingIncome - currentDebtService;

      // Equity Calculation
      const pObs = year * 12;
      let remainingBalance = 0;
      if (data.financing.loanAmount > 0 && year <= data.financing.loanTermYears) {
        remainingBalance =
          (data.financing.loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, pObs))) / (Math.pow(1 + r, n) - 1);
      }

      const equity = propertyValue - remainingBalance;

      cashFlow.push({
        year,
        revenue: effectiveRevenue,
        expenses: opEx,
        debtService: currentDebtService,
        netCashFlow,
        equity,
      });
    }

    // 6. 5-Year Aggregates (Specific for Dashboard)
    const cashFlow5Y = cashFlow.slice(0, 5);
    const totalRevenue5Y = cashFlow5Y.reduce((s, c) => s + c.revenue, 0);
    const totalExpenses5Y = cashFlow5Y.reduce((s, c) => s + c.expenses + c.debtService, 0);
    const cumulativeNetCashFlow = cashFlow5Y.reduce((s, c) => s + c.netCashFlow, 0);

    // ROI Calculation (5 Year Horizon)
    const SELLING_COST_RATE = 0.06;

    const initialCash = totalInvestment - data.financing.loanAmount;

    // Year 5 Exit Scenario
    const year5Data = cashFlow[4];
    const grossEquity = year5Data.equity;
    const propertyValueY5 = data.revenue.estimatedResaleValue * Math.pow(1 + data.revenue.appreciationRate / 100, 5);
    const sellingCosts = propertyValueY5 * SELLING_COST_RATE;

    const realizableEquity = grossEquity - sellingCosts;

    const netProfit5Y = cumulativeNetCashFlow + realizableEquity - initialCash;

    const roi = initialCash > 0 ? (netProfit5Y / initialCash) * 100 : 0;

    return {
      totalInvestment,
      totalConstructionCost: constructionTotal,
      monthlyLoanPayment: monthlyPayment,
      totalRevenue5Years: totalRevenue5Y,
      totalOperatingExpenses5Years: totalExpenses5Y,
      netProfit5Years: netProfit5Y,
      roi5Years: roi,
      cashFlow,
    };
  }, [data]);

  const navItems = [
    { id: AppTab.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppTab.INPUTS, label: 'Edit Inputs', icon: PenTool },
    { id: AppTab.SPREADSHEET, label: 'Spreadsheet', icon: Table },
    { id: AppTab.VISUALIZER, label: 'Visualizer (AI)', icon: ImageIcon },
    { id: AppTab.MARKET, label: 'Market Data (AI)', icon: Globe },
    ...(isAdmin ? [{ id: AppTab.ADMIN, label: 'Approvals', icon: UserCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <img src="/garza-logo.png" alt="Garza International Properties" className="h-7 w-auto mb-3" />
          <h1 className="text-xl font-bold tracking-tight">Garza International</h1>
          <p className="text-xs text-slate-400 mt-1">Real Estate Intelligence</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="text-[11px] text-slate-400 mb-2 truncate" title={session.user.email ?? undefined}>
            Signed in as <span className="text-slate-200">{session.user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded text-white border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        {/* API Key Status / Selector */}
        {!apiKeySelected && (
          <div className="p-4 m-4 bg-slate-800 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-yellow-500 mb-2 flex items-center">
              <Key className="w-4 h-4 mr-1" /> API Key Required
            </h4>
            <p className="text-xs text-slate-400 mb-3">For AI Visualizer (Pro) features, you must select a paid project.</p>
            <button
              onClick={handleSelectKey}
              className="w-full bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-white border border-slate-600"
            >
              Select Project Key
            </button>
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              className="block text-center text-[10px] text-blue-400 mt-2 hover:underline"
            >
              Billing Info
            </a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2">
              <img src="/garza-logo.png" alt="Garza International Properties" className="h-5 w-auto" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{navItems.find((n) => n.id === activeTab)?.label}</h2>
          </div>
          <div className="text-sm text-slate-500">
            Project: <span className="font-semibold text-slate-900">{data.projectName}</span>
          </div>
        </header>

        <div className="p-8 pb-32">
          {activeTab === AppTab.DASHBOARD && <Dashboard results={results} />}
          {activeTab === AppTab.INPUTS && <InputForm data={data} onChange={setData} results={results} />}
          {activeTab === AppTab.SPREADSHEET && <Spreadsheet data={data} results={results} />}
          {activeTab === AppTab.VISUALIZER && <Visualizer />}
          {activeTab === AppTab.MARKET && <MarketAnalysis />}
          {activeTab === AppTab.ADMIN && isAdmin && <AdminApprovals adminEmail={ADMIN_EMAIL} />}
        </div>
      </main>

      <AIChat />
    </div>
  );
};

export default DashboardApp;
