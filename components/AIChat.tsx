import React, { useState, useRef, useEffect } from 'react';
import { hasGeminiKey } from '../services/geminiKey';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { chartTheme } from './charts/theme';

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [aiReady, setAiReady] = useState<boolean>(hasGeminiKey);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    {role: 'model', text: 'Hello! I am your AI Real Estate Assistant. Ask me about market trends, calculation help, or investment strategies.'}
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasGeminiKey) return;
    const aistudio = (window as any).aistudio;
    if (!aistudio?.hasSelectedApiKey) return;
    aistudio.hasSelectedApiKey().then((v: any) => setAiReady(Boolean(v))).catch(() => setAiReady(false));
  }, []);

  const hasAiStudio = typeof (window as any)?.aistudio?.openSelectKey === 'function';
  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (!aistudio?.openSelectKey) return;
    setLoading(true);
    try {
      await aistudio.openSelectKey();
      setAiReady(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!aiReady) {
      setMessages(prev => [...prev, { role: 'model', text: "AI isn't configured for this app yet. Ask the admin to set GEMINI_API_KEY in Vercel and redeploy." }]);
      return;
    }
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const { chatWithGemini } = await import('../services/geminiService');
      // Create history in correct format for SDK
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithGemini(userMsg, history);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInsight = async () => {
      // Uses flash-lite for a quick tip
      if (!aiReady) {
        setMessages(prev => [...prev, { role: 'model', text: "AI isn't configured for this app yet. Ask the admin to set GEMINI_API_KEY in Vercel and redeploy." }]);
        setIsOpen(true);
        return;
      }
      setLoading(true);
      try {
          const { quickAnalysis } = await import('../services/geminiService');
          const tip = await quickAnalysis("Give me one short, high-impact tip for real estate developers regarding ROI optimization.");
          setMessages(prev => [...prev, { role: 'model', text: `Quick Tip: ${tip}` }]);
          setIsOpen(true);
      } catch(e) { console.error(e) }
      setLoading(false);
  }

  return (
    <>
       {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-4 z-50">
        {!isOpen && aiReady && (
            <button 
                onClick={handleQuickInsight}
                className="p-3 rounded-full gi-btn gi-btn-secondary mb-2"
                title="Get a quick tip"
            >
                <Sparkles size={20} color={chartTheme.palette[1]} />
            </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 rounded-full gi-btn gi-btn-primary shadow-lg transition-transform hover:-translate-y-0.5"
        >
          {isOpen ? <X /> : <MessageCircle />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[min(92vw,24rem)] h-[min(70vh,520px)] gi-card flex flex-col z-50 overflow-hidden">
          <div className="p-4 text-white flex justify-between items-center border-b border-white/10 bg-black/10">
            <h3 className="font-semibold flex items-center gi-serif">
              <Sparkles className="w-4 h-4 mr-2" style={{ color: chartTheme.palette[1] }} />
              Assistant
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="gi-btn gi-btn-ghost gi-iconBtn"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/10">
            {!aiReady && (
              <div className="gi-card rounded-xl p-3 text-sm">
                <div className="font-semibold text-white/90">AI not configured</div>
                <div className="mt-1 gi-muted">
                  Ask the admin to set <span className="font-mono">GEMINI_API_KEY</span> in Vercel and redeploy.
                  {hasAiStudio ? ' Or select a paid project key in AI Studio.' : ''}
                </div>
                {hasAiStudio && (
                  <button
                    type="button"
                    onClick={handleSelectKey}
                    disabled={loading}
                    className="mt-2 inline-flex items-center justify-center gi-btn gi-btn-primary disabled:opacity-60 px-3 py-2 text-xs font-semibold"
                  >
                    Select Project Key
                  </button>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  m.role === 'user' 
                    ? 'bg-white/10 text-white rounded-tr-none border border-white/10' 
                    : 'bg-black/10 text-white/90 border border-white/10 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                 <div className="bg-black/10 p-3 rounded-lg border border-white/10">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: chartTheme.palette[0] }} />
                 </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-white/10 bg-black/10">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={aiReady ? "Ask anything…" : "AI not configured"}
                className="flex-1 gi-input px-3 py-2 text-sm"
                disabled={!aiReady}
              />
              <button 
                onClick={handleSend}
                disabled={!aiReady || loading || !input.trim()}
                aria-label="Send message"
                className="gi-btn gi-btn-primary gi-iconBtn disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;
