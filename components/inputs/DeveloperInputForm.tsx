import React from 'react';
import type { DeveloperInputs } from '../../domain/strategies/types';
import { NumberField, SectionCard } from './Fields';

const DeveloperInputForm: React.FC<{
  inputs: DeveloperInputs;
  onChange: (next: DeveloperInputs) => void;
}> = ({ inputs, onChange }) => {
  const set = <K extends keyof DeveloperInputs>(key: K, value: DeveloperInputs[K]) => {
    onChange({ ...inputs, [key]: value });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionCard title="Acquisition & Soft Costs" subtitle="Land and entitlement / permitting costs.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Land Cost" prefix="$" value={inputs.land_cost} onChange={(v) => set('land_cost', v)} />
          <NumberField label="Soft Costs" prefix="$" value={inputs.soft_costs} onChange={(v) => set('soft_costs', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Hard Costs (Vertical)" subtitle="Site work + construction budget + contingency.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Site Work" prefix="$" value={inputs.site_work} onChange={(v) => set('site_work', v)} />
          <NumberField
            label="Construction Budget"
            prefix="$"
            value={inputs.construction_budget}
            onChange={(v) => set('construction_budget', v)}
          />
          <NumberField
            label="Contingency"
            suffix="%"
            value={inputs.contingency_percent}
            onChange={(v) => set('contingency_percent', v)}
            help="Default 5-10%"
          />
        </div>
      </SectionCard>

      <SectionCard title="Financing (Construction Loan)" subtitle="Interest-only draw note modeled by utilization %.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="LTC Limit" suffix="%" value={inputs.ltc_limit} onChange={(v) => set('ltc_limit', v)} />
          <NumberField label="Interest Rate" suffix="%" value={inputs.interest_rate} onChange={(v) => set('interest_rate', v)} />
          <NumberField
            label="Loan Utilization"
            suffix="%"
            value={inputs.loan_utilization}
            onChange={(v) => set('loan_utilization', v)}
            help="Avg % drawn over the term (55-60%)"
          />
          <NumberField
            label="Origination Fee"
            suffix="pts"
            value={inputs.origination_fee_points}
            onChange={(v) => set('origination_fee_points', v)}
            help="Points paid upfront"
          />
        </div>
      </SectionCard>

      <SectionCard title="Carrying + Timeline" subtitle="Time-based costs during the build.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            label="Months to Build"
            value={inputs.months_to_build}
            onChange={(v) => set('months_to_build', Math.max(1, Math.round(v)))}
            suffix="mo"
          />
          <NumberField
            label="Holding Taxes"
            prefix="$"
            value={inputs.holding_taxes}
            onChange={(v) => set('holding_taxes', v)}
          />
          <NumberField
            label="Builder's Risk Insurance"
            prefix="$"
            value={inputs.builders_risk_insurance}
            onChange={(v) => set('builders_risk_insurance', v)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Exit" subtitle="Sale assumptions.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="ARV (Sales Price)" prefix="$" value={inputs.arv} onChange={(v) => set('arv', v)} />
          <NumberField
            label="Selling Costs"
            suffix="%"
            value={inputs.selling_costs_percent}
            onChange={(v) => set('selling_costs_percent', v)}
            help="Realtor commissions + closing (6-8%)"
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default DeveloperInputForm;

