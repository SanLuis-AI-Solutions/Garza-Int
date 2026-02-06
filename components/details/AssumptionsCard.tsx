import React from 'react';

const AssumptionsCard: React.FC<{ title?: string; items: string[] }> = ({ title = 'Assumptions', items }) => {
  if (!items.length) return null;
  return (
    <div className="gi-card p-6">
      <h3 className="text-lg font-bold gi-serif">{title}</h3>
      <p className="mt-1 text-sm gi-muted">These assumptions drive the math so you can sanity-check the model.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((t, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
            <span className="text-white/90">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssumptionsCard;

