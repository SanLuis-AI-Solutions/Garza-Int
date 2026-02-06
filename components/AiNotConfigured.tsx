import React, { useState } from 'react';

const AiNotConfigured: React.FC<{
  title?: string;
  description?: string;
  onConfigured?: () => void;
}> = ({
  title = 'AI features not configured',
  description = "To use these AI tools, the admin must set GEMINI_API_KEY in Vercel and redeploy. If you're running inside AI Studio, you can select a paid project key.",
  onConfigured,
}) => {
  const [opening, setOpening] = useState(false);
  const hasAiStudio = typeof (window as any)?.aistudio?.openSelectKey === 'function';

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (!aistudio?.openSelectKey) return;
    setOpening(true);
    try {
      await aistudio.openSelectKey();
      onConfigured?.();
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      {hasAiStudio && (
        <button
          type="button"
          onClick={handleSelectKey}
          disabled={opening}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-medium px-4 py-2.5 text-sm"
        >
          {opening ? 'Opening…' : 'Select Project Key'}
        </button>
      )}
    </div>
  );
};

export default AiNotConfigured;

