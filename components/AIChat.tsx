import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini, hasGeminiKey, quickAnalysis } from '../services/geminiService';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';

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
          const tip = await quickAnalysis("Give me one short, high-impact tip for real estate developers regarding ROI optimization.");
          setMessages(prev => [...prev, { role: 'model', text: `💡 **Quick Tip:** ${tip}` }]);
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
                className="bg-white text-indigo-600 p-3 rounded-full shadow-lg hover:bg-indigo-50 transition-colors border border-indigo-100 mb-2"
                title="Get a quick tip"
            >
                <Sparkles size={20} />
            </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          {isOpen ? <X /> : <MessageCircle />}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
            <h3 className="font-semibold flex items-center"><Sparkles className="w-4 h-4 mr-2"/> Gemini Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded"><X size={16}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {!aiReady && (
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">AI not configured</div>
                <div className="mt-1 text-slate-600">
                  Ask the admin to set <span className="font-mono">GEMINI_API_KEY</span> in Vercel and redeploy.
                  {hasAiStudio ? ' Or select a paid project key in AI Studio.' : ''}
                </div>
                {hasAiStudio && (
                  <button
                    type="button"
                    onClick={handleSelectKey}
                    disabled={loading}
                    className="mt-2 inline-flex items-center justify-center rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-medium px-3 py-2 text-xs"
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
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                 </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={aiReady ? "Ask anything..." : "AI not configured"}
                className="flex-1 border-slate-200 rounded-md border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!aiReady}
              />
              <button 
                onClick={handleSend}
                disabled={!aiReady || loading || !input.trim()}
                className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
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
