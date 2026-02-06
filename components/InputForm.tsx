import React, { useState, useEffect } from 'react';
import { ProjectData, ExpenseItem, CalculationResults } from '../types';
import { estimateProjectDetails } from '../services/geminiService';
import { hasGeminiKey } from '../services/geminiKey';
import { Plus, Trash2, Wand2, ChevronDown, ChevronUp, Loader2, TrendingUp, Info, Save, FolderOpen } from 'lucide-react';

interface InputFormProps {
  data: ProjectData;
  onChange: (newData: ProjectData) => void;
  results: CalculationResults;
}

// Tooltip Component
const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-2 align-middle">
    <Info size={15} className="text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-center pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// Extracted components to avoid definition inside render and fix type issues
interface AccordionItemProps {
  id: string;
  title: string;
  children?: React.ReactNode;
  summary?: React.ReactNode;
  isActive: boolean;
  onToggle: (id: string) => void;
}

const AccordionItem = ({ 
  id, 
  title, 
  children, 
  summary,
  isActive,
  onToggle
}: AccordionItemProps) => (
  <div className={`border rounded-xl mb-4 overflow-hidden shadow-sm transition-all duration-200 ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md bg-white' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'}`}>
    <button 
      onClick={() => onToggle(id)}
      className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isActive ? 'bg-indigo-50/50 text-indigo-900' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
    >
      <div className="flex flex-col">
         <span className={`font-semibold text-lg tracking-tight ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>{title}</span>
      </div>
      <div className="flex items-center space-x-4">
         {summary && !isActive && <div className="text-sm text-slate-500 font-medium hidden sm:block bg-slate-100 px-3 py-1 rounded-full">{summary}</div>}
         {isActive ? <ChevronUp size={20} className="text-indigo-600"/> : <ChevronDown size={20} className="text-slate-400"/>}
      </div>
    </button>
    
    {isActive && (
      <div className="p-6 border-t border-indigo-100 bg-white animate-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    )}
  </div>
);

const InputField = ({ label, value, onChangeVal, tooltip }: { label: string, value: number, onChangeVal: (v: number) => void, tooltip?: string }) => (
  <div className="mb-5">
    <div className="flex items-center mb-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {tooltip && <Tooltip text={tooltip} />}
    </div>
    <div className="relative rounded-md shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <span className="text-slate-500 sm:text-sm font-semibold">$</span>
      </div>
      <input
        type="number"
        className="block w-full rounded-md border-slate-300 pl-7 py-2.5 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border transition-shadow hover:border-slate-400"
        value={value || ''}
        onChange={(e) => onChangeVal(parseFloat(e.target.value) || 0)}
        onWheel={(e) => e.currentTarget.blur()}
      />
    </div>
  </div>
);

const SliderField = ({ label, value, onChangeVal, min, max, step, unit = '%', tooltip }: { label: string, value: number, onChangeVal: (v: number) => void, min: number, max: number, step: number, unit?: string, tooltip?: string }) => (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-3">
       <div className="flex items-center">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          {tooltip && <Tooltip text={tooltip} />}
       </div>
       <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 min-w-[3rem] text-center">{value}{unit}</span>
    </div>
    <input 
       type="range" 
       min={min} 
       max={max} 
       step={step} 
       value={value} 
       onChange={(e) => onChangeVal(parseFloat(e.target.value))}
       className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-colors"
    />
    <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
    </div>
  </div>
);

const InputForm: React.FC<InputFormProps> = ({ data, onChange, results }) => {
  const [activeSection, setActiveSection] = useState<string | null>('land');
  const [isEstimating, setIsEstimating] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [aiReady, setAiReady] = useState<boolean>(hasGeminiKey);

  useEffect(() => {
    // Check if saved data exists on mount
    setHasSavedData(!!localStorage.getItem('propVision_project_data'));
  }, []);

  useEffect(() => {
    if (hasGeminiKey) return;
    const aistudio = (window as any).aistudio;
    if (!aistudio?.hasSelectedApiKey) return;
    aistudio.hasSelectedApiKey().then((v: any) => setAiReady(Boolean(v))).catch(() => setAiReady(false));
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleMagicFill = async () => {
    if (!aiReady) {
      alert("AI Auto-Estimate isn't configured yet. Ask the admin to set GEMINI_API_KEY in Vercel and redeploy.");
      return;
    }
    if (!data.projectName || data.projectName.length < 5) {
      alert("Please enter a descriptive Project Name first (e.g., '4-Unit Condo in Austin, TX')");
      return;
    }
    
    setIsEstimating(true);
    try {
      const estimates = await estimateProjectDetails(data.projectName);
      onChange({
        ...data,
        totalSqFt: estimates.totalSqFt || data.totalSqFt,
        landCosts: { ...data.landCosts, ...estimates.landCosts },
        constructionCosts: { ...data.constructionCosts, ...estimates.constructionCosts },
        financing: { ...data.financing, ...estimates.financing },
        revenue: { ...data.revenue, ...estimates.revenue },
        operatingExpenses: { ...data.operatingExpenses, ...estimates.operatingExpenses }
      });
      alert("Estimates applied! Please review and adjust values.");
    } catch (e) {
      console.error(e);
      alert("Failed to generate estimates. Please try again.");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('propVision_project_data', JSON.stringify(data));
      setHasSavedData(true);
      const btnText = document.getElementById('save-btn-text');
      if (btnText) {
        const original = btnText.innerText;
        btnText.innerText = 'Saved!';
        setTimeout(() => btnText.innerText = original, 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save project data.');
    }
  };

  const handleLoad = () => {
    try {
      const saved = localStorage.getItem('propVision_project_data');
      if (saved) {
        if (window.confirm('Load saved project? Current unsaved changes will be lost.')) {
          const parsedData = JSON.parse(saved);
          onChange(parsedData);
        }
      } else {
        alert('No saved project found.');
      }
    } catch (error) {
      console.error('Failed to load:', error);
      alert('Failed to load project data.');
    }
  };

  const updateField = (section: keyof ProjectData, field: string, value: number) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] as any),
        [field]: value
      }
    });
  };

  const updateCustomItem = (section: 'constructionCosts' | 'operatingExpenses', id: string, field: 'name' | 'amount', value: string | number) => {
    onChange({
      ...data,
      [section]: {
        ...data[section],
        custom: data[section].custom.map(item => item.id === id ? { ...item, [field]: value } : item)
      }
    });
  };

  const addCustomItem = (section: 'constructionCosts' | 'operatingExpenses') => {
    const newItem: ExpenseItem = { id: Date.now().toString(), name: 'New Item', amount: 0 };
    onChange({
      ...data,
      [section]: {
        ...data[section],
        custom: [...data[section].custom, newItem]
      }
    });
  };

  const removeCustomItem = (section: 'constructionCosts' | 'operatingExpenses', id: string) => {
    onChange({
      ...data,
      [section]: {
        ...data[section],
        custom: data[section].custom.filter(item => item.id !== id)
      }
    });
  };

  // Cost per Sq Ft Calculation
  const totalConstruction = data.constructionCosts.materials + 
                          data.constructionCosts.labor + 
                          data.constructionCosts.contractorFees + 
                          data.constructionCosts.contingency + 
                          data.constructionCosts.custom.reduce((acc, item) => acc + item.amount, 0);
  
  const costPerSqFt = data.totalSqFt > 0 ? (totalConstruction / data.totalSqFt).toFixed(2) : '0';

  return (
    <div className="max-w-4xl mx-auto relative">
      
      {/* Floating Live ROI Badge */}
      <div className={`fixed top-24 right-8 z-20 bg-white p-4 rounded-xl shadow-lg border-l-4 ${results.roi5Years >= 0 ? 'border-green-500' : 'border-red-500'} animate-in fade-in slide-in-from-right-4 duration-500 hidden xl:block`}>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Live ROI (5 Yr)</div>
          <div className={`text-3xl font-bold flex items-center ${results.roi5Years >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {results.roi5Years >= 0 ? <TrendingUp size={24} className="mr-2"/> : null}
              {results.roi5Years.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Net Profit: ${results.netProfit5Years.toLocaleString()}</div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-10 items-end bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Project Name & Description</label>
            <input
              type="text"
              className="w-full border-slate-300 rounded-lg border px-4 py-3 text-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
              value={data.projectName}
              onChange={(e) => onChange({ ...data, projectName: e.target.value })}
              placeholder="e.g. Modern 4-Unit Townhouse Development in East Austin"
            />
        </div>
        <div className="w-full md:w-40">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Total Sq Ft</label>
            <div className="relative">
                <input 
                    type="number"
                    value={data.totalSqFt}
                    onChange={(e) => onChange({...data, totalSqFt: parseFloat(e.target.value) || 0})}
                    className="w-full border-slate-300 rounded-lg border px-3 py-3 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <span className="absolute right-3 top-3.5 text-slate-400 text-sm font-medium">sq ft</span>
            </div>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[170px]">
            <button 
                onClick={handleMagicFill}
                disabled={!aiReady || isEstimating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg shadow-sm font-semibold flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed w-full"
                title={!aiReady ? "AI not configured. Admin must set GEMINI_API_KEY in Vercel." : undefined}
            >
                {isEstimating ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Wand2 className="w-5 h-5 mr-2" />}
                {isEstimating ? 'Estimating...' : 'Auto-Estimate'}
            </button>
            <div className="flex gap-2">
                 <button 
                    onClick={handleSave}
                    className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg font-medium flex items-center justify-center text-sm transition-colors"
                    title="Save to Browser Storage"
                 >
                    <Save size={16} className="mr-1.5 text-slate-500"/> <span id="save-btn-text">Save</span>
                 </button>
                 <button 
                    onClick={handleLoad}
                    disabled={!hasSavedData}
                    className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg font-medium flex items-center justify-center text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Load from Browser Storage"
                 >
                    <FolderOpen size={16} className="mr-1.5 text-slate-500"/> Load
                 </button>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Land Costs */}
        <AccordionItem 
            id="land" 
            title="Land Acquisition Costs" 
            isActive={activeSection === 'land'}
            onToggle={toggleSection}
            summary={<span className="font-medium text-slate-700">${(data.landCosts.purchasePrice + data.landCosts.taxes + data.landCosts.permits).toLocaleString()}</span>}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <InputField 
                    label="Purchase Price" 
                    value={data.landCosts.purchasePrice} 
                    onChangeVal={v => updateField('landCosts', 'purchasePrice', v)} 
                    tooltip="The total agreed-upon price for the land parcel."
                 />
                 <InputField 
                    label="Closing Costs & Taxes" 
                    value={data.landCosts.taxes} 
                    onChangeVal={v => updateField('landCosts', 'taxes', v)} 
                    tooltip="Transfer taxes, recording fees, and title insurance."
                 />
                 <InputField 
                    label="Soft Costs (Permits/Legal)" 
                    value={data.landCosts.permits} 
                    onChangeVal={v => updateField('landCosts', 'permits', v)} 
                    tooltip="Costs for entitlements, architectural designs, legal fees, and surveys."
                 />
            </div>
        </AccordionItem>

        {/* Construction Costs */}
        <AccordionItem 
            id="construction" 
            title="Construction & Hard Costs" 
            isActive={activeSection === 'construction'}
            onToggle={toggleSection}
            summary={
                <div className="flex gap-4">
                    <span className="font-medium text-slate-700">${totalConstruction.toLocaleString()} total</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 rounded-full text-xs py-0.5 self-center border border-indigo-100">${costPerSqFt}/sqft</span>
                </div>
            }
        >
            <div className="bg-indigo-50/70 p-4 rounded-lg mb-8 flex flex-col sm:flex-row justify-between items-center text-indigo-900 text-sm border border-indigo-100">
                 <span>Project Size: <strong>{data.totalSqFt.toLocaleString()} sq ft</strong></span>
                 <span className="font-bold text-lg mt-2 sm:mt-0">${costPerSqFt} <span className="text-xs font-normal opacity-70">/ sq ft avg</span></span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <InputField label="Materials" value={data.constructionCosts.materials} onChangeVal={v => updateField('constructionCosts', 'materials', v)} />
                <InputField label="Labor" value={data.constructionCosts.labor} onChangeVal={v => updateField('constructionCosts', 'labor', v)} />
                <InputField 
                    label="Contractor Fees" 
                    value={data.constructionCosts.contractorFees} 
                    onChangeVal={v => updateField('constructionCosts', 'contractorFees', v)} 
                    tooltip="General Contractor overhead and profit (typically 10-20% of hard costs)."
                />
                <InputField 
                    label="Contingency Reserve" 
                    value={data.constructionCosts.contingency} 
                    onChangeVal={v => updateField('constructionCosts', 'contingency', v)} 
                    tooltip="Budget set aside for unforeseen construction costs (typically 5-10%)."
                />
            </div>

            <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
                    Custom Line Items 
                    <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{data.constructionCosts.custom.length} items</span>
                </h4>
                {data.constructionCosts.custom.map(item => (
                    <div key={item.id} className="flex gap-3 mb-3 items-center group">
                        <input type="text" placeholder="Item Name" className="flex-1 text-sm border-slate-300 rounded-md border px-3 py-2.5 focus:border-indigo-500 focus:ring-indigo-500" value={item.name} onChange={e => updateCustomItem('constructionCosts', item.id, 'name', e.target.value)} />
                        <div className="w-32 relative">
                             <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                             <input type="number" className="w-full text-sm border-slate-300 rounded-md border pl-6 pr-3 py-2.5 focus:border-indigo-500 focus:ring-indigo-500" value={item.amount} onChange={e => updateCustomItem('constructionCosts', item.id, 'amount', parseFloat(e.target.value))} />
                        </div>
                        <button onClick={() => removeCustomItem('constructionCosts', item.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-slate-50 transition-colors"><Trash2 size={18}/></button>
                    </div>
                ))}
                <button onClick={() => addCustomItem('constructionCosts')} className="text-indigo-600 text-sm font-medium flex items-center mt-3 hover:bg-indigo-50 px-4 py-2 rounded-md transition-colors border border-dashed border-indigo-200 hover:border-indigo-300 w-full justify-center"><Plus size={16} className="mr-1.5"/> Add Line Item</button>
            </div>
        </AccordionItem>

        {/* Financing */}
        <AccordionItem 
            id="financing" 
            title="Financing & Loan" 
            isActive={activeSection === 'financing'}
            onToggle={toggleSection}
            summary={<span className="font-medium text-slate-700">{data.financing.interestRate}% Interest</span>}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                     <InputField label="Loan Principal" value={data.financing.loanAmount} onChangeVal={v => updateField('financing', 'loanAmount', v)} tooltip="The total amount borrowed from the lender." />
                     <div className="mt-5">
                        <div className="flex items-center mb-1.5">
                            <label className="block text-sm font-medium text-slate-700">Amortization Term</label>
                            <Tooltip text="The length of time over which the loan payments are spread." />
                        </div>
                        <select 
                            value={data.financing.loanTermYears} 
                            onChange={(e) => updateField('financing', 'loanTermYears', parseInt(e.target.value))}
                            className="block w-full rounded-md border-slate-300 border px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                        >
                            <option value={15}>15 Years</option>
                            <option value={20}>20 Years</option>
                            <option value={30}>30 Years</option>
                        </select>
                     </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <SliderField 
                        label="Annual Interest Rate" 
                        value={data.financing.interestRate} 
                        onChangeVal={v => updateField('financing', 'interestRate', v)} 
                        min={2} max={12} step={0.125} 
                        tooltip="The yearly interest rate charged on the loan."
                    />
                </div>
            </div>
        </AccordionItem>

        {/* Revenue */}
        <AccordionItem 
            id="revenue" 
            title="Projected Revenue & Growth"
            isActive={activeSection === 'revenue'}
            onToggle={toggleSection}
            summary={<span className="font-medium text-slate-700">${data.revenue.rentalIncomeMonthly.toLocaleString()}/mo Rent</span>}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div>
                    <InputField 
                        label="Projected Resale Value (Exit)" 
                        value={data.revenue.estimatedResaleValue} 
                        onChangeVal={v => updateField('revenue', 'estimatedResaleValue', v)} 
                        tooltip="The estimated market value of the property upon completion or sale."
                    />
                    <InputField 
                        label="Projected Monthly Rent" 
                        value={data.revenue.rentalIncomeMonthly} 
                        onChangeVal={v => updateField('revenue', 'rentalIncomeMonthly', v)} 
                        tooltip="Total expected monthly income from all units."
                    />
                 </div>
                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                     <SliderField 
                        label="Annual Appreciation Rate" 
                        value={data.revenue.appreciationRate} 
                        onChangeVal={v => updateField('revenue', 'appreciationRate', v)} 
                        min={-2} max={15} step={0.5} 
                        tooltip="The expected yearly percentage increase in the property's value."
                     />
                     <div className="bg-white p-3 rounded-lg border border-slate-200 mt-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            <TrendingUp size={12} className="inline mr-1 text-indigo-500"/>
                            <strong>Tip:</strong> Even a small change in appreciation can significantly impact long-term equity. Conservative estimates are recommended (2-4%).
                        </p>
                     </div>
                 </div>
            </div>
        </AccordionItem>

        {/* Operating Expenses */}
        <AccordionItem 
            id="opex" 
            title="Operating Expenses (Annual)"
            isActive={activeSection === 'opex'}
            onToggle={toggleSection}
            summary={<span className="font-medium text-slate-700">{data.operatingExpenses.vacancyRate}% Vacancy</span>}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                     <InputField label="Annual Property Taxes" value={data.operatingExpenses.propertyTaxesYearly} onChangeVal={v => updateField('operatingExpenses', 'propertyTaxesYearly', v)} />
                     <InputField label="Annual Insurance" value={data.operatingExpenses.insuranceYearly} onChangeVal={v => updateField('operatingExpenses', 'insuranceYearly', v)} />
                     <InputField 
                        label="Maintenance & CapEx" 
                        value={data.operatingExpenses.maintenanceYearly} 
                        onChangeVal={v => updateField('operatingExpenses', 'maintenanceYearly', v)} 
                        tooltip="Annual budget for repairs and capital expenditures (typically 1% of property value)."
                     />
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
                     <SliderField 
                        label="Vacancy & Credit Loss" 
                        value={data.operatingExpenses.vacancyRate} 
                        onChangeVal={v => updateField('operatingExpenses', 'vacancyRate', v)} 
                        min={0} max={25} step={1} 
                        tooltip="Percentage of potential gross income lost to vacancy or non-payment."
                     />
                </div>
            </div>
            
            <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Custom Expenses</h4>
                {data.operatingExpenses.custom.map(item => (
                    <div key={item.id} className="flex gap-3 mb-3 items-center group">
                        <input type="text" placeholder="Expense Name" className="flex-1 text-sm border-slate-300 rounded-md border px-3 py-2.5 focus:border-indigo-500 focus:ring-indigo-500" value={item.name} onChange={e => updateCustomItem('operatingExpenses', item.id, 'name', e.target.value)} />
                        <div className="w-32 relative">
                             <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                             <input type="number" className="w-full text-sm border-slate-300 rounded-md border pl-6 pr-3 py-2.5 focus:border-indigo-500 focus:ring-indigo-500" value={item.amount} onChange={e => updateCustomItem('operatingExpenses', item.id, 'amount', parseFloat(e.target.value))} />
                        </div>
                        <button onClick={() => removeCustomItem('operatingExpenses', item.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-slate-50 transition-colors"><Trash2 size={18}/></button>
                    </div>
                ))}
                <button onClick={() => addCustomItem('operatingExpenses')} className="text-indigo-600 text-sm font-medium flex items-center mt-3 hover:bg-indigo-50 px-4 py-2 rounded-md transition-colors border border-dashed border-indigo-200 hover:border-indigo-300 w-full justify-center"><Plus size={16} className="mr-1.5"/> Add Expense</button>
            </div>
        </AccordionItem>

      </div>
    </div>
  );
};

export default InputForm;
