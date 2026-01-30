import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PenTool, Table, Image as ImageIcon, Globe, Key } from 'lucide-react';
import { ProjectData, CalculationResults, AppTab } from './types';
import { INITIAL_DATA } from './constants';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import Spreadsheet from './components/Spreadsheet';
import Visualizer from './components/Visualizer';
import MarketAnalysis from './components/MarketAnalysis';
import AIChat from './components/AIChat';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [data, setData] = useState<ProjectData>(INITIAL_DATA);
  const [apiKeySelected, setApiKeySelected] = useState(false);

  // Check API Key Selection for Paid Features (Veo/High-Quality Image)
  useEffect(() => {
    const checkKey = async () => {
      // Use type assertion to avoid conflict with existing global types
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

  // Calculation Logic
  const results: CalculationResults = useMemo(() => {
    // 1. Total Land
    const landTotal = data.landCosts.purchasePrice + data.landCosts.taxes + data.landCosts.permits;
    
    // 2. Total Construction
    const customConstruction = data.constructionCosts.custom.reduce((sum, item) => sum + item.amount, 0);
    const constructionTotal = data.constructionCosts.materials + data.constructionCosts.labor + data.constructionCosts.contractorFees + data.constructionCosts.contingency + customConstruction;
    
    // 3. Total Investment (Total Project Cost)
    const totalInvestment = landTotal + constructionTotal;

    // 4. Debt Service (PMT formula)
    const r = data.financing.interestRate / 100 / 12;
    const n = data.financing.loanTermYears * 12;
    const monthlyPayment = data.financing.loanAmount > 0 
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
      const propertyValue = data.revenue.estimatedResaleValue * Math.pow(1 + (data.revenue.appreciationRate / 100), year);
      
      // Inflate Rent
      const monthlyRent = data.revenue.rentalIncomeMonthly * Math.pow(1 + RENT_INFLATION, year - 1);
      const grossRevenue = monthlyRent * 12;
      
      // Vacancy Loss
      const vacancyLoss = grossRevenue * (data.operatingExpenses.vacancyRate / 100);
      const effectiveRevenue = grossRevenue - vacancyLoss;

      // Expenses
      const customOpEx = data.operatingExpenses.custom.reduce((sum, item) => sum + item.amount, 0);
      let opExBase = data.operatingExpenses.propertyTaxesYearly + data.operatingExpenses.insuranceYearly + data.operatingExpenses.maintenanceYearly + customOpEx;
      
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
          remainingBalance = (data.financing.loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, pObs))) / (Math.pow(1 + r, n) - 1);
      }
        
      const equity = propertyValue - remainingBalance;

      cashFlow.push({
        year,
        revenue: effectiveRevenue,
        expenses: opEx,
        debtService: currentDebtService,
        netCashFlow,
        equity
      });
    }

    // 6. 5-Year Aggregates (Specific for Dashboard)
    const cashFlow5Y = cashFlow.slice(0, 5);
    const totalRevenue5Y = cashFlow5Y.reduce((s, c) => s + c.revenue, 0);
    const totalExpenses5Y = cashFlow5Y.reduce((s, c) => s + c.expenses + c.debtService, 0); 
    const cumulativeNetCashFlow = cashFlow5Y.reduce((s, c) => s + c.netCashFlow, 0);

    // ROI Calculation (5 Year Horizon)
    // REALISTIC APPROACH: We must account for selling costs (Agent fees ~6%)
    const SELLING_COST_RATE = 0.06;
    
    const initialCash = totalInvestment - data.financing.loanAmount;
    
    // Year 5 Exit Scenario
    const year5Data = cashFlow[4];
    const grossEquity = year5Data.equity;
    const propertyValueY5 = data.revenue.estimatedResaleValue * Math.pow(1 + (data.revenue.appreciationRate / 100), 5);
    const sellingCosts = propertyValueY5 * SELLING_COST_RATE;
    
    const realizableEquity = grossEquity - sellingCosts;
    
    // Total Return = Cash collected over 5 years + Net Proceeds from Sale
    // Net Profit = Total Return - Initial Cash
    const totalReturn = cumulativeNetCashFlow + realizableEquity; 
    const totalProfit = totalReturn; // Wait, total return is wealth generated. 
    // Usually Profit = (Wealth End - Wealth Start) + Cash Flow
    // Wealth End = Realizable Equity. Wealth Start = Initial Cash.
    // Total Profit = cumulativeNetCashFlow + (realizableEquity - initialCash);
    // Let's stick to "Total Gain": Cumulative Cash + Equity.
    // Net Profit implies Gain minus Cost.
    const netProfit5Y = cumulativeNetCashFlow + realizableEquity - initialCash;

    const roi = initialCash > 0 ? (netProfit5Y / initialCash) * 100 : 0;

    return {
      totalInvestment,
      totalConstructionCost: constructionTotal,
      monthlyLoanPayment: monthlyPayment,
      totalRevenue5Years: totalRevenue5Y,
      totalOperatingExpenses5Years: totalExpenses5Y,
      netProfit5Years: netProfit5Y, // This is now truly Net Profit (Gain)
      roi5Years: roi,
      cashFlow // Contains full 30 years now
    };
  }, [data]);

  const navItems = [
    { id: AppTab.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppTab.INPUTS, label: 'Edit Inputs', icon: PenTool },
    { id: AppTab.SPREADSHEET, label: 'Spreadsheet', icon: Table },
    { id: AppTab.VISUALIZER, label: 'Visualizer (AI)', icon: ImageIcon },
    { id: AppTab.MARKET, label: 'Market Data (AI)', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">Garza International</h1>
          <p className="text-xs text-slate-400 mt-1">Real Estate Intelligence</p>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* API Key Status / Selector */}
        {!apiKeySelected && (
          <div className="p-4 m-4 bg-slate-800 rounded-lg border border-slate-700">
             <h4 className="text-sm font-semibold text-yellow-500 mb-2 flex items-center">
                <Key className="w-4 h-4 mr-1"/> API Key Required
             </h4>
             <p className="text-xs text-slate-400 mb-3">
               For AI Visualizer (Pro) features, you must select a paid project.
             </p>
             <button 
                onClick={handleSelectKey}
                className="w-full bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-white border border-slate-600"
             >
               Select Project Key
             </button>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-center text-[10px] text-blue-400 mt-2 hover:underline">Billing Info</a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
         <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-2xl font-bold text-slate-800">{navItems.find(n => n.id === activeTab)?.label}</h2>
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
         </div>
      </main>

      <AIChat />
    </div>
  );
};

export default App;