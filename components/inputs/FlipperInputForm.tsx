import React from 'react';
import type { FlipperInputs } from '../../domain/strategies/types';
import { NumberField, SectionCard } from './Fields';

const FlipperInputForm: React.FC<{
  inputs: FlipperInputs;
  onChange: (next: FlipperInputs) => void;
}> = ({ inputs, onChange }) => {
  const set = <K extends keyof FlipperInputs>(key: K, value: FlipperInputs[K]) => {
    onChange({ ...inputs, [key]: value });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionCard title="Acquisition" subtitle="Purchase and acquisition-related fees.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="Distressed Purchase Price"
            prefix="$"
            value={inputs.distressed_price}
            onChange={(v) => set('distressed_price', v)}
          />
          <NumberField
            label="Wholesale Fee"
            prefix="$"
            value={inputs.wholesale_fee}
            onChange={(v) => set('wholesale_fee', v)}
          />
          <NumberField label="Arrears (Taxes/Liens)" prefix="$" value={inputs.arrears} onChange={(v) => set('arrears', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Renovation" subtitle="Rehab budget and buffer.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Rehab Budget" prefix="$" value={inputs.rehab_budget} onChange={(v) => set('rehab_budget', v)} />
          <NumberField
            label="Flip Contingency"
            suffix="%"
            value={inputs.flip_contingency_percent}
            onChange={(v) => set('flip_contingency_percent', v)}
            help="Default 10-15%"
          />
        </div>
      </SectionCard>

      <SectionCard title="Financing (Hard Money)" subtitle="Modeled as full balance interest over duration (simple).">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="Interest Rate" suffix="%" value={inputs.interest_rate} onChange={(v) => set('interest_rate', v)} />
          <NumberField label="Points" suffix="pts" value={inputs.points} onChange={(v) => set('points', v)} />
          <NumberField label="Draw Fee (per draw)" prefix="$" value={inputs.draw_fees} onChange={(v) => set('draw_fees', v)} />
          <NumberField label="Draw Count" value={inputs.draw_count} onChange={(v) => set('draw_count', Math.max(0, Math.round(v)))} />
        </div>
      </SectionCard>

      <SectionCard title="Carrying Costs (Time Sensitive)" subtitle="Holding costs while rehabbing.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            label="Project Duration"
            suffix="mo"
            value={inputs.project_duration_months}
            onChange={(v) => set('project_duration_months', Math.max(1, Math.round(v)))}
          />
          <NumberField label="Utilities (Monthly)" prefix="$" value={inputs.utilities_monthly} onChange={(v) => set('utilities_monthly', v)} />
          <NumberField
            label="Lawn / Maintenance (Monthly)"
            prefix="$"
            value={inputs.lawn_maintenance_monthly}
            onChange={(v) => set('lawn_maintenance_monthly', v)}
          />
          <NumberField label="Property Taxes (Annual)" prefix="$" value={inputs.property_taxes_annual} onChange={(v) => set('property_taxes_annual', v)} />
          <NumberField label="Insurance (Annual)" prefix="$" value={inputs.insurance_annual} onChange={(v) => set('insurance_annual', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Exit" subtitle="Sale assumptions.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="ARV (After Repair Value)" prefix="$" value={inputs.arv} onChange={(v) => set('arv', v)} />
          <NumberField
            label="Selling Costs"
            suffix="%"
            value={inputs.selling_costs_percent}
            onChange={(v) => set('selling_costs_percent', v)}
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default FlipperInputForm;

