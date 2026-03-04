import React from 'react';
import type { CostItem, FlipperInputs } from '../../domain/strategies/types';
import { CostItemsEditor, NumberField, SectionCard } from './Fields';

const FlipperInputForm: React.FC<{
  inputs: FlipperInputs;
  onChange: (next: FlipperInputs) => void;
}> = ({ inputs, onChange }) => {
  const set = <K extends keyof FlipperInputs>(key: K, value: FlipperInputs[K]) => {
    onChange({ ...inputs, [key]: value });
  };

  const setCustom = (key: keyof NonNullable<FlipperInputs['custom']>, items: CostItem[]) => {
    onChange({
      ...inputs,
      custom: {
        ...(inputs.custom ?? {}),
        [key]: items,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="gi-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs gi-muted2 uppercase tracking-wider">Strategy Inputs</div>
            <h2 className="mt-1 text-xl font-bold gi-serif">Flipper: Fix & Flip</h2>
            <p className="mt-1 text-sm gi-muted">
              Model rehab, financing, and time-sensitive holding costs. Changes auto-save to your project.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="gi-pill gi-pill--ok text-xs">Auto-saved</span>
            <span className="gi-pill text-xs">USD</span>
          </div>
        </div>
      </div>

      <SectionCard title="Acquisition" subtitle="Purchase and acquisition-related fees.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <CostItemsEditor
          label="Additional acquisition items"
          help="Examples: buyer closing costs, title/escrow, inspections, permits to start work."
          items={inputs.custom?.acquisition}
          onChange={(next) => setCustom('acquisition', next)}
          cadenceMode="one_time_only"
        />
      </SectionCard>

      <SectionCard title="Renovation" subtitle="Rehab budget and buffer.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NumberField label="Rehab Budget" prefix="$" value={inputs.rehab_budget} onChange={(v) => set('rehab_budget', v)} />
          <NumberField
            label="Flip Contingency"
            suffix="%"
            value={inputs.flip_contingency_percent}
            onChange={(v) => set('flip_contingency_percent', v)}
            help="Default 10-15%"
          />
        </div>
        <CostItemsEditor
          label="Additional renovation items"
          help="Examples: dumpsters, design, staging prep, specialized trades not in rehab budget."
          items={inputs.custom?.renovation}
          onChange={(next) => setCustom('renovation', next)}
          cadenceMode="one_time_only"
        />
      </SectionCard>

      <SectionCard title="Financing (Hard Money)" subtitle="Purchase portion accrues interest from day 1; rehab portion uses average draw utilization.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NumberField label="Interest Rate" suffix="%" value={inputs.interest_rate} onChange={(v) => set('interest_rate', v)} />
          <NumberField label="Points" suffix="pts" value={inputs.points} onChange={(v) => set('points', v)} />
          <NumberField
            label="Rehab Draw Utilization"
            suffix="%"
            value={inputs.rehab_utilization_percent}
            onChange={(v) => set('rehab_utilization_percent', v)}
            help="Avg % of rehab funds drawn during the project. 50% = linear draw schedule, 100% = all funds at closing."
          />
          <NumberField label="Draw Fee (per draw)" prefix="$" value={inputs.draw_fees} onChange={(v) => set('draw_fees', v)} />
          <NumberField label="Draw Count" value={inputs.draw_count} onChange={(v) => set('draw_count', Math.max(0, Math.round(v)))} />
        </div>
        <CostItemsEditor
          label="Additional financing items"
          help="Use for lender fees not captured (points/draw fees/interest are already modeled)."
          items={inputs.custom?.financing}
          onChange={(next) => setCustom('financing', next)}
          cadenceMode="one_time_only"
        />
      </SectionCard>

      <SectionCard title="Carrying Costs (Time Sensitive)" subtitle="Holding costs while rehabbing.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <CostItemsEditor
          label="Additional carrying items"
          help="Examples: HOA, security, permits recurring, marketing while listed (if you want it here)."
          items={inputs.custom?.carrying}
          onChange={(next) => setCustom('carrying', next)}
          cadenceMode="all"
          monthsForProration={Math.max(1, inputs.project_duration_months)}
        />
      </SectionCard>

      <SectionCard title="Exit" subtitle="Sale assumptions.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NumberField label="ARV (After Repair Value)" prefix="$" value={inputs.arv} onChange={(v) => set('arv', v)} />
          <NumberField
            label="Selling Costs"
            suffix="%"
            value={inputs.selling_costs_percent}
            onChange={(v) => set('selling_costs_percent', v)}
          />
        </div>
        <CostItemsEditor
          label="Additional exit items"
          help="Examples: staging, concessions, repairs requested at inspection, seller-paid fees."
          items={inputs.custom?.exit}
          onChange={(next) => setCustom('exit', next)}
          cadenceMode="one_time_only"
        />
      </SectionCard>
    </div>
  );
};

export default FlipperInputForm;
