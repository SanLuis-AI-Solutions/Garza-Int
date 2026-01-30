import React from 'react';
import { CalculationResults } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Wallet, Home, AlertCircle } from 'lucide-react';

interface DashboardProps {
  results: CalculationResults;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ results }) => {
  const kpiCards = [
    { 
        title: 'Total Investment', 
        subtitle: 'Land + Construction',
        value: results.totalInvestment, 
        icon: Wallet, 
        color: 'text-blue-600', 
        bg: 'bg-blue-100' 
    },
    { 
        title: 'Total Profit (5 Yr)', 
        subtitle: 'Cash Flow + Realized Equity',
        value: results.netProfit5Years, 
        icon: DollarSign, 
        color: results.netProfit5Years >= 0 ? 'text-green-600' : 'text-red-600', 
        bg: results.netProfit5Years >= 0 ? 'bg-green-100' : 'bg-red-100' 
    },
    { 
        title: 'ROI (5 Yr)', 
        subtitle: 'Annualized Return',
        value: `${results.roi5Years.toFixed(2)}%`, 
        icon: TrendingUp, 
        color: results.roi5Years >= 0 ? 'text-indigo-600' : 'text-red-600', 
        bg: 'bg-indigo-100', 
        isPercent: true 
    },
    { 
        title: 'Loan Payment/Mo', 
        subtitle: 'Principal + Interest',
        value: results.monthlyLoanPayment, 
        icon: Home, 
        color: 'text-orange-600', 
        bg: 'bg-orange-100' 
    },
  ];

  const cashFlowData = results.cashFlow.map(cf => ({
    year: `Year ${cf.year}`,
    revenue: cf.revenue,
    expenses: cf.expenses + cf.debtService,
    net: cf.netCashFlow
  }));

  const costBreakdownData = [
    { name: 'Construction', value: results.totalConstructionCost },
    { name: 'Investment Balance', value: Math.max(0, results.totalInvestment - results.totalConstructionCost) }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-0.5">{kpi.title}</p>
              <h3 className={`text-2xl font-bold ${kpi.color}`}>
                {kpi.isPercent ? kpi.value : `$${Number(kpi.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{kpi.subtitle}</p>
            </div>
            <div className={`p-3 rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow Projection (5 Years)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  contentStyle={{borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses + Debt" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net Cash Flow" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equity Growth */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Cumulative Equity Growth</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results.cashFlow}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']} />
                <Legend />
                <Line type="monotone" dataKey="equity" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;