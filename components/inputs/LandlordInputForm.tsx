import React from 'react';
import type { LandlordInputs } from '../../domain/strategies/types';
import { NumberField, SectionCard } from './Fields';

const LandlordInputForm: React.FC<{
  inputs: LandlordInputs;
  onChange: (next: LandlordInputs) => void;
}> = ({ inputs, onChange }) => {
  const set = <K extends keyof LandlordInputs>(key: K, value: LandlordInputs[K]) => {
    onChange({ ...inputs, [key]: value });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionCard title="Acquisition" subtitle="Upfront purchase costs.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Purchase Price" prefix="$" value={inputs.purchase_price} onChange={(v) => set('purchase_price', v)} />
          <NumberField label="Make Ready Costs" prefix="$" value={inputs.make_ready_costs} onChange={(v) => set('make_ready_costs', v)} />
          <NumberField label="Closing Costs (Buy)" prefix="$" value={inputs.closing_costs_buy} onChange={(v) => set('closing_costs_buy', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Financing (Mortgage)" subtitle="Amortized (30yr fixed) modeled with standard PMT.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="Down Payment"
            suffix="%"
            value={inputs.down_payment_percent}
            onChange={(v) => set('down_payment_percent', v)}
            help="Default 20-25%"
          />
          <NumberField label="Interest Rate" suffix="%" value={inputs.interest_rate} onChange={(v) => set('interest_rate', v)} />
          <NumberField
            label="Amortization"
            suffix="yrs"
            value={inputs.amortization_years}
            onChange={(v) => set('amortization_years', Math.max(1, Math.round(v)))}
          />
        </div>
      </SectionCard>

      <SectionCard title="Revenue" subtitle="Market rent and other income.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="Gross Monthly Rent" prefix="$" value={inputs.gross_monthly_rent} onChange={(v) => set('gross_monthly_rent', v)} />
          <NumberField label="Other Income (Monthly)" prefix="$" value={inputs.other_income} onChange={(v) => set('other_income', v)} />
          <NumberField
            label="Vacancy Rate"
            suffix="%"
            value={inputs.vacancy_rate}
            onChange={(v) => set('vacancy_rate', v)}
            help="Default 5-8%"
          />
          <NumberField
            label="Annual Appreciation"
            suffix="%"
            value={inputs.annual_appreciation}
            onChange={(v) => set('annual_appreciation', v)}
            help="Default 3%"
          />
        </div>
      </SectionCard>

      <SectionCard title="Operating Expenses (OpEx)" subtitle="Annual fixed costs + % reserves.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="Property Management"
            suffix="%"
            value={inputs.property_management_percent}
            onChange={(v) => set('property_management_percent', v)}
            help="Default 8-10% of gross rent"
          />
          <NumberField label="Property Taxes (Annual)" prefix="$" value={inputs.property_taxes_annual} onChange={(v) => set('property_taxes_annual', v)} />
          <NumberField label="Landlord Insurance (Annual)" prefix="$" value={inputs.landlord_insurance_annual} onChange={(v) => set('landlord_insurance_annual', v)} />
          <NumberField label="HOA Fees (Monthly)" prefix="$" value={inputs.hoa_fees_monthly} onChange={(v) => set('hoa_fees_monthly', v)} />
          <NumberField
            label="Maintenance Reserve"
            suffix="%"
            value={inputs.maintenance_reserve_percent}
            onChange={(v) => set('maintenance_reserve_percent', v)}
            help="5-10% of gross rent"
          />
          <NumberField
            label="CapEx Reserve"
            suffix="%"
            value={inputs.capex_reserve_percent}
            onChange={(v) => set('capex_reserve_percent', v)}
            help="Big items (roof/HVAC)"
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default LandlordInputForm;

