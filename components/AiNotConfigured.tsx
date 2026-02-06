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
    <div className="gi-card p-6">
      <h3 className="text-lg font-semibold gi-serif">{title}</h3>
      <p className="mt-2 text-sm gi-muted">{description}</p>

      {hasAiStudio && (
        <button
          type="button"
          onClick={handleSelectKey}
          disabled={opening}
          className="mt-4 inline-flex items-center justify-center gi-btn gi-btn-primary disabled:opacity-60 px-4 py-2.5 text-sm font-semibold"
        >
          {opening ? 'Opening…' : 'Select Project Key'}
        </button>
      )}
    </div>
  );
};

export default AiNotConfigured;
